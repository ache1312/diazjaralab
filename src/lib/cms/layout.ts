import type { PageId, SiteContent } from "../../content-data/types";
import { getPageDocument } from "./content";
import type { SectionBlock, SectionBlockType } from "./models";

type BlockAttributes = {
  readonly "data-cms-block": string;
  readonly "data-cms-variant": string;
  readonly style: string;
  readonly hidden?: true;
};

function normalizedLiveBlock(
  value: unknown,
  fallbackBlocks: readonly SectionBlock[],
): SectionBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Record<string, unknown>;
  const stableId = typeof block.id === "string"
    ? block.id
    : typeof block.custom_id === "string"
      ? block.custom_id
      : null;
  const explicitType = typeof block.type === "string"
    ? fallbackBlocks.find(({ type }) => type === block.type)
    : undefined;
  const identifiedById = stableId
    ? fallbackBlocks.find(({ id }) => id === stableId)
    : undefined;
  const typename = typeof block.__typename === "string" ? block.__typename : "";
  const identifiedByTypename = fallbackBlocks.find(({ type }) => {
    const suffix = type.charAt(0).toUpperCase() + type.slice(1);
    return typename.endsWith(suffix);
  });
  const fallback = explicitType ?? identifiedById ?? identifiedByTypename;
  if (!fallback) return null;

  return {
    id: stableId || fallback.id,
    type: fallback.type,
    enabled: typeof block.enabled === "boolean" ? block.enabled : fallback.enabled,
    locked: typeof block.locked === "boolean" ? block.locked : fallback.locked,
    order: typeof block.order === "number" ? block.order : fallback.order,
    variant: typeof block.variant === "string" && block.variant
      ? block.variant
      : fallback.variant,
  };
}

/**
 * Returns the request-scoped block list while Tina is editing, and the static
 * JSON document in production. Array position is intentionally authoritative:
 * Tina's drag-and-drop updates list order but does not rewrite the hidden
 * migration-era `order` number.
 */
export function getPageBlocks(content: SiteContent, page: PageId): readonly SectionBlock[] {
  const fallbackBlocks = getPageDocument(page).blocks;
  const livePage = content._tina?.page as Record<string, unknown> | undefined;
  if (Array.isArray(livePage?.blocks)) {
    const normalized = livePage.blocks.flatMap((block) => {
      const result = normalizedLiveBlock(block, fallbackBlocks);
      return result ? [result] : [];
    });
    const uniqueTypes = new Set(normalized.map(({ type }) => type));
    if (
      normalized.length > 0
      && uniqueTypes.size === normalized.length
    ) {
      return normalized;
    }
  }
  return fallbackBlocks;
}

export function blockAttributes(
  content: SiteContent,
  page: PageId,
  type: SectionBlockType,
  fallbackOrder: number,
): BlockAttributes {
  const blocks = getPageBlocks(content, page);
  const index = blocks.findIndex((block) => block.type === type);
  const block = index >= 0 ? blocks[index] : undefined;
  const hasLayout = blocks.length > 0;
  const hidden = block
    ? block.enabled === false && block.locked === false
    : hasLayout;

  return {
    "data-cms-block": block?.id ?? `${page}-${type}`,
    "data-cms-variant": block?.variant ?? "default",
    style: `order: ${index >= 0 ? index + 1 : fallbackOrder}`,
    ...(hidden ? { hidden: true as const } : {}),
  };
}
