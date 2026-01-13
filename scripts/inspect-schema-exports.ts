
import * as schema from '../drizzle/schema';

console.log('--- Schema Exports ---');
console.log(Object.keys(schema).filter(k => k.toLowerCase().includes('unit')));
console.log('--- End ---');
