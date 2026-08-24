interface EasyAuthClaim {
  typ: string;
  val: string;
}

interface EasyAuthPrincipal {
  auth_typ: string;
  claims: EasyAuthClaim[];
  name_typ: string;
  role_typ: string;
}

export interface AuthorizedPrincipal {
  tenantId: string;
  objectId: string;
  displayName: string;
  roles: string[];
}

// v1 ships the dashboard unauthenticated because it serves only public
// repository metadata. Unset this the moment security findings reach the UI:
// an aggregated, severity-ranked view of unremediated weaknesses is sensitive
// even when each underlying repository is public.
const publicViewerPrincipal: AuthorizedPrincipal = {
  tenantId: "public",
  objectId: "public-dashboard",
  displayName: "Public viewer",
  roles: ["viewer"],
};

export function isPublicDashboardEnabled(): boolean {
  return process.env.PUBLIC_DASHBOARD === "true";
}

const tenantClaimTypes = new Set([
  "tid",
  "http://schemas.microsoft.com/identity/claims/tenantid",
]);
const objectClaimTypes = new Set([
  "oid",
  "http://schemas.microsoft.com/identity/claims/objectidentifier",
]);
const nameClaimTypes = new Set(["name", "preferred_username"]);

function parseAllowedTenantIds(): Set<string> {
  const configured = process.env.ALLOWED_TENANT_IDS;
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ALLOWED_TENANT_IDS is required in production.");
    }
    return new Set(["72f988bf-86f1-41af-91ab-2d7cd011db47"]);
  }
  return new Set(
    configured
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function claimValue(
  claims: readonly EasyAuthClaim[],
  types: ReadonlySet<string>,
): string | null {
  return claims.find((claim) => types.has(claim.typ))?.val ?? null;
}

function parsePrincipal(encoded: string): EasyAuthPrincipal {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    throw new Error("The Azure client principal header is invalid.");
  }
  if (
    !decoded ||
    typeof decoded !== "object" ||
    !("claims" in decoded) ||
    !Array.isArray(decoded.claims)
  ) {
    throw new Error("The Azure client principal header has no claims.");
  }
  return decoded as EasyAuthPrincipal;
}

function validateTokenClaims(
  principal: EasyAuthPrincipal,
): AuthorizedPrincipal {
  const tenantId = claimValue(
    principal.claims,
    tenantClaimTypes,
  )?.toLowerCase();
  const objectId = claimValue(principal.claims, objectClaimTypes);
  const displayName =
    claimValue(principal.claims, nameClaimTypes) ?? "Authorized user";
  const issuer = claimValue(principal.claims, new Set(["iss"]));
  const audience = claimValue(principal.claims, new Set(["aud"]));
  const expiration = claimValue(principal.claims, new Set(["exp"]));
  const expectedAudience = process.env.ENTRA_CLIENT_ID;

  if (!tenantId || !objectId) {
    throw new Error(
      "The authenticated identity lacks tenant or object claims.",
    );
  }
  if (!parseAllowedTenantIds().has(tenantId)) {
    throw new Error("The authenticated tenant is not allowed.");
  }

  const validIssuers = new Set([
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
  ]);
  if (!issuer || !validIssuers.has(issuer)) {
    throw new Error("The authenticated token issuer is not allowed.");
  }
  if (expectedAudience && audience !== expectedAudience) {
    throw new Error("The authenticated token audience is invalid.");
  }
  if (!expiration || Number.parseInt(expiration, 10) * 1_000 <= Date.now()) {
    throw new Error("The authenticated token is expired.");
  }

  const roleType = principal.role_typ;
  return {
    tenantId,
    objectId,
    displayName,
    roles: principal.claims
      .filter((claim) => claim.typ === roleType || claim.typ === "roles")
      .map((claim) => claim.val),
  };
}

export function authorizeHeaders(
  headers: Pick<Headers, "get">,
): AuthorizedPrincipal | null {
  // Checked before any header parsing so public mode cannot be broken by a
  // malformed or hostile x-ms-client-principal header.
  if (isPublicDashboardEnabled()) {
    return publicViewerPrincipal;
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.EASY_AUTH_ENABLED !== "true"
  ) {
    return null;
  }
  const encoded = headers.get("x-ms-client-principal");
  if (!encoded) {
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.DEV_AUTH_DISABLED !== "false"
    ) {
      return {
        tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
        objectId: "local-development",
        displayName: "Local developer",
        roles: ["viewer"],
      };
    }
    return null;
  }
  return validateTokenClaims(parsePrincipal(encoded));
}
