import { appRouter } from './routers';

console.log('--- tRPC Procedures ---');
const procedures = appRouter._def.procedures;
for (const [key, value] of Object.entries(procedures)) {
  console.log(key);
}
console.log('--- End Procedures ---');
