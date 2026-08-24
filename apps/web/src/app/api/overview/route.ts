import { authorizeHeaders } from "@/lib/auth";
import {
  agenticRecommendations,
  ministryInsights,
  organizationSnapshot,
  repositoryRows,
} from "@/lib/demo-data";

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

  return Response.json({
    dataset: organizationSnapshot,
    repositories: repositoryRows,
    agenticRecommendations,
    ministryInsights,
  });
}
