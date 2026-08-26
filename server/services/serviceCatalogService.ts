import { eq } from 'drizzle-orm';
import {
  SERVICE_TAXONOMY_NODE_LEVEL_VALUES,
  serviceTaxonomyNodes,
} from '../../drizzle/schema';
import { getDb } from '../db';

export type TaxonomyNodeRecord = typeof serviceTaxonomyNodes.$inferSelect;

export class ServiceCatalogService {
  async listActiveNodes(): Promise<TaxonomyNodeRecord[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    return db
      .select()
      .from(serviceTaxonomyNodes)
      .where(eq(serviceTaxonomyNodes.isActive, 1))
      .orderBy(serviceTaxonomyNodes.sortOrder, serviceTaxonomyNodes.name);
  }

  async getNodeById(nodeId: number): Promise<TaxonomyNodeRecord | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [row] = await db
      .select()
      .from(serviceTaxonomyNodes)
      .where(eq(serviceTaxonomyNodes.id, nodeId))
      .limit(1);
    return row ?? null;
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNodeRecord | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [row] = await db
      .select()
      .from(serviceTaxonomyNodes)
      .where(eq(serviceTaxonomyNodes.slug, slug))
      .limit(1);
    return row ?? null;
  }

  /**
   * Ancestors of a node ordered nearest-first (excluding the node itself),
   * plus the node itself first. Uses the in-memory tree because the taxonomy
   * is small and governed.
   */
  async lineageIncludingSelf(nodeId: number): Promise<TaxonomyNodeRecord[]> {
    const nodes = await this.listAllNodesForLineage();
    return buildLineage(nodes, nodeId);
  }

  private async listAllNodesForLineage(): Promise<TaxonomyNodeRecord[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    return db.select().from(serviceTaxonomyNodes);
  }
}

export function buildLineage(
  nodes: TaxonomyNodeRecord[],
  nodeId: number,
): TaxonomyNodeRecord[] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const lineage: TaxonomyNodeRecord[] = [];
  let cursor = byId.get(nodeId);
  let guard = 0;
  while (cursor && guard < SERVICE_TAXONOMY_NODE_LEVEL_VALUES.length + 2) {
    lineage.push(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    guard += 1;
  }
  return lineage;
}

export function isDescendantOf(
  nodes: TaxonomyNodeRecord[],
  candidateId: number,
  ancestorId: number,
): boolean {
  if (candidateId === ancestorId) return true;
  const byId = new Map(nodes.map(node => [node.id, node]));
  let cursor = byId.get(candidateId);
  let guard = 0;
  while (cursor?.parentId && guard < 10) {
    if (cursor.parentId === ancestorId) return true;
    cursor = byId.get(cursor.parentId);
    guard += 1;
  }
  return false;
}

export const serviceCatalogService = new ServiceCatalogService();
