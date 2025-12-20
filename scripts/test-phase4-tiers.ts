
import { getQualityTier } from '../client/src/lib/quality';

console.log("Testing Quality Tiers...");

const cases = [
    { score: 95, expected: 'featured' },
    { score: 85, expected: 'optimized' },
    { score: 75, expected: 'optimized' },
    { score: 60, expected: 'basic' },
    { score: 40, expected: 'poor' },
    { score: 0, expected: 'poor' },
];

let failed = false;
cases.forEach(({ score, expected }) => {
    const res = getQualityTier(score);
    if (res.tier !== expected) {
        console.error(`FAIL: Score ${score} expected ${expected}, got ${res.tier}`);
        failed = true;
    } else {
        console.log(`PASS: Score ${score} -> ${res.tier} (${res.label})`);
    }
});

if (failed) process.exit(1);
console.log("All Quality Tier tests passed.");
