// Simple test to validate mock data
import { validateAllMockData } from './validateMockData';

console.log('Testing mock data validation...');
const result = validateAllMockData();
console.log('Validation result:', result ? 'PASSED' : 'FAILED');
