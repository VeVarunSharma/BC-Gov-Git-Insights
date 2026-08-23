import { buildGraphSlice } from "@git-insights/graph";
import { z } from "zod";

import { authorizeHeaders } from "@/lib/auth";
import {
  graphEntities,
  graphRelationships,
  organizationSnapshot,
} from "@/lib/demo-data";

const querySchema = z.object({
  focusId: z.string().min(1).optional(),
  depth: z.coerce.number().int().min(0).max(4).default(2),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export function GET(request: Request) {
  let principal;
  try {
    principal = authorizeHeaders(request.headers);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!principal) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    focusId: url.searchParams.get("focusId") ?? undefined,
    depth: url.searchParams.get("depth") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid graph query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  return Response.json(
    buildGraphSlice(graphEntities, graphRelationships, {
      datasetVersion: organizationSnapshot.datasetVersion,
      focusId: parsed.data.focusId,
      depth: parsed.data.depth,
      limit: parsed.data.limit,
    }),
  );
}
