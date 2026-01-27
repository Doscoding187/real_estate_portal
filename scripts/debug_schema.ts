import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "292qWmvn2YGy2jW.root",
    password: "TOdjCJY1bepCcJg1",
    database: "listify_property_sa",
    ssl: { rejectUnauthorized: false },
  });

  console.log("Connected to DB");

  const targetTable = process.argv[2];
  const tables = targetTable ? [targetTable] : ['developments', 'locations', 'unit_types'];

  for (const table of tables) {
    console.log(`\n==================================================`);
    console.log(`Analyzing Table: ${table}`);
    console.log(`==================================================`);
    
    // SHOW CREATE TABLE
    try {
        const [rows] = await connection.query(`SHOW CREATE TABLE ${table}`);
        const createTable = (rows as any)[0]['Create Table'];
        console.log(`\n[SHOW CREATE TABLE]`);
        console.log(createTable);
    } catch (e: any) {
        console.error(`Error executing SHOW CREATE TABLE for ${table}:`, e.message);
    }

    // SHOW COLUMNS
    try {
        const [rows] = await connection.query(`SHOW COLUMNS FROM ${table}`);
        console.log(`\n[SHOW COLUMNS]`);
        console.table(rows);
    } catch (e: any) {
        console.error(`Error executing SHOW COLUMNS for ${table}:`, e.message);
    }
  }

  console.log(`\n==================================================`);
  console.log(`Fetching Reference Data`);
  console.log(`==================================================`);

  const referenceQueries = [
    { label: 'Last 20 Locations', query: 'SELECT id, name FROM locations ORDER BY id DESC LIMIT 20' },
    { label: 'Last 20 Developers', query: 'SELECT id, name FROM developers ORDER BY id DESC LIMIT 20' },
    { label: 'Last 20 Brand Profiles', query: 'SELECT id, brand_name FROM developer_brand_profiles ORDER BY id DESC LIMIT 20' }
  ];

  for (const ref of referenceQueries) {
      console.log(`\n[${ref.label}]`);
      try {
          const [rows] = await connection.query(ref.query);
          console.table(rows);
      } catch (e: any) {
          console.error(`Error executing query "${ref.query}":`, e.message);
      }
  }

  await connection.end();
}

main().catch(console.error);
