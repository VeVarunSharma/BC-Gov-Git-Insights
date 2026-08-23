"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";

import type { EstateEntity, EstateRelationship } from "@git-insights/contracts";

import {
  ENTITY_PALETTES,
  getRelationshipVisual,
} from "@/components/estate-map-model";

import "@xyflow/react/dist/style.css";

const elk = new ELK();
const DEFAULT_NODE_WIDTH = 170;
const DEFAULT_NODE_HEIGHT = 68;
const ORGANIZATION_NODE_WIDTH = 220;
const MINISTRY_MIN_WIDTH = 380;
const MINISTRY_MIN_HEIGHT = 220;
const MINISTRY_HEADER_HEIGHT = 94;
const MINISTRY_PADDING = 24;
const PARTICLE_STAGGERS = [0, -1.1, -2.2] as const;
const GROUPABLE_ENTITY_TYPES = new Set<EstateEntity["type"]>([
  "portfolio",
  "project",
  "repository",
]);

interface EstateNodeData extends Record<string, unknown> {
  confidence: number;
  description: string | null;
  entityType: EstateEntity["type"];
  label: string;
  status: EstateEntity["status"];
}

interface RelationshipEdgeData extends Record<string, unknown> {
  color: string;
  particlesEnabled: boolean;
  relationshipType: EstateRelationship["type"];
  status: EstateRelationship["status"];
}

type EstateFlowNode = Node<EstateNodeData, "default" | "ministryGroup">;
type MinistryFlowNode = Node<EstateNodeData, "ministryGroup">;
type RelationshipFlowEdge = Edge<RelationshipEdgeData, "relationship">;

function MinistryGroupNode({ data }: NodeProps<MinistryFlowNode>) {
  return (
    <div className="ministry-group-node">
      <Handle id="incoming" type="target" position={Position.Top} />
      <span>Candidate ministry grouping</span>
      <strong>{data.label}</strong>
      <small>
        Inferred from public repository evidence ·{" "}
        {Math.round(data.confidence * 100)}% confidence
      </small>
      <Handle id="children" type="source" position={Position.Bottom} />
    </div>
  );
}

function RelationshipEdge({
  data,
  id,
  label,
  markerEnd,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<RelationshipFlowEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    borderRadius: 18,
    offset: 22,
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });
  const color = data?.color ?? "#475569";
  const status = data?.status ?? "observed";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        label={label}
        labelX={labelX}
        labelY={labelY}
        labelShowBg
        labelBgBorderRadius={5}
        labelBgPadding={[5, 3]}
        labelBgStyle={{ fill: "#ffffff", fillOpacity: 0.94 }}
        labelStyle={{ fill: color, fontSize: 10, fontWeight: 750 }}
        interactionWidth={18}
        className={`estate-relationship-edge estate-relationship-edge--${status}`}
      />
      {data?.particlesEnabled
        ? PARTICLE_STAGGERS.map((begin, index) => (
            <circle
              key={begin}
              aria-hidden="true"
              className="estate-edge-particle"
              r={3.2}
              fill={color}
              opacity={1 - index * 0.16}
            >
              <animateMotion
                begin={`${begin}s`}
                dur="3.3s"
                path={edgePath}
                repeatCount="indefinite"
              />
            </circle>
          ))
        : null}
    </>
  );
}

const nodeTypes = { ministryGroup: MinistryGroupNode };
const edgeTypes = { relationship: RelationshipEdge };

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function getNodeDimension(
  value: string | number | undefined,
  fallback: number,
): number {
  return typeof value === "number" ? value : Number(value) || fallback;
}

function isEstateEntityType(value: unknown): value is EstateEntity["type"] {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ENTITY_PALETTES, value)
  );
}

function buildNodes(
  entities: EstateEntity[],
  relationships: EstateRelationship[],
): EstateFlowNode[] {
  const ministryIds = new Set(
    entities
      .filter((entity) => entity.type === "ministry")
      .map((entity) => entity.id),
  );
  const containmentParent = new Map(
    relationships
      .filter((relationship) => relationship.type === "contains")
      .map((relationship) => [relationship.target, relationship.source]),
  );

  const findMinistryParent = (entity: EstateEntity): string | undefined => {
    if (!GROUPABLE_ENTITY_TYPES.has(entity.type)) {
      return undefined;
    }

    const candidateMinistryId = entity.attributes.candidateMinistryId;
    if (
      typeof candidateMinistryId === "string" &&
      ministryIds.has(candidateMinistryId)
    ) {
      return candidateMinistryId;
    }

    const visited = new Set<string>();
    let parentId = containmentParent.get(entity.id);
    while (parentId && !visited.has(parentId)) {
      if (ministryIds.has(parentId)) {
        return parentId;
      }
      visited.add(parentId);
      parentId = containmentParent.get(parentId);
    }
    return undefined;
  };

  const nodes = entities.map((entity): EstateFlowNode => {
    const palette = ENTITY_PALETTES[entity.type];
    const parentId = findMinistryParent(entity);
    const isMinistry = entity.type === "ministry";
    const borderStyle =
      entity.status === "inferred"
        ? "dashed"
        : entity.status === "validated"
          ? "double"
          : "solid";
    const borderWidth = entity.status === "validated" ? 3 : 2;

    return {
      id: entity.id,
      type: isMinistry ? "ministryGroup" : "default",
      parentId,
      extent: parentId ? "parent" : undefined,
      expandParent: false,
      position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        confidence: entity.confidence,
        description: entity.description,
        entityType: entity.type,
        label: entity.label,
        status: entity.status,
      },
      style: isMinistry
        ? {
            background: palette.background,
            border: `${borderWidth}px ${borderStyle} ${palette.border}`,
            borderRadius: 18,
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
            height: MINISTRY_MIN_HEIGHT,
            padding: 0,
            width: MINISTRY_MIN_WIDTH,
          }
        : {
            alignItems: "center",
            background: palette.background,
            border: `${borderWidth}px ${borderStyle} ${palette.border}`,
            borderRadius: 12,
            color: "#0f172a",
            display: "flex",
            fontSize: 12,
            fontWeight: 650,
            height: DEFAULT_NODE_HEIGHT,
            justifyContent: "center",
            opacity: Math.max(0.72, entity.confidence),
            padding: 10,
            textAlign: "center",
            width:
              entity.type === "organization"
                ? ORGANIZATION_NODE_WIDTH
                : DEFAULT_NODE_WIDTH,
          },
      ariaLabel: `${entity.type}: ${entity.label}, ${entity.status}, ${Math.round(
        entity.confidence * 100,
      )}% confidence`,
      focusable: true,
      zIndex: isMinistry ? 0 : 2,
    };
  });

  return [
    ...nodes.filter((node) => node.parentId === undefined),
    ...nodes.filter((node) => node.parentId !== undefined),
  ];
}

function buildEdges(
  relationships: EstateRelationship[],
  entities: EstateEntity[],
  particlesEnabled: boolean,
): RelationshipFlowEdge[] {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));

  return relationships.map((relationship): RelationshipFlowEdge => {
    const presentation = getRelationshipVisual(relationship);
    const sourceEntity = entityById.get(relationship.source);
    const targetEntity = entityById.get(relationship.target);

    return {
      id: relationship.id,
      type: "relationship",
      source: relationship.source,
      target: relationship.target,
      sourceHandle: sourceEntity?.type === "ministry" ? "children" : undefined,
      targetHandle: targetEntity?.type === "ministry" ? "incoming" : undefined,
      label: presentation.label,
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: presentation.color,
        width: 18,
        height: 18,
      },
      style: {
        stroke: presentation.color,
        strokeDasharray: presentation.strokeDasharray,
        strokeWidth: presentation.strokeWidth,
        opacity: presentation.opacity,
      },
      data: {
        color: presentation.color,
        particlesEnabled,
        relationshipType: relationship.type,
        status: relationship.status,
      },
      ariaLabel: `${presentation.label} relationship from ${
        sourceEntity?.label ?? relationship.source
      } to ${targetEntity?.label ?? relationship.target}; ${
        relationship.status
      }; ${Math.round(relationship.confidence * 100)}% confidence`,
      ariaRole: "img",
      focusable: true,
      interactionWidth: 18,
      zIndex: 1,
    };
  });
}

interface MinistryLayout {
  height: number;
  positions: Map<string, { x: number; y: number }>;
  width: number;
}

async function layoutNodes(
  nodes: EstateFlowNode[],
  edges: RelationshipFlowEdge[],
): Promise<EstateFlowNode[]> {
  const ministryLayouts = new Map<string, MinistryLayout>();
  const ministryNodes = nodes.filter((node) => node.type === "ministryGroup");

  for (const ministryNode of ministryNodes) {
    const children = nodes.filter((node) => node.parentId === ministryNode.id);
    if (children.length === 0) {
      ministryLayouts.set(ministryNode.id, {
        height: MINISTRY_MIN_HEIGHT,
        positions: new Map(),
        width: MINISTRY_MIN_WIDTH,
      });
      continue;
    }

    const childIds = new Set(children.map((node) => node.id));
    const layout = await elk.layout({
      id: `layout:${ministryNode.id}`,
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.layered.spacing.nodeNodeBetweenLayers": "32",
        "elk.spacing.nodeNode": "22",
      },
      children: children.map((node) => ({
        id: node.id,
        width: getNodeDimension(node.style?.width, DEFAULT_NODE_WIDTH),
        height: getNodeDimension(node.style?.height, DEFAULT_NODE_HEIGHT),
      })),
      edges: edges
        .filter(
          (edge) => childIds.has(edge.source) && childIds.has(edge.target),
        )
        .map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
    });

    const contentWidth = Math.max(
      ...(layout.children ?? []).map(
        (node) => (node.x ?? 0) + (node.width ?? DEFAULT_NODE_WIDTH),
      ),
    );
    const contentHeight = Math.max(
      ...(layout.children ?? []).map(
        (node) => (node.y ?? 0) + (node.height ?? DEFAULT_NODE_HEIGHT),
      ),
    );
    const width = Math.max(
      MINISTRY_MIN_WIDTH,
      contentWidth + MINISTRY_PADDING * 2,
    );
    const height = Math.max(
      MINISTRY_MIN_HEIGHT,
      MINISTRY_HEADER_HEIGHT + contentHeight + MINISTRY_PADDING,
    );
    const horizontalOffset = (width - contentWidth) / 2;
    const positions = new Map(
      layout.children?.map((node) => [
        node.id,
        {
          x: horizontalOffset + (node.x ?? 0),
          y: MINISTRY_HEADER_HEIGHT + (node.y ?? 0),
        },
      ]) ?? [],
    );

    ministryLayouts.set(ministryNode.id, { height, positions, width });
  }

  const nestedNodes = nodes.map((node): EstateFlowNode => {
    if (node.type === "ministryGroup") {
      const layout = ministryLayouts.get(node.id);
      return layout
        ? {
            ...node,
            style: {
              ...node.style,
              height: layout.height,
              width: layout.width,
            },
          }
        : node;
    }

    if (node.parentId) {
      const position = ministryLayouts
        .get(node.parentId)
        ?.positions.get(node.id);
      return position ? { ...node, position } : node;
    }

    return node;
  });

  const rootNodes = nestedNodes.filter((node) => node.parentId === undefined);
  const rootIdByNodeId = new Map(
    nestedNodes.map((node) => [node.id, node.parentId ?? node.id]),
  );
  const rootEdgeKeys = new Set<string>();
  const rootEdges: Array<{
    id: string;
    sources: string[];
    targets: string[];
  }> = [];

  for (const edge of edges) {
    const source = rootIdByNodeId.get(edge.source);
    const target = rootIdByNodeId.get(edge.target);
    if (!source || !target || source === target) {
      continue;
    }

    const key = `${source}->${target}`;
    if (!rootEdgeKeys.has(key)) {
      rootEdgeKeys.add(key);
      rootEdges.push({
        id: `layout:${key}`,
        sources: [source],
        targets: [target],
      });
    }
  }

  const rootLayout = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "110",
      "elk.spacing.nodeNode": "54",
    },
    children: rootNodes.map((node) => ({
      id: node.id,
      width: getNodeDimension(node.style?.width, DEFAULT_NODE_WIDTH),
      height: getNodeDimension(node.style?.height, DEFAULT_NODE_HEIGHT),
    })),
    edges: rootEdges,
  });
  const rootPositions = new Map(
    rootLayout.children?.map((node) => [
      node.id,
      { x: node.x ?? 0, y: node.y ?? 0 },
    ]) ?? [],
  );

  return nestedNodes.map((node) =>
    node.parentId
      ? node
      : {
          ...node,
          position: rootPositions.get(node.id) ?? node.position,
        },
  );
}

interface EstateMapProps {
  entities: EstateEntity[];
  relationships: EstateRelationship[];
}

export function EstateMap({ entities, relationships }: EstateMapProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const initialNodes = useMemo(
    () => buildNodes(entities, relationships),
    [entities, relationships],
  );
  const edges = useMemo(
    () => buildEdges(relationships, entities, !prefersReducedMotion),
    [entities, prefersReducedMotion, relationships],
  );
  const [nodes, setNodes] = useState(initialNodes);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    EstateFlowNode,
    RelationshipFlowEdge
  > | null>(null);

  useEffect(() => {
    let active = true;
    layoutNodes(initialNodes, edges)
      .then((positioned) => {
        if (active) {
          setNodes(positioned);
          setLayoutRevision((revision) => revision + 1);
        }
      })
      .catch((error: unknown) => {
        console.error("Estate graph layout failed", error);
      });
    return () => {
      active = false;
    };
  }, [initialNodes, edges]);

  useEffect(() => {
    if (!reactFlowInstance || layoutRevision === 0) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      void reactFlowInstance.fitView({
        duration: prefersReducedMotion ? 0 : 280,
        padding: 0.08,
      });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [layoutRevision, prefersReducedMotion, reactFlowInstance]);

  return (
    <div
      className="estate-map"
      style={{ height: 650, width: "100%" }}
      aria-label="Interactive repository estate map"
    >
      <ReactFlow<EstateFlowNode, RelationshipFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setReactFlowInstance}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: false }}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const type = node.data.entityType;
            return isEstateEntityType(type)
              ? ENTITY_PALETTES[type].border
              : "#64748b";
          }}
        />
      </ReactFlow>
    </div>
  );
}
