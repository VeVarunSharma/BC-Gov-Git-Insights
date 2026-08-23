import {
  graphSliceSchema,
  type EstateEntity,
  type EstateRelationship,
  type GraphSlice,
} from "@git-insights/contracts";

export const MAX_GRAPH_NODES = 500;

export interface GraphSliceOptions {
  datasetVersion: string;
  focusId?: string;
  depth?: number;
  entityTypes?: EstateEntity["type"][];
  limit?: number;
}

export function buildGraphSlice(
  entities: readonly EstateEntity[],
  relationships: readonly EstateRelationship[],
  options: GraphSliceOptions,
): GraphSlice {
  const limit = Math.min(options.limit ?? 200, MAX_GRAPH_NODES);
  if (limit < 1) {
    throw new Error("Graph slice limit must be positive.");
  }

  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const allowedTypes = options.entityTypes
    ? new Set(options.entityTypes)
    : null;
  const depth = Math.max(0, Math.min(options.depth ?? 2, 4));
  const included = new Set<string>();

  if (options.focusId) {
    if (!entityById.has(options.focusId)) {
      throw new Error(`Graph focus entity not found: ${options.focusId}`);
    }
    included.add(options.focusId);

    let frontier = new Set([options.focusId]);
    for (let currentDepth = 0; currentDepth < depth; currentDepth += 1) {
      const next = new Set<string>();
      for (const relationship of relationships) {
        if (frontier.has(relationship.source)) {
          next.add(relationship.target);
        }
        if (frontier.has(relationship.target)) {
          next.add(relationship.source);
        }
      }
      next.forEach((id) => included.add(id));
      frontier = next;
    }
  } else {
    entities.forEach((entity) => included.add(entity.id));
  }

  const candidateEntities = [
    ...entities.filter(
      (entity) =>
        included.has(entity.id) &&
        (allowedTypes === null || allowedTypes.has(entity.type)),
    ),
  ].sort(
    (left, right) =>
      right.confidence - left.confidence ||
      left.label.localeCompare(right.label, "en"),
  );
  const slicedEntities = candidateEntities.slice(0, limit);
  const slicedIds = new Set(slicedEntities.map((entity) => entity.id));
  const slicedRelationships = relationships.filter(
    (relationship) =>
      slicedIds.has(relationship.source) && slicedIds.has(relationship.target),
  );

  return graphSliceSchema.parse({
    datasetVersion: options.datasetVersion,
    focusId: options.focusId ?? null,
    truncated: candidateEntities.length > slicedEntities.length,
    entities: slicedEntities,
    relationships: slicedRelationships,
  });
}
