// Test URL parsing logic
const location = '/gauteng/alberton?propertyType=house&view=list';
const searchParams = new URLSearchParams(location.split('?')[1] || '');

console.log('Location:', location);
console.log('Query string:', location.split('?')[1]);
console.log('searchParams.has(propertyType):', searchParams.has('propertyType'));
console.log('searchParams.has(view):', searchParams.has('view'));
console.log('searchParams.get(view):', searchParams.get('view'));

const hasSearchFilters = 
  searchParams.has('propertyType') || 
  searchParams.has('minPrice') || 
  searchParams.has('maxPrice') || 
  searchParams.has('bedrooms');

const isTransactionMode = searchParams.get('view') === 'list' || hasSearchFilters;

console.log('hasSearchFilters:', hasSearchFilters);
console.log('isTransactionMode:', isTransactionMode);
console.log('Should redirect to SearchResults:', isTransactionMode);
