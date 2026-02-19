import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';

// Connection state
export let _db: any = null;

export function resetDb() {
  _db = null;
}

// Lazily create the drizzle instance
export async function getDb() {
  if (_db) return _db;

  // In test environment, bypass actual DB connection to avoid DATABASE_URL dependency
  // preventing unit tests from running in CI/CD.
  // However, if DATABASE_URL is present, we assume integration tests are desired.
  if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) {
    type Row = Record<string, any>;

    let nextPropertyId = 1;
    const state = {
      properties: [] as Row[],
      images: [] as Row[],
      locations: [] as Row[],
      listings: [] as Row[],
    };

    const mockTable = {
      findFirst: async () => null,
      findMany: async () => [],
      delete: async () => [],
      update: async () => [],
      insert: async () => [],
    };

    const createQueryProxy = () =>
      new Proxy(
        {},
        {
          get: (_target, prop) => {
            if (prop === 'developers') {
              return {
                ...mockTable,
                findFirst: async () => ({
                  id: 1,
                  userId: 'user_123',
                  status: 'approved',
                  name: 'Test Dev',
                }),
              };
            }
            return mockTable;
          },
        },
      );

    const getTableName = (table: any): string => {
      if (table === schema.properties) return 'properties';
      if (table === schema.propertyImages) return 'property_images';
      return String(table?.name ?? table?.tableName ?? table?._?.name ?? '').toLowerCase();
    };

    const collectHintTokens = (value: any, acc: string[] = [], depth = 0): string[] => {
      if (depth > 5 || value === null || value === undefined) return acc;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        acc.push(String(value).toLowerCase());
        return acc;
      }
      if (Array.isArray(value)) {
        value.forEach(item => collectHintTokens(item, acc, depth + 1));
        return acc;
      }
      if (typeof value === 'object') {
        Object.entries(value).forEach(([k, v]) => {
          acc.push(k.toLowerCase());
          collectHintTokens(v, acc, depth + 1);
        });
      }
      return acc;
    };

    const normalizeSearchRow = (row: Row): Row => ({
      id: Number(row.id ?? 0),
      title: row.title ?? 'Untitled Property',
      price: 1000000,
      suburb: 'Mock Suburb',
      city: row.city ?? '',
      province: row.province ?? '',
      propertyType: row.propertyType ?? 'house',
      listingType: row.listingType ?? row.transactionType ?? 'sale',
      bedrooms: row.bedrooms ?? null,
      bathrooms: row.bathrooms ?? null,
      erfSize: Number(row.area ?? row.erfSize ?? 0),
      floorSize: Number(row.area ?? row.floorSize ?? 0),
      titleType: 'freehold',
      levy: row.levies ?? null,
      rates: row.ratesAndTaxes ?? null,
      securityEstate: false,
      petFriendly: false,
      fibreReady: false,
      loadSheddingSolutions: ['none'],
      videoCount: 0,
      status: row.status ?? 'available',
      listedDate:
        row.listedDate instanceof Date
          ? row.listedDate
          : row.listedDate
            ? new Date(row.listedDate)
            : row.createdAt
              ? new Date(row.createdAt)
              : new Date('2024-01-01T00:00:00.000Z'),
      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),
      highlights: [],
      agentId: Number(row.agentId ?? row.ownerId ?? 0),
    });

    const makeQuery = (selectedShape?: Record<string, any>) => {
      let activeTable = '';
      let currentRows: Row[] = [];
      let limitValue: number | null = null;
      let offsetValue = 0;

      const isCountSelect =
        !!selectedShape &&
        typeof selectedShape === 'object' &&
        Object.prototype.hasOwnProperty.call(selectedShape, 'count') &&
        Object.keys(selectedShape).length === 1;

      const builder: any = {
        from(table: any) {
          activeTable = getTableName(table);

          if (activeTable.includes('property_images')) {
            currentRows = state.images.map(img => ({
              propertyId: Number(img.propertyId ?? 0),
              imageUrl: img.imageUrl ?? '',
              isPrimary: Boolean(img.isPrimary),
              displayOrder: Number(img.displayOrder ?? 0),
            }));
          } else if (activeTable.includes('locations')) {
            // Return raw location data as stored
            currentRows = [...state.locations];
          } else if (activeTable.includes('listings')) {
            currentRows = [...state.listings];
          } else if (activeTable.includes('properties')) {
            // Return raw property data as stored, not normalized
            currentRows = [...state.properties];
          } else {
            currentRows = [];
          }

          return builder;
        },
        leftJoin() {
          return builder;
        },
        where(condition: any) {
          // Basic filtering support for eq() conditions
          // Extract field and value from Drizzle's eq() condition
          if (condition && typeof condition === 'object') {
            try {
              // Try to extract the column name and value from the condition
              // Drizzle's eq() creates an object with column and value info
              const conditionStr = JSON.stringify(condition);

              // Simple heuristic: if condition has 'value' property, use it
              if (condition.value !== undefined) {
                // Find which field is being filtered
                // This is a simplified implementation - in reality Drizzle conditions are more complex
                const filterValue = condition.value;

                // Filter by id if the condition seems to be about id
                if (conditionStr.includes('"id"') || conditionStr.includes('id')) {
                  currentRows = currentRows.filter(row => row.id === filterValue);
                }
              }
            } catch (e) {
              // If we can't parse the condition, just return all rows
              console.warn('[Mock DB] Could not parse where condition:', e);
            }
          }
          return builder;
        },
        groupBy() {
          const grouped = new Map<string, number>();
          currentRows.forEach(row => {
            const key = String(row.propertyType ?? 'unknown');
            grouped.set(key, (grouped.get(key) ?? 0) + 1);
          });
          currentRows = Array.from(grouped.entries()).map(([propertyType, count]) => ({
            propertyType,
            count,
          }));
          return builder;
        },
        orderBy(...args: any[]) {
          if (activeTable.includes('property_images')) {
            currentRows.sort((a, b) => {
              const primaryCmp = Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary));
              if (primaryCmp !== 0) return primaryCmp;
              return Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0);
            });
            return builder;
          }

          const orderExpr: any = args?.[0];
          const chunks = Array.isArray(orderExpr?.queryChunks) ? orderExpr.queryChunks : [];
          const directionText = chunks
            .filter((chunk: any) => Array.isArray(chunk?.value))
            .map((chunk: any) => String(chunk.value.join('')).toLowerCase())
            .join(' ');
          const hasDesc = directionText.includes('desc');

          const orderedColumn = chunks.find(
            (chunk: any) => chunk && typeof chunk === 'object' && typeof chunk.name === 'string',
          );
          const columnName = String(orderedColumn?.name ?? '').toLowerCase();

          if (columnName === 'price') {
            currentRows.sort((a, b) =>
              hasDesc
                ? Number(b.price ?? 0) - Number(a.price ?? 0)
                : Number(a.price ?? 0) - Number(b.price ?? 0),
            );
            return builder;
          }

          if (columnName === 'createdat' || columnName === 'created_at') {
            currentRows.sort((a, b) => {
              const aTs = new Date(a.listedDate ?? 0).getTime();
              const bTs = new Date(b.listedDate ?? 0).getTime();
              return hasDesc ? bTs - aTs : aTs - bTs;
            });
            return builder;
          }

          if (columnName === 'address') {
            currentRows.sort((a, b) => {
              const aSuburb = String(a.suburb ?? '').toLowerCase();
              const bSuburb = String(b.suburb ?? '').toLowerCase();
              return hasDesc ? bSuburb.localeCompare(aSuburb) : aSuburb.localeCompare(bSuburb);
            });
            return builder;
          }

          currentRows.sort(
            (a, b) => new Date(b.listedDate ?? 0).getTime() - new Date(a.listedDate ?? 0).getTime(),
          );
          return builder;
        },
        limit(n: number) {
          limitValue = Math.max(0, Number(n ?? 0));
          return builder;
        },
        offset(n: number) {
          offsetValue = Math.max(0, Number(n ?? 0));
          return builder;
        },
        then(resolve: (value: any) => any, reject?: (reason: any) => any) {
          let outputRows = [...currentRows];
          if (offsetValue > 0) outputRows = outputRows.slice(offsetValue);
          if (limitValue !== null) outputRows = outputRows.slice(0, limitValue);
          const output = isCountSelect ? [{ count: currentRows.length }] : outputRows;
          return Promise.resolve(output).then(resolve, reject);
        },
      };

      return builder;
    };

    const mockDb: any = {
      query: createQueryProxy(),
      select: (shape?: Record<string, any>) => makeQuery(shape),
      insert: (table: any) => ({
        values: async (value: Row | Row[]) => {
          const tableName = getTableName(table);
          const values = Array.isArray(value) ? value : [value];

          if (tableName.includes('properties')) {
            let lastInsertId = 0;
            values.forEach(v => {
              const id = Number(v.id ?? nextPropertyId++);
              state.properties.push({ ...v, id });
              lastInsertId = id;
            });
            return { insertId: lastInsertId };
          }

          if (tableName.includes('locations')) {
            let lastInsertId = 0;
            values.forEach(v => {
              const id = Number(v.id ?? nextPropertyId++);
              state.locations.push({ ...v, id });
              lastInsertId = id;
            });
            return { insertId: lastInsertId };
          }

          if (tableName.includes('listings')) {
            let lastInsertId = 0;
            values.forEach(v => {
              const id = Number(v.id ?? nextPropertyId++);
              state.listings.push({ ...v, id });
              lastInsertId = id;
            });
            return { insertId: lastInsertId };
          }

          if (tableName.includes('property_images')) {
            values.forEach((v, idx) => {
              state.images.push({
                id: Number(v.id ?? idx + 1),
                propertyId: Number(v.propertyId ?? 0),
                imageUrl: v.imageUrl ?? '',
                isPrimary: Boolean(v.isPrimary),
                displayOrder: Number(v.displayOrder ?? 0),
              });
            });
            return { insertId: 1 };
          }

          return { insertId: 0 };
        },
      }),
      update: () => ({ set: () => ({ where: async () => ({ affectedRows: 0 }) }) }),
      delete: (table: any) => ({
        where: async () => {
          if (getTableName(table).includes('properties')) {
            state.properties = [];
          } else if (getTableName(table).includes('locations')) {
            state.locations = [];
          } else if (getTableName(table).includes('listings')) {
            state.listings = [];
          }
          return { affectedRows: 0 };
        },
      }),
      transaction: async (cb: any) => cb(mockDb),
    };

    (mockDb as any).__seed = state;
    _db = mockDb as any;
    return _db;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is missing. Set it in .env.local (dev) or .env.production (prod).',
    );
  }

  // Safety Check: Verify Database Environment Separation
  try {
    const url = new URL(process.env.DATABASE_URL);
    const dbName = url.pathname.replace(/^\//, ''); // Remove leading slash
    const env = process.env.NODE_ENV || 'development';

    // Production: Must match listify_property_sa (Live Prod)
    if (env === 'production' && dbName !== 'listify_property_sa') {
      throw new Error(
        `CRITICAL: Attempting to connect to non-production DB (${dbName}) in PRODUCTION environment. Expected: listify_property_sa`,
      );
    }
    // Staging: Must match listify_staging
    if (env === 'staging' && dbName !== 'listify_staging') {
      throw new Error(
        `CRITICAL: Attempting to connect to non-staging DB (${dbName}) in STAGING environment. Expected: listify_staging`,
      );
    }
    // Test: Must match listify_test
    if (env === 'test' && dbName !== 'listify_test') {
      throw new Error(
        `CRITICAL: Attempting to connect to non-test DB (${dbName}) in TEST environment. Expected: listify_test`,
      );
    }

    // Reverse Check: Don't allow Prod DB in non-prod envs
    if (dbName === 'listify_property_sa' && env !== 'production') {
      throw new Error(`CRITICAL: DANGER! Attempting to connect to PROD DB in ${env} environment.`);
    }
  } catch (e: any) {
    // If URL parsing fails, we might want to let it slide or throw.
    // Assuming valid URLs for now, but catching to be safe.
    if (e.message.includes('CRITICAL')) throw e;
    console.warn('[Database] URL parsing warning:', e.message);
  }

  try {
    const isProduction = process.env.NODE_ENV === 'production';

    // Debug log for connection attempt
    console.log('[Database] Attempting connection...');

    const poolConnection = mysql.createPool({
      uri: process.env.DATABASE_URL,
      ssl: {
        // TiDB Cloud / PlanetScale often require this to be false on some platforms
        // unless you provide the CA certificate explicitly.
        // We set it to false to ensure connectivity, relying on the encrypted channel.
        rejectUnauthorized: false,
      },
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    console.log('[Database] Connection pool initialized.');

    // Verify connection and log DB name
    try {
      const [rows] = await poolConnection.query('SELECT DATABASE() AS db, @@hostname AS host');
      const dbInfo = (rows as any)[0];
      console.log(
        `[Database] Connected to: ${dbInfo?.db || '(unknown)'} @ ${dbInfo?.host || '(unknown)'}`,
      );
    } catch (e) {
      console.warn('[Database] Connection verified, but failed to read DB name');
    }

    _db = drizzle(poolConnection, { schema, mode: 'default' });
    return _db;
  } catch (error) {
    console.error('[Database] Failed to connect:', error);
    _db = null;
    return null;
  }
}
