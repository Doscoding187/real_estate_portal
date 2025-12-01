# Requirements Document

## Introduction

This feature replaces the placeholder data in the Property Price Insights section on the home page with real-time analytics derived from actual property listings in the platform's database. The system will aggregate listing data by city, calculate meaningful statistics, and present them through an interactive tabbed interface showing average price maps, asking price distributions, market activity metrics, and micromarket comparisons.

## Glossary

- **Property Listing**: A record in the properties table representing a real estate listing with details like price, location, type, and status
- **Price Insights System**: The backend service that aggregates and calculates property statistics from listing data
- **Micromarket**: A specific suburb or area within a city with distinct pricing characteristics
- **Median Price**: The middle value in a sorted list of property prices, representing typical market pricing
- **Price per m²**: The average cost per square meter of property area
- **Active Listing**: A property with status 'available', 'published', or 'pending' (not 'sold', 'rented', 'draft', or 'archived')
- **Price Range Bucket**: A categorized grouping of properties by price (e.g., Below R1M, R1M-R2M)
- **Analytics Aggregation**: Pre-calculated statistics stored for performance optimization

## Requirements

### Requirement 1

**User Story:** As a home page visitor, I want to see real property price data for major South African cities, so that I can understand current market conditions based on actual listings.

#### Acceptance Criteria

1. WHEN the home page loads THEN the Property Insights System SHALL fetch aggregated statistics from actual property listings in the database
2. WHEN displaying city statistics THEN the Property Insights System SHALL only include properties with status 'available', 'published', or 'pending'
3. WHEN calculating statistics THEN the Property Insights System SHALL group properties by city using the cityId and city fields
4. WHEN no listings exist for a city THEN the Property Insights System SHALL return zero values or appropriate empty state indicators
5. WHEN the data is fetched THEN the Property Insights System SHALL cache results for 15 minutes to optimize performance

### Requirement 2

**User Story:** As a home page visitor, I want to see median prices and listing counts for each city, so that I can compare market sizes and typical property values.

#### Acceptance Criteria

1. WHEN calculating median price THEN the Property Insights System SHALL compute the middle value from all active listing prices in that city
2. WHEN calculating listing count THEN the Property Insights System SHALL count all active properties in that city
3. WHEN displaying median price THEN the frontend SHALL format the value in millions with two decimal places (e.g., "R 2.85M")
4. WHEN displaying listing count THEN the frontend SHALL format the value with thousand separators (e.g., "45,655")
5. WHEN median price cannot be calculated due to insufficient data THEN the Property Insights System SHALL return null or zero

### Requirement 3

**User Story:** As a home page visitor, I want to see price distribution across different price ranges, so that I can understand the variety of properties available in each city.

#### Acceptance Criteria

1. WHEN calculating price ranges THEN the Property Insights System SHALL categorize properties into buckets: Below R1M, R1M-R2M, R2M-R3M, R3M-R5M, R5M-R10M, Above R10M
2. WHEN a property price falls within a range THEN the Property Insights System SHALL increment the count for that bucket
3. WHEN displaying price distribution THEN the frontend SHALL render horizontal bar charts with proportional widths
4. WHEN a price range has zero properties THEN the frontend SHALL still display the range with a count of zero
5. WHEN calculating bucket boundaries THEN the Property Insights System SHALL use inclusive lower bounds and exclusive upper bounds

### Requirement 4

**User Story:** As a home page visitor, I want to see average price per square meter for each city, so that I can compare property values normalized by size.

#### Acceptance Criteria

1. WHEN calculating price per m² THEN the Property Insights System SHALL divide each property's price by its area field
2. WHEN aggregating city-wide price per m² THEN the Property Insights System SHALL compute the mean of all individual property price-per-m² values
3. WHEN a property has null or zero area THEN the Property Insights System SHALL exclude that property from price per m² calculations
4. WHEN displaying price per m² THEN the frontend SHALL format the value with thousand separators (e.g., "R 16,950")
5. WHEN insufficient data exists THEN the Property Insights System SHALL return null for price per m²

### Requirement 5

**User Story:** As a home page visitor, I want to see micromarket price comparisons within each city, so that I can identify premium and affordable areas.

#### Acceptance Criteria

1. WHEN calculating micromarket data THEN the Property Insights System SHALL group properties by suburbId within each city
2. WHEN selecting micromarkets to display THEN the Property Insights System SHALL return the top 4 suburbs by listing count
3. WHEN calculating suburb price per m² THEN the Property Insights System SHALL compute the average price per m² for properties in that suburb
4. WHEN displaying micromarket bars THEN the frontend SHALL scale bar widths relative to the highest price per m² among displayed suburbs
5. WHEN a city has fewer than 4 suburbs with data THEN the Property Insights System SHALL return all available suburbs

### Requirement 6

**User Story:** As a home page visitor, I want to switch between different cities using tabs, so that I can explore price insights for multiple locations.

#### Acceptance Criteria

1. WHEN the Property Insights section loads THEN the frontend SHALL display tabs for cities that have at least 10 active listings
2. WHEN a user clicks a city tab THEN the frontend SHALL display that city's statistics without reloading the page
3. WHEN switching tabs THEN the frontend SHALL maintain smooth transitions and update all four insight cards
4. WHEN the initial page loads THEN the frontend SHALL default to the city with the most listings
5. WHEN tab data is already loaded THEN the frontend SHALL not refetch data from the server

### Requirement 7

**User Story:** As a system administrator, I want price insights to update automatically when new listings are added, so that the data remains current without manual intervention.

#### Acceptance Criteria

1. WHEN a new property is created with status 'published' or 'available' THEN the Property Insights System SHALL include it in calculations after cache expiry
2. WHEN a property status changes to 'sold' or 'archived' THEN the Property Insights System SHALL exclude it from active listing calculations after cache expiry
3. WHEN the cache expires (after 15 minutes) THEN the Property Insights System SHALL recalculate all statistics from current database state
4. WHEN multiple requests arrive simultaneously THEN the Property Insights System SHALL prevent duplicate calculations using cache locking
5. WHEN database queries execute THEN the Property Insights System SHALL use indexed fields (city, status, price) for optimal performance

### Requirement 8

**User Story:** As a developer, I want a dedicated API endpoint for price insights, so that the frontend can fetch data efficiently and the logic is reusable.

#### Acceptance Criteria

1. WHEN the frontend requests price insights THEN the backend SHALL expose a GET endpoint at /api/price-insights
2. WHEN the endpoint receives a request THEN the backend SHALL return data for all cities with sufficient listings in a single response
3. WHEN the endpoint processes a request THEN the backend SHALL complete within 2 seconds for cached data
4. WHEN the endpoint encounters an error THEN the backend SHALL return appropriate HTTP status codes (500 for server errors, 404 if no data)
5. WHEN the response is sent THEN the backend SHALL include cache headers indicating 15-minute freshness

### Requirement 9

**User Story:** As a home page visitor, I want the price insights section to load quickly, so that I don't experience delays when viewing the home page.

#### Acceptance Criteria

1. WHEN the home page loads THEN the Property Insights component SHALL display loading skeletons while fetching data
2. WHEN data fetching takes longer than 500ms THEN the frontend SHALL continue showing loading indicators
3. WHEN data fetching fails THEN the frontend SHALL display an error message with a retry button
4. WHEN the retry button is clicked THEN the frontend SHALL attempt to refetch the data
5. WHEN data loads successfully THEN the frontend SHALL animate the transition from loading state to content

### Requirement 10

**User Story:** As a property developer, I want to see market activity metrics including total listings and median prices, so that I can assess market opportunities in different cities.

#### Acceptance Criteria

1. WHEN displaying market activity THEN the frontend SHALL show three metrics: Active Listings, Avg. Price/m², and Median Price
2. WHEN calculating active listings THEN the Property Insights System SHALL count properties with status in ['available', 'published', 'pending']
3. WHEN displaying metrics THEN the frontend SHALL use consistent formatting with icons and labels
4. WHEN metrics are unavailable THEN the frontend SHALL display "N/A" or zero values with appropriate styling
5. WHEN the user hovers over metric cards THEN the frontend SHALL provide subtle visual feedback
