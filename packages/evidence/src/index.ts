import { createHash } from "node:crypto";

import {
  DefaultAzureCredential,
  ManagedIdentityCredential,
  type TokenCredential,
} from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

export interface StoredArtifact {
  container: string;
  path: string;
  sha256: string;
  bytes: number;
  etag: string;
}

export interface EvidenceWriter {
  writeJson(
    container: string,
    path: string,
    value: unknown,
  ): Promise<StoredArtifact>;
  writeCurrentJson(
    container: string,
    path: string,
    value: unknown,
  ): Promise<StoredArtifact>;
}

export interface EvidenceReader {
  readJson(container: string, path: string): Promise<unknown>;
}

export interface EvidenceStore extends EvidenceWriter, EvidenceReader {}

function validateSegment(value: string, label: string): void {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("..") ||
    value.includes("\\")
  ) {
    throw new Error(`${label} contains an unsafe storage path.`);
  }
}

function errorStatusCode(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return null;
}

function pointerTimestamp(value: unknown): number {
  if (!value || typeof value !== "object") {
    throw new Error("Current pointer value must be an object.");
  }
  const record = value as Record<string, unknown>;
  const timestamp = ["generatedAt", "selectedAt", "completedAt"]
    .map((key) => record[key])
    .find((candidate): candidate is string => typeof candidate === "string");
  const parsed = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error(
      "Current pointer value requires generatedAt, selectedAt, or completedAt.",
    );
  }
  return parsed;
}

export function getAzureCredential(): TokenCredential {
  if (process.env.NODE_ENV === "production") {
    const clientId = process.env.AZURE_CLIENT_ID;
    if (!clientId) {
      throw new Error(
        "AZURE_CLIENT_ID is required for production managed identity.",
      );
    }
    return new ManagedIdentityCredential({ clientId });
  }
  return new DefaultAzureCredential();
}

export class AzureBlobEvidenceWriter implements EvidenceStore {
  private readonly client: BlobServiceClient;

  constructor(
    accountName: string,
    credential: TokenCredential = getAzureCredential(),
  ) {
    if (!/^[a-z0-9]{3,24}$/.test(accountName)) {
      throw new Error("Azure Storage account name is invalid.");
    }
    this.client = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential,
      {
        uploadContentChecksumAlgorithm: "StorageCrc64",
        downloadContentChecksumAlgorithm: "StorageCrc64",
      },
    );
  }

  async writeJson(
    container: string,
    path: string,
    value: unknown,
  ): Promise<StoredArtifact> {
    validateSegment(container, "Container");
    validateSegment(path, "Blob path");

    const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
    const sha256 = createHash("sha256").update(body).digest("hex");
    const blob = this.client
      .getContainerClient(container)
      .getBlockBlobClient(path);
    const response = await blob.uploadData(body, {
      blobHTTPHeaders: {
        blobContentType: "application/json",
      },
      metadata: {
        sha256,
      },
      conditions: {
        ifNoneMatch: "*",
      },
    });

    if (!response.etag) {
      throw new Error(`Azure Storage did not return an ETag for ${path}.`);
    }

    return {
      container,
      path,
      sha256,
      bytes: body.byteLength,
      etag: response.etag,
    };
  }

  async writeCurrentJson(
    container: string,
    path: string,
    value: unknown,
  ): Promise<StoredArtifact> {
    validateSegment(container, "Container");
    validateSegment(path, "Blob path");

    const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
    const sha256 = createHash("sha256").update(body).digest("hex");
    const blob = this.client
      .getContainerClient(container)
      .getBlockBlobClient(path);
    const incomingTimestamp = pointerTimestamp(value);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const properties = await blob.getProperties();
        if (!properties.etag) {
          throw new Error(`Azure Storage returned no ETag for ${path}.`);
        }
        const existingBody = await blob.downloadToBuffer();
        const existingValue = JSON.parse(
          existingBody.toString("utf8"),
        ) as unknown;
        if (incomingTimestamp <= pointerTimestamp(existingValue)) {
          return {
            container,
            path,
            sha256: createHash("sha256").update(existingBody).digest("hex"),
            bytes: existingBody.byteLength,
            etag: properties.etag,
          };
        }
        const response = await blob.uploadData(body, {
          blobHTTPHeaders: {
            blobContentType: "application/json",
            blobCacheControl: "no-store",
          },
          metadata: { sha256 },
          conditions: { ifMatch: properties.etag },
        });
        if (!response.etag) {
          throw new Error(`Azure Storage did not return an ETag for ${path}.`);
        }
        return {
          container,
          path,
          sha256,
          bytes: body.byteLength,
          etag: response.etag,
        };
      } catch (error: unknown) {
        const statusCode = errorStatusCode(error);
        if (statusCode === 404) {
          try {
            const response = await blob.uploadData(body, {
              blobHTTPHeaders: {
                blobContentType: "application/json",
                blobCacheControl: "no-store",
              },
              metadata: { sha256 },
              conditions: { ifNoneMatch: "*" },
            });
            if (!response.etag) {
              throw new Error(
                `Azure Storage did not return an ETag for ${path}.`,
              );
            }
            return {
              container,
              path,
              sha256,
              bytes: body.byteLength,
              etag: response.etag,
            };
          } catch (createError: unknown) {
            if (![409, 412].includes(errorStatusCode(createError) ?? 0)) {
              throw createError;
            }
          }
        } else if (![409, 412].includes(statusCode ?? 0)) {
          throw error;
        }
      }
    }

    throw new Error(`Current pointer update conflicted repeatedly: ${path}`);
  }

  async readJson(container: string, path: string): Promise<unknown> {
    validateSegment(container, "Container");
    validateSegment(path, "Blob path");
    const buffer = await this.client
      .getContainerClient(container)
      .getBlobClient(path)
      .downloadToBuffer();
    return JSON.parse(buffer.toString("utf8")) as unknown;
  }
}

export class MemoryEvidenceWriter implements EvidenceStore {
  readonly artifacts = new Map<string, Buffer>();

  async writeJson(
    container: string,
    path: string,
    value: unknown,
  ): Promise<StoredArtifact> {
    validateSegment(container, "Container");
    validateSegment(path, "Blob path");
    const key = `${container}/${path}`;
    if (this.artifacts.has(key)) {
      throw new Error(`Artifact already exists: ${key}`);
    }
    const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
    const sha256 = createHash("sha256").update(body).digest("hex");
    this.artifacts.set(key, body);
    return {
      container,
      path,
      sha256,
      bytes: body.byteLength,
      etag: `"${sha256}"`,
    };
  }

  async writeCurrentJson(
    container: string,
    path: string,
    value: unknown,
  ): Promise<StoredArtifact> {
    validateSegment(container, "Container");
    validateSegment(path, "Blob path");
    const key = `${container}/${path}`;
    const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
    const sha256 = createHash("sha256").update(body).digest("hex");
    const existing = this.artifacts.get(key);
    if (existing) {
      const existingValue = JSON.parse(existing.toString("utf8")) as unknown;
      if (pointerTimestamp(value) <= pointerTimestamp(existingValue)) {
        return {
          container,
          path,
          sha256: createHash("sha256").update(existing).digest("hex"),
          bytes: existing.byteLength,
          etag: `"${createHash("sha256").update(existing).digest("hex")}"`,
        };
      }
    }
    this.artifacts.set(key, body);
    return {
      container,
      path,
      sha256,
      bytes: body.byteLength,
      etag: `"${sha256}"`,
    };
  }

  async readJson(container: string, path: string): Promise<unknown> {
    validateSegment(container, "Container");
    validateSegment(path, "Blob path");
    const body = this.artifacts.get(`${container}/${path}`);
    if (!body) {
      throw new Error(`Artifact not found: ${container}/${path}`);
    }
    return JSON.parse(body.toString("utf8")) as unknown;
  }
}
