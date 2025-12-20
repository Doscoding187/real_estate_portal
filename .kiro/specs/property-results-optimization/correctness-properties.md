# Correctness Properties

Based on the prework analysis, here are the testable correctness properties for the property results optimization:

## Filter and Sort Properties

**Property 1: Quick filter application**
*For any* quick filter preset (Pet-Friendly, Fibre Ready, Sectional Title, Under R2M), applying it should set the correct combination of filter values
**Validates: Requirements 2.2**

**Property 2: Sort order correctness**
*For any* list of properties and any sort option (price_asc, price_desc, date_desc, suburb_asc), the resulting list should be properly sorted according to that criterion
**Validates: Requirements 2.3**

**Property 3: URL filter synchronization**
*For any* filter state, the URL parameters should accurately represent those filters
**Validates: Requirements 2.4**

**Property 4: Filter state round-trip**
*For any* filter state, converting to URL parameters and back should preserve the exact filter state
**Validates: Requirements 2.5**

## View Mode and State Properties

**Property 5: Map marker completeness**
*For any* set of visible properties in map view, all properties should have corresponding map markers
**Validates: Requirements 3.2**

**Property 6: View mode filter preservation**
*For any* view mode switch (list ↔ grid ↔ map), the active filters should remain unchanged
**Validates: Requirements 3.4**

## Saved Search Properties

**Property 7: Saved search filter preservation**
*For any* filter state that is saved, the saved search should contain the exact same filter criteria
**Validates: Requirements 4.1**

**Property 8: Saved search restoration**
*For any* saved search, loading it should restore the exact filter state that was saved
**Validates: Requirements 4.3**

**Property 9: Comparison bar completeness**
*For any* set of properties added to comparison, all selected properties should appear in the comparison bar
**Validates: Requirements 4.5**

## Property Display Properties

**Property 10: Required field display**
*For any* property card, it should display price, suburb, bedrooms, bathrooms, and erf/floor size
**Validates: Requirements 5.1**

**Property 11: Feature badge mapping**
*For any* property with special features (Fibre, Solar, Pet-Friendly), corresponding badges should be displayed
**Validates: Requirements 5.2**

**Property 12: Media count display**
*For any* property with images or videos, the image and video counts should be displayed
**Validates: Requirements 5.3**

**Property 13: Status badge display**
*For any* property that is new (< 7 days) or price-reduced, appropriate status badges should be displayed
**Validates: Requirements 5.5**

## Pagination Properties

**Property 14: Pagination info accuracy**
*For any* result set, the displayed page number and total pages should accurately reflect the data
**Validates: Requirements 6.1**

**Property 15: Page jump navigation**
*For any* valid page number, clicking it should navigate to that page and display the correct results
**Validates: Requirements 6.3**

## Result Count Properties

**Property 16: Result count accuracy**
*For any* applied filters, the displayed total count should match the actual number of matching properties
**Validates: Requirements 7.1**

**Property 17: Filter preview count accuracy**
*For any* filter that hasn't been applied yet, the preview count should match the actual count if that filter were applied
**Validates: Requirements 7.3**

**Property 18: Result range display**
*For any* page of results, the "Showing X-Y of Z" text should accurately reflect the current page range
**Validates: Requirements 7.4**

## Mobile Properties

**Property 19: Touch target size compliance**
*For any* interactive element on mobile viewport, the touch target size should be at least 44x44 pixels
**Validates: Requirements 8.3**

## Agent Contact Properties

**Property 20: Agent info display**
*For any* property with an assigned agent, the agent or agency information should be displayed on the property card
**Validates: Requirements 9.1**

**Property 21: Contact form property details**
*For any* property, submitting the contact form should include the property ID, title, and price in the inquiry
**Validates: Requirements 9.3**

## SEO Properties

**Property 22: Structured data presence**
*For any* search results page, structured data (JSON-LD) for property listings should be present in the HTML
**Validates: Requirements 10.1**

**Property 23: SEO meta title generation**
*For any* filter combination, the generated meta title should include key filter criteria (bedrooms, property type, location, price range)
**Validates: Requirements 10.2**

**Property 24: Open Graph tags**
*For any* results page, Open Graph tags (og:title, og:description, og:image) should be present
**Validates: Requirements 10.3**

**Property 25: Canonical URL correctness**
*For any* results page, the canonical URL should point to the normalized version of the current URL
**Validates: Requirements 10.5**

## Analytics Properties

**Property 26: Search tracking completeness**
*For any* search performed, an analytics event should be fired with province, city, suburb, and result count
**Validates: Requirements 11.1**

**Property 27: Filter analytics tracking**
*For any* filter change, an analytics event should be logged with the filter combination
**Validates: Requirements 11.2**

**Property 28: Click position tracking**
*For any* property click, the analytics event should include the property's position in the search results
**Validates: Requirements 11.3**

**Property 29: Saved search pattern tracking**
*For any* saved search, an analytics event should record the region and price range
**Validates: Requirements 11.4**

**Property 30: Conversion tracking**
*For any* agent contact, an analytics event should track the property type and location
**Validates: Requirements 11.5**

## Similar Properties Properties

**Property 31: Similar action presence**
*For any* property card, a "View Similar" action should be available
**Validates: Requirements 12.1**

**Property 32: Similar property matching**
*For any* property, similar properties should match key characteristics (property type, price range ±20%, same suburb or adjacent suburbs, similar bedrooms)
**Validates: Requirements 12.2**

**Property 33: Similar attribute highlighting**
*For any* similar property, matching attributes (same property type, similar price, same bedrooms) should be visually highlighted
**Validates: Requirements 12.3**

## Availability Status Properties

**Property 34: Status display**
*For any* property, the availability status (Available, Under Offer, Sold, Let) should be displayed
**Validates: Requirements 13.1**

**Property 35: Sold/Let badge with date**
*For any* property with status "sold" or "let", a badge with the status and date should be displayed
**Validates: Requirements 13.2**

**Property 36: Under offer status**
*For any* property with status "under_offer", an "Under Offer" badge should be displayed
**Validates: Requirements 13.3**

**Property 37: Status filtering**
*For any* status filter applied, only properties matching that status should be displayed
**Validates: Requirements 13.4**

**Property 38: Status change notification**
*For any* property status change, users with saved searches matching that property should be notified
**Validates: Requirements 13.5**

## Keyboard Navigation Properties

**Property 39: Tab navigation completeness**
*For any* page, pressing Tab should cycle through all interactive elements in logical order
**Validates: Requirements 14.1**

**Property 40: Escape key modal closing**
*For any* open modal or panel, pressing Escape should close it
**Validates: Requirements 14.4**

**Property 41: Focus indicator visibility**
*For any* focused element, a visible focus indicator should be present
**Validates: Requirements 14.5**

## Error Handling Properties

**Property 42: User-friendly error messages**
*For any* error that occurs, the displayed error message should be user-friendly (no technical jargon, suggests action)
**Validates: Requirements 15.4**

## South African Property Features

**Property 43: Title type display**
*For any* property, the title type (Freehold or Sectional Title) should be displayed
**Validates: Requirements 16.1**

**Property 44: Levy display**
*For any* property with a levy > 0, the monthly levy amount should be displayed
**Validates: Requirements 16.2**

**Property 45: Security estate badge**
*For any* property where securityEstate = true, a "Security Estate" badge should be displayed
**Validates: Requirements 16.3**

**Property 46: Load-shedding solution badges**
*For any* property with load-shedding solutions, corresponding badges (Solar, Generator, Inverter) should be displayed
**Validates: Requirements 16.4**

**Property 47: SA-specific filter application**
*For any* SA-specific filter (Fibre Ready, Pet-Friendly, Security Estate, Load-Shedding Solutions), only properties matching that criteria should be displayed
**Validates: Requirements 16.5**
