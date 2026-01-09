# Requirements Document: Listing Wizard & Prospect Dashboard Polish

## Introduction

This specification defines the requirements for polishing and enhancing three critical features of the SA Property Portal:

1. **Listing Wizard** - Multi-step form for creating individual property listings (8 steps)
2. **Development Wizard** - Multi-step form for creating property development projects (6 steps)
3. **Prospect Dashboard** - Gamified buyability calculator for property browsers

All three features are currently functional but require refinement to improve user experience, validation, error handling, and overall polish. The two wizards share common patterns (validation, media upload, draft management) but serve different purposes and have distinct data models.

## Glossary

- **Listing Wizard**: A multi-step form interface (8 steps) that guides users (agents, property owners) through creating individual property listings (houses, apartments, commercial properties)
- **Development Wizard**: A multi-step form interface (6 steps) that guides property developers through creating development project listings (estates, complexes, residential projects)
- **Prospect Dashboard**: A sliding panel interface that helps anonymous users calculate their property affordability and receive personalized recommendations
- **Buyability Score**: A calculated metric (low/medium/high) indicating a prospect's ability to purchase property
- **Draft Persistence**: The ability to save incomplete forms and resume later
- **Media Upload**: The process of uploading images, videos, and documents for property listings
- **Validation**: Real-time checking of form inputs to ensure data quality
- **Step Navigation**: The ability to move between different sections of a multi-step form

## Requirements

### Requirement 1: Enhanced Listing Wizard Validation

**User Story:** As a property owner or agent, I want clear, real-time validation feedback when creating listings, so that I can fix errors immediately and submit high-quality listings.

#### Acceptance Criteria

1. WHEN a user enters invalid data in any field THEN the system SHALL display an inline error message below the field within 500ms
2. WHEN a user attempts to proceed to the next step with incomplete required fields THEN the system SHALL prevent navigation and highlight all missing fields
3. WHEN a user corrects an invalid field THEN the system SHALL remove the error message immediately
4. WHEN a user uploads media that exceeds size limits THEN the system SHALL display a clear error message with the file size limit
5. WHEN a user enters a property title less than 10 characters THEN the system SHALL display "Title must be at least 10 characters"

### Requirement 2: Improved Draft Management

**User Story:** As a user creating a listing, I want my progress automatically saved, so that I don't lose my work if I close the browser or navigate away.

#### Acceptance Criteria

1. WHEN a user completes any field in the wizard THEN the system SHALL auto-save the draft to local storage within 2 seconds
2. WHEN a user returns to the listing wizard with an existing draft THEN the system SHALL display a dialog asking "Resume draft or start fresh?"
3. WHEN a user clicks "Save Draft" button THEN the system SHALL show a success message "Draft saved" for 2 seconds
4. WHEN a user submits a listing successfully THEN the system SHALL clear the draft from storage
5. WHEN a user starts a new listing after submission THEN the system SHALL not show the resume draft dialog

### Requirement 3: Media Upload Enhancement

**User Story:** As a user uploading property media, I want drag-and-drop functionality, progress indicators, and easy reordering, so that I can efficiently manage my listing images and videos.

#### Acceptance Criteria

1. WHEN a user drags files over the upload area THEN the system SHALL highlight the drop zone with a blue border
2. WHEN a user uploads multiple files THEN the system SHALL display individual progress bars for each file
3. WHEN a user drags a media thumbnail THEN the system SHALL allow reordering with visual feedback
4. WHEN a user sets a primary image THEN the system SHALL display a "Primary" badge on that image
5. WHEN a user uploads a video THEN the system SHALL display a video icon overlay on the thumbnail
6. WHEN a user uploads more than 30 images THEN the system SHALL prevent upload and display "Maximum 30 images allowed"

### Requirement 4: Prospect Dashboard UX Improvements

**User Story:** As a property browser, I want a smooth, intuitive experience when using the buyability calculator, so that I can quickly understand my affordability without confusion.

#### Acceptance Criteria

1. WHEN a user opens the prospect dashboard THEN the system SHALL slide in from the right within 300ms with smooth animation
2. WHEN a user completes a form step THEN the system SHALL automatically calculate buyability within 1 second
3. WHEN a user's buyability score changes THEN the system SHALL animate the score badge with a color transition
4. WHEN a user has a high buyability score THEN the system SHALL display recommendations matching their affordability range
5. WHEN a user collapses the dashboard THEN the system SHALL minimize to a floating button showing their score

### Requirement 5: Step Navigation Enhancement

**User Story:** As a user filling out the listing wizard, I want clear visual indicators of my progress and the ability to jump to completed steps, so that I can easily review and edit my information.

#### Acceptance Criteria

1. WHEN a user completes a step THEN the system SHALL mark it with a green checkmark in the progress indicator
2. WHEN a user is on a specific step THEN the system SHALL highlight that step with a blue ring
3. WHEN a user clicks on a completed step THEN the system SHALL navigate to that step immediately
4. WHEN a user clicks on an incomplete future step THEN the system SHALL not navigate and show a tooltip "Complete previous steps first"
5. WHEN a user reaches the final preview step THEN the system SHALL display a summary of all entered information

### Requirement 6: Error Recovery and Feedback

**User Story:** As a user experiencing errors, I want clear explanations and recovery options, so that I can successfully complete my task without frustration.

#### Acceptance Criteria

1. WHEN a network error occurs during submission THEN the system SHALL display "Connection lost. Your draft has been saved. Please try again."
2. WHEN a server validation error occurs THEN the system SHALL display the specific field errors returned from the API
3. WHEN a user's session expires THEN the system SHALL prompt them to log in again without losing their draft
4. WHEN a file upload fails THEN the system SHALL display a retry button next to the failed file
5. WHEN a user submits invalid pricing data THEN the system SHALL highlight the pricing step in red and show specific errors

### Requirement 7: Prospect Dashboard Data Persistence

**User Story:** As a prospect using the buyability calculator, I want my information saved across sessions, so that I don't have to re-enter my details every time I visit.

#### Acceptance Criteria

1. WHEN a prospect enters their email THEN the system SHALL save their session ID linked to that email
2. WHEN a prospect returns to the site THEN the system SHALL load their previous financial information
3. WHEN a prospect updates their information THEN the system SHALL recalculate buyability immediately
4. WHEN a prospect favorites a property THEN the system SHALL save it to their session
5. WHEN a prospect views a property THEN the system SHALL add it to their "Recently Viewed" list

### Requirement 8: Mobile Responsiveness

**User Story:** As a mobile user, I want both the listing wizard and prospect dashboard to work seamlessly on my phone, so that I can create listings and check affordability on the go.

#### Acceptance Criteria

1. WHEN a mobile user opens the listing wizard THEN the system SHALL display a single-column layout with touch-friendly buttons
2. WHEN a mobile user opens the prospect dashboard THEN the system SHALL occupy the full screen width
3. WHEN a mobile user uploads media THEN the system SHALL allow camera access for direct photo capture
4. WHEN a mobile user navigates steps THEN the system SHALL use swipe gestures for next/previous
5. WHEN a mobile user views the progress indicator THEN the system SHALL display a compact version with step numbers only

### Requirement 9: Accessibility Compliance

**User Story:** As a user with accessibility needs, I want keyboard navigation and screen reader support, so that I can use the listing wizard and prospect dashboard independently.

#### Acceptance Criteria

1. WHEN a user presses Tab THEN the system SHALL move focus to the next interactive element in logical order
2. WHEN a user presses Enter on a step indicator THEN the system SHALL navigate to that step if allowed
3. WHEN a screen reader user focuses on an error message THEN the system SHALL announce the error text
4. WHEN a user navigates with keyboard THEN the system SHALL display visible focus indicators on all interactive elements
5. WHEN a user uses high contrast mode THEN the system SHALL maintain readable text and clear boundaries

### Requirement 10: Development Wizard Enhancements

**User Story:** As a property developer, I want a streamlined wizard for creating development listings with unit types and project details, so that I can showcase my projects effectively.

#### Acceptance Criteria

1. WHEN a developer adds a unit type THEN the system SHALL validate that bedrooms, price, and available units are provided
2. WHEN a developer sets a completion date THEN the system SHALL validate it is a future date
3. WHEN a developer uploads project media THEN the system SHALL allow categorization (featured, amenities, outdoors, videos)
4. WHEN a developer enters contact details THEN the system SHALL validate email format and phone number format
5. WHEN a developer previews the listing THEN the system SHALL display all unit types with pricing in a summary table

### Requirement 11: Shared Wizard Patterns

**User Story:** As a user of either wizard, I want consistent behavior and UI patterns, so that I can easily switch between creating properties and developments.

#### Acceptance Criteria

1. WHEN a user navigates steps in either wizard THEN the system SHALL use the same progress indicator design
2. WHEN a user uploads media in either wizard THEN the system SHALL use the same drag-and-drop interface
3. WHEN a user saves a draft in either wizard THEN the system SHALL use the same auto-save mechanism
4. WHEN a user encounters an error in either wizard THEN the system SHALL display errors in the same format
5. WHEN a user completes either wizard THEN the system SHALL show a success message and redirect appropriately

### Requirement 12: Performance Optimization

**User Story:** As a user on a slow connection, I want fast load times and responsive interactions, so that I can complete my tasks efficiently.

#### Acceptance Criteria

1. WHEN a user loads either wizard THEN the system SHALL display the first step within 1 second
2. WHEN a user uploads an image THEN the system SHALL compress it client-side before uploading
3. WHEN a user navigates between steps THEN the system SHALL transition within 200ms
4. WHEN a user calculates buyability THEN the system SHALL return results within 500ms
5. WHEN a user has a slow connection THEN the system SHALL show loading indicators for operations taking longer than 1 second

### Requirement 13: Show House Location Pin and Reverse Geocoding

**User Story:** As a property developer creating a new development listing, I want to drop a pin on a map to mark the show house location, so that the system can automatically populate the street address, suburb, city, and province - especially for large developments where street names may not yet exist in mapping systems.

#### Acceptance Criteria

1. WHEN a developer views the Location Details section THEN the system SHALL display an interactive map centered on South Africa
2. WHEN a developer clicks on the map THEN the system SHALL place a draggable pin marker at that location
3. WHEN a developer drops a pin on the map THEN the system SHALL perform reverse geocoding within 2 seconds to retrieve the address
4. WHEN reverse geocoding completes successfully THEN the system SHALL auto-populate the street address, suburb, city, and province fields
5. WHEN a developer drags the pin to a new location THEN the system SHALL update the address fields with the new location data
6. WHEN reverse geocoding fails or returns incomplete data THEN the system SHALL allow manual entry of address fields
7. WHEN a developer has manually entered address data THEN the system SHALL preserve that data and not override it unless the pin is moved again
8. WHEN a developer saves a development with a pin location THEN the system SHALL store the latitude and longitude coordinates
9. WHEN a developer returns to edit a development with saved coordinates THEN the system SHALL display the map with the pin at the saved location
10. WHEN the map loads THEN the system SHALL include zoom controls and a search box for finding specific locations

### Requirement 14: Remove Redundant Security Features Section

**User Story:** As a user creating a property listing, I want security features to be managed through the amenities section only, so that I don't have to enter the same information twice and the interface is simpler.

#### Acceptance Criteria

1. WHEN a user reaches the Additional Information step THEN the system SHALL NOT display a separate "Security Features" section
2. WHEN a user selects amenities THEN the system SHALL include security-related options (Alarm System, Electric Fence, CCTV, 24hr Security, Access Control, Security Gates) in the amenities list
3. WHEN a user selects a security amenity THEN the system SHALL store it in the same way as other amenities
4. WHEN a user views property filters THEN the system SHALL allow filtering by security amenities using the existing "Security" filter
5. WHEN a user views a property listing THEN the system SHALL display security amenities alongside other amenities in the features section
6. WHEN migrating existing listings THEN the system SHALL map any existing security features to the corresponding amenities
7. WHEN a user edits an existing listing with security features THEN the system SHALL display those features as selected amenities
8. WHEN a user creates a residential development THEN the system SHALL continue to use the existing security features configuration (this change applies to individual listings only)
