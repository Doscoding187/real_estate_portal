import fs from 'fs';
console.log('Starting simple test');
fs.writeFileSync('simple_test.log', 'Hello from simple test');
console.log('Finished simple test');
process.exit(0);
