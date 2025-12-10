/**
 * Performance Load Test for Google Places Autocomplete Integration
 * 
 * This k6 load test script validates system performance under realistic load.
 * 
 * Usage:
 *   k6 run performance-test.js
 * 
 * Requirements:
 *   - k6 installed (https://k6.io/docs/getting-started/installation/)
 *   - Staging or production environment accessible
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const locationPageLoadTime = new Trend('location_page_load_time');
const autocompleteResponseTime = new Trend('autocomplete_response_time');
const statisticsResponseTime = new Trend('statistics_response_time');
const errorRate = new Rate('error_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests should be below 2s
    'location_page_load_time': ['p(95)<2000'], // 95% of location pages < 2s
    'autocomplete_response_time': ['p(95)<500'], // 95% of autocomplete < 500ms
    'statistics_response_time': ['p(95)<500'], // 95% of statistics < 500ms
    'error_rate': ['rate<0.05'], // Error rate should be below 5%
  },
};

// Test data
const testLocations = [
  '/south-africa/gauteng/johannesburg/sandton',
  '/south-africa/western-cape/cape-town/camps-bay',
  '/south-africa/kwazulu-natal/durban/umhlanga',
  '/south-africa/gauteng/johannesburg/rosebank',
  '/south-africa/western-cape/cape-town/sea-point',
];

const BASE_URL = __ENV.BASE_URL || 'https://staging.propertylistify.com';

/**
 * Main test scenario
 */
export default function () {
  // Scenario 1: Load location page
  testLocationPageLoad();
  sleep(1);

  // Scenario 2: Test autocomplete API
  testAutocompleteAPI();
  sleep(1);

  // Scenario 3: Test statistics API
  testStatisticsAPI();
  sleep(1);

  // Scenario 4: Test search integration
  testSearchIntegration();
  sleep(2);
}

/**
 * Test location page load performance
 */
function testLocationPageLoad() {
  const location = testLocations[Math.floor(Math.random() * testLocations.length)];
  const url = `${BASE_URL}${location}`;

  const response = http.get(url, {
    tags: { name: 'LocationPageLoad' },
  });

  const success = check(response, {
    'location page status is 200': (r) => r.status === 200,
    'location page loads in < 2s': (r) => r.timings.duration < 2000,
    'location page has content': (r) => r.body.length > 1000,
    'location page has meta tags': (r) => r.body.includes('<meta'),
    'location page has structured data': (r) => r.body.includes('@type'),
  });

  locationPageLoadTime.add(response.timings.duration);
  errorRate.add(!success);
}

/**
 * Test autocomplete API performance
 */
function testAutocompleteAPI() {
  const queries = ['Sand', 'Camps', 'Umhl', 'Rose', 'Sea P'];
  const query = queries[Math.floor(Math.random() * queries.length)];

  const url = `${BASE_URL}/api/locations/autocomplete?q=${query}`;

  const response = http.get(url, {
    tags: { name: 'AutocompleteAPI' },
  });

  const success = check(response, {
    'autocomplete status is 200': (r) => r.status === 200,
    'autocomplete responds in < 500ms': (r) => r.timings.duration < 500,
    'autocomplete returns suggestions': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) && data.length > 0;
      } catch (e) {
        return false;
      }
    },
  });

  autocompleteResponseTime.add(response.timings.duration);
  errorRate.add(!success);
}

/**
 * Test statistics API performance
 */
function testStatisticsAPI() {
  const locationIds = [1, 2, 3, 4, 5]; // Sample location IDs
  const locationId = locationIds[Math.floor(Math.random() * locationIds.length)];

  const url = `${BASE_URL}/api/locations/${locationId}/statistics`;

  const response = http.get(url, {
    tags: { name: 'StatisticsAPI' },
  });

  const success = check(response, {
    'statistics status is 200': (r) => r.status === 200,
    'statistics responds in < 500ms': (r) => r.timings.duration < 500,
    'statistics has required fields': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.avgSalePrice !== undefined && data.listingCount !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  statisticsResponseTime.add(response.timings.duration);
  errorRate.add(!success);
}

/**
 * Test search integration
 */
function testSearchIntegration() {
  const url = `${BASE_URL}/api/search?location=sandton&type=sale`;

  const response = http.get(url, {
    tags: { name: 'SearchAPI' },
  });

  const success = check(response, {
    'search status is 200': (r) => r.status === 200,
    'search responds in < 1s': (r) => r.timings.duration < 1000,
    'search returns results': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.results);
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('Starting performance test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Test duration: ~18 minutes');
  console.log('Max concurrent users: 100');
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  console.log('Performance test completed!');
}
