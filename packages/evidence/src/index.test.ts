import { describe, expect, it } from "vitest";

import { MemoryEvidenceWriter } from "./index";

describe("MemoryEvidenceWriter", () => {
  it("stores immutable JSON artifacts with a checksum", async () => {
    const writer = new MemoryEvidenceWriter();
    const artifact = await writer.writeJson("raw", "scan/repositories.json", {
      count: 100,
    });

    expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    await expect(
      writer.writeJson("raw", "scan/repositories.json", { count: 101 }),
    ).rejects.toThrow("already exists");
  });

  it("rejects traversal paths", async () => {
    const writer = new MemoryEvidenceWriter();
    await expect(writer.writeJson("raw", "../secret.json", {})).rejects.toThrow(
      "unsafe",
    );
  });

  it("does not let an older run replace the current pointer", async () => {
    const writer = new MemoryEvidenceWriter();
    await writer.writeCurrentJson("manifests", "current/scan.json", {
      generatedAt: "2026-08-22T12:00:00.000Z",
      scanId: "new",
    });
    await writer.writeCurrentJson("manifests", "current/scan.json", {
      generatedAt: "2026-08-22T11:00:00.000Z",
      scanId: "old",
    });

    await expect(
      writer.readJson("manifests", "current/scan.json"),
    ).resolves.toMatchObject({ scanId: "new" });
  });
});
