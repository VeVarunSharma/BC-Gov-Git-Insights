import { describe, expect, it } from "vitest";

import { redactPotentialSecrets } from "./index";

describe("redactPotentialSecrets", () => {
  it("removes common assigned secret values", () => {
    const redacted = redactPotentialSecrets(
      'client_secret="super-secret"\napiKey: abc123\nname: safe',
    );

    expect(redacted).not.toContain("super-secret");
    expect(redacted).not.toContain("abc123");
    expect(redacted).toContain("[REDACTED]");
    expect(redacted).toContain("name: safe");
  });

  it("removes bearer tokens, JWTs, GitHub tokens, and private keys", () => {
    const redacted = redactPotentialSecrets(
      [
        "Authorization: Bearer token-value",
        "ghp_123456789012345678901234567890123456",
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123",
        "-----BEGIN PRIVATE KEY-----",
        "private-material",
        "-----END PRIVATE KEY-----",
      ].join("\n"),
    );

    expect(redacted).not.toContain("token-value");
    expect(redacted).not.toContain("ghp_");
    expect(redacted).not.toContain("eyJhbGci");
    expect(redacted).not.toContain("private-material");
  });

  it("removes credentials from JSON and YAML structures", () => {
    const redacted = redactPotentialSecrets(
      [
        '{"client_secret": "json-secret"}',
        "password: yaml-secret",
        '"connection_string" = "server-secret"',
      ].join("\n"),
    );

    expect(redacted).not.toContain("json-secret");
    expect(redacted).not.toContain("yaml-secret");
    expect(redacted).not.toContain("server-secret");
  });

  it("removes a private key even when the closing marker is beyond the excerpt", () => {
    const redacted = redactPotentialSecrets(
      `-----BEGIN PRIVATE KEY-----\n${"a".repeat(2_600)}\n-----END PRIVATE KEY-----`,
    ).slice(0, 2_000);

    expect(redacted).toBe("[REDACTED_PRIVATE_KEY]");
  });
});
