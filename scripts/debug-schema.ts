import * as schema from '../drizzle/schema.js';

console.log('Schema Exports:', Object.keys(schema));

if (schema.users) {
  console.log('Users table found.');
  // Drizzle tables store column definitions in a hidden symbol or property, hard to print directly.
  // But identifying it exists is enough.
} else {
  console.log('Users table NOT found in schema.js');
}

if (schema.agents) {
  console.log('Agents table found.');
} else {
  console.log('Agents table NOT found in schema.js');
}
