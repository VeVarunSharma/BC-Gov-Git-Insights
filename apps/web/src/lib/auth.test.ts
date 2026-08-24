import { describe, expect, it, vi } from "vitest";

import { authorizeHeaders } from "./auth";

function headerForTenant(tenantId: string): Headers {
  const expiration = Math.floor(Date.now() / 1_000) + 3_600;
  const principal = {
    auth_typ: "aad",
    name_typ: "name",
    role_typ: "roles",
    claims: [
      { typ: "tid", val: tenantId },
      { typ: "oid", val: "user-object-id" },
      { typ: "name", val: "Test user" },
      {
        typ: "iss",
        val: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      },
      { typ: "aud", val: "client-id" },
      { typ: "exp", val: String(expiration) },
      { typ: "roles", val: "viewer" },
    ],
  };
  return new Headers({
    "x-ms-client-principal": Buffer.from(JSON.stringify(principal)).toString(
      "base64",
    ),
  });
}

describe("authorizeHeaders", () => {
  it("accepts an allowlisted tenant", () => {
    process.env.ALLOWED_TENANT_IDS = "72f988bf-86f1-41af-91ab-2d7cd011db47";
    process.env.ENTRA_CLIENT_ID = "client-id";

    expect(
      authorizeHeaders(headerForTenant("72f988bf-86f1-41af-91ab-2d7cd011db47"))
        ?.roles,
    ).toContain("viewer");
  });

  it("rejects a non-allowlisted tenant", () => {
    process.env.ALLOWED_TENANT_IDS = "72f988bf-86f1-41af-91ab-2d7cd011db47";
    process.env.ENTRA_CLIENT_ID = "client-id";

    expect(() =>
      authorizeHeaders(headerForTenant("00000000-0000-0000-0000-000000000000")),
    ).toThrow("tenant is not allowed");
  });

  it("fails closed in production when platform authentication is disabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EASY_AUTH_ENABLED", "false");
    vi.stubEnv("PUBLIC_DASHBOARD", "");
    try {
      expect(
        authorizeHeaders(
          headerForTenant("72f988bf-86f1-41af-91ab-2d7cd011db47"),
        ),
      ).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("serves an anonymous viewer in production when the dashboard is public", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EASY_AUTH_ENABLED", "false");
    vi.stubEnv("PUBLIC_DASHBOARD", "true");
    try {
      const principal = authorizeHeaders(new Headers());
      expect(principal?.objectId).toBe("public-dashboard");
      expect(principal?.roles).toContain("viewer");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("ignores a malformed principal header when the dashboard is public", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_DASHBOARD", "true");
    try {
      const headers = new Headers({ "x-ms-client-principal": "not-base64!!" });
      expect(authorizeHeaders(headers)?.objectId).toBe("public-dashboard");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("treats any value other than true as not public", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EASY_AUTH_ENABLED", "false");
    vi.stubEnv("PUBLIC_DASHBOARD", "1");
    try {
      expect(authorizeHeaders(new Headers())).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
