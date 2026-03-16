import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql, { type Connection } from 'mysql2/promise';

describe('Explore schema drift guard', () => {
  let connection: Connection;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for schema drift guard tests');
    }
    connection = await mysql.createConnection(process.env.DATABASE_URL);
  });

  afterAll(async () => {
    await connection.end();
  });

  it('ensures explore_content.actor_id column exists', async () => {
    const [rows] = await connection.query(
      `
      SELECT COUNT(*) AS c
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND column_name = 'actor_id'
      `,
    );
    const count = Number((rows as any[])[0]?.c ?? 0);
    expect(count).toBeGreaterThan(0);
  });

  it('ensures interaction_events table exists', async () => {
    const [rows] = await connection.query(
      `
      SELECT COUNT(*) AS c
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'interaction_events'
      `,
    );
    const count = Number((rows as any[])[0]?.c ?? 0);
    expect(count).toBeGreaterThan(0);
  });

  it('ensures economic_actors table exists', async () => {
    const [rows] = await connection.query(
      `
      SELECT COUNT(*) AS c
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'economic_actors'
      `,
    );
    const count = Number((rows as any[])[0]?.c ?? 0);
    expect(count).toBeGreaterThan(0);
  });

  it('ensures outcome_events table exists', async () => {
    const [rows] = await connection.query(
      `
      SELECT COUNT(*) AS c
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'outcome_events'
      `,
    );
    const count = Number((rows as any[])[0]?.c ?? 0);
    expect(count).toBeGreaterThan(0);
  });
});
