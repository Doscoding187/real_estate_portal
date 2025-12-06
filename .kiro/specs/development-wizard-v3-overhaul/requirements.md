# Development Wizard V3 - Professional Overhaul

## Introduction

This specification defines a complete overhaul of the development listing wizard, transforming it from a 5-step process into a streamlined, professional-grade 6-step flow that matches industry standards of platforms like Property24, Private Property, and BuildiumRealPage.

## Glossary

- **Development**: A property development project (residential, commercial, or land)
- **Phase**: A sub-development within a master development (e.g., Phase 2 of Waterfall Estate)
- **Unit Type**: A specific configuration of units within a development (e.g., "2 Bedroom Apartment")
- **Property Type**: The category of property (Residential, Commercial, Land/Plots)
- **Ownership Type**: Legal ownership structure (Freehold, Sectional Title, Leasehold)
- **Specifications**: Detailed finishes and features (bathroom, kitchen, interior, exterior)
- **Development-Level Media**: Photos/videos representing the entire development
- **Unit-Level Media**: Photos/videos specific to individual unit types

## Requirements

### Requirement 1: Development Type Selection

**User Story:** As a property developer, I want to specify whether I'm creating a new development or adding a phase to an existing one, so that the system can guide me through the appropriate workflow.

#### Acceptance Criteria

1. WHEN the wizard loads THEN the system SHALL display two large, visually distinct card options: "New Development" and "New Phase"
2. WHEN the user selects "New Development" THEN the system SHALL proceed to Step 2 (Property Type Selection)
3. WHEN the user selects "New Phase" THEN the system SHALL display a searchable dropdown of existing developments owned by the developer
4. WHEN the user selects a parent development THEN the system SHALL pre-populate inherited fields (location, amenities, developer info) and proceed to Step 2
5. WHEN no parent development is selected for a phase THEN the system SHALL prevent progression to the next step

### Requirement 2: Property Type Selection

**User Story:** As a property developer, I want to specify the type of property I'm developing, so that the system shows me only relevant configuration options.

#### Acceptance Criteria

1. WHEN Step 2 loads THEN the system SHALL display three large card options with icons: "Residential", "Commercial", and "Land/Plots"
2. WHEN the user selects "Residential" THEN the system SHALL enable residential-specific fields (bedrooms, bathrooms, yard size) in subsequent steps
3. WHEN the user selects "Commercial" THEN the system SHALL enable commercial-specific fields (office suites, retail bays, floor area) in subsequent steps
4. WHEN the user selects "Land/Plots" THEN the system SHALL enable land-specific fields (plot size, zoning, services) in subsequent steps
5. WHEN a property type is selected THEN the system SHALL store the selection and proceed to Step 3

### Requirement 3: Unit Types & Configurations

**User Story:** As a property developer, I want to define all available unit types with their specifications, media, and optional upgrades, so that buyers can see detailed information about each unit configuration.

#### Acceptance Criteria

1. WHEN Step 3 loads THEN the system SHALL display an "Add Unit Type" button and a list of existing unit types
2. WHEN the user clicks "Add Unit Type" THEN the system SHALL open a modal with 5 organized tabs: Identification, Configuration, Specifications, Media, and Extras
3. WHEN in the Identification tab THEN the system SHALL require Display Name and Internal Code fields
4. WHEN in the Configuration tab THEN the system SHALL require Bedrooms, Bathrooms, Floor Size, and Price Range fields
5. WHEN in the Configuration tab for residential properties THEN the system SHALL show optional Yard Size field
6. WHEN in the Specifications tab THEN the system SHALL display expandable sections for Bathroom Specs, Kitchen Specs, Interior Specs, and Exterior Specs
7. WHEN in the Media tab THEN the system SHALL allow uploads organized by: Interior Images, Exterior Images, Floor Plans, Videos/Virtual Tours, and 3D Renders
8. WHEN in the Extras tab THEN the system SHALL allow definition of optional upgrade packages (e.g., "Premium Kitchen", "Smart Home Package")
9. WHEN the user saves a unit type THEN the system SHALL validate required fields and add it to the unit types list
10. WHEN the user clicks "Duplicate Unit Type" THEN the system SHALL create a copy with "(Copy)" appended to the name
11. WHEN at least one unit type is configured THEN the system SHALL allow progression to Step 4

### Requirement 4: Development Details & Amenities

**User Story:** As a property developer, I want to provide high-level development information, location, amenities, and highlights, so that buyers understand the overall development offering.

#### Acceptance Criteria

1. WHEN Step 4 loads THEN the system SHALL display sections for Development Information, Location, Amenities, and Highlights
2. WHEN in Development Information THEN the system SHALL require Development Name and Status fields
3. WHEN in Development Information THEN the system SHALL require Ownership Type selection (Freehold, Sectional Title, Leasehold)
4. WHEN in Location section THEN the system SHALL display an interactive map with pin-drop functionality
5. WHEN the user drops a pin on the map THEN the system SHALL auto-populate address fields via reverse geocoding
6. WHEN in Amenities section THEN the system SHALL display categorized checkboxes for: Security, Recreation, Family, Utilities, and Building features
7. WHEN in Highlights section THEN the system SHALL allow up to 5 custom highlights (e.g., "Close to schools", "Pet-friendly")
8. WHEN all required fields are completed THEN the system SHALL allow progression to Step 5

### Requirement 5: Development Media

**User Story:** As a property developer, I want to upload and organize all development-level media, so that buyers can visualize the overall development environment.

#### Acceptance Criteria

1. WHEN Step 5 loads THEN the system SHALL display organized upload zones for: Featured Image, Exterior, Interior, Amenities, Floor Plans, and Videos
2. WHEN uploading Featured Image THEN the system SHALL require exactly one high-resolution hero image
3. WHEN uploading to Exterior category THEN the system SHALL accept multiple images showing building facades, landscaping, and outdoor spaces
4. WHEN uploading to Interior category THEN the system SHALL accept multiple images showing common areas, lobbies, and shared spaces
5. WHEN uploading to Amenities category THEN the system SHALL accept images of pool, gym, clubhouse, and other facilities
6. WHEN uploading Floor Plans THEN the system SHALL accept PDF and high-resolution image files
7. WHEN uploading Videos THEN the system SHALL accept promotional videos, walkthroughs, and drone footage
8. WHEN files exceed size limits THEN the system SHALL display clear error messages with recommended dimensions and file sizes
9. WHEN media is uploaded THEN the system SHALL display thumbnails with drag-to-reorder functionality
10. WHEN at least a Featured Image is uploaded THEN the system SHALL allow progression to Step 6

### Requirement 6: Contact Information & Final Preview

**User Story:** As a property developer, I want to provide contact information and review all entered data before submission, so that I can ensure accuracy and provide buyers with correct contact details.

#### Acceptance Criteria

1. WHEN Step 6 loads THEN the system SHALL display sections for Contact Information and Comprehensive Review
2. WHEN in Contact Information THEN the system SHALL allow adding multiple contact persons with Name, Role, Phone, and Email fields
3. WHEN in Contact Information THEN the system SHALL require at least one contact person
4. WHEN in Comprehensive Review THEN the system SHALL display a summary of all steps with expandable sections
5. WHEN in Comprehensive Review THEN the system SHALL provide "Quick Edit" links to jump back to specific steps
6. WHEN the user clicks "Quick Edit" THEN the system SHALL navigate to that step while preserving all entered data
7. WHEN all required data is complete THEN the system SHALL enable the "Submit Development" button
8. WHEN the user clicks "Submit Development" THEN the system SHALL validate all steps and submit to the backend
9. WHEN submission is successful THEN the system SHALL display a success message and redirect to the development dashboard
10. WHEN submission fails THEN the system SHALL display specific error messages and highlight problematic fields

### Requirement 7: Progressive Disclosure & Conditional Logic

**User Story:** As a property developer, I want to see only relevant fields based on my selections, so that the wizard feels streamlined and not overwhelming.

#### Acceptance Criteria

1. WHEN property type is "Residential" THEN the system SHALL show bedroom, bathroom, and yard size fields
2. WHEN property type is "Commercial" THEN the system SHALL show office suite, retail bay, and floor area fields
3. WHEN property type is "Land/Plots" THEN the system SHALL show plot size, zoning, and services fields
4. WHEN development type is "Phase" THEN the system SHALL pre-populate location and amenities from parent development
5. WHEN ownership type is "Sectional Title" THEN the system SHALL show levy-related fields

### Requirement 8: Data Persistence & Draft Management

**User Story:** As a property developer, I want my progress to be automatically saved, so that I don't lose data if I navigate away or my session expires.

#### Acceptance Criteria

1. WHEN the user makes changes THEN the system SHALL auto-save to local storage every 3 seconds
2. WHEN the user returns to the wizard THEN the system SHALL offer to resume from the last saved draft
3. WHEN the user chooses "Resume Draft" THEN the system SHALL restore all data and navigate to the last active step
4. WHEN the user chooses "Start Fresh" THEN the system SHALL clear all data and start from Step 1
5. WHEN the user explicitly saves a draft THEN the system SHALL save to the database with progress percentage

### Requirement 9: Validation & Error Handling

**User Story:** As a property developer, I want clear validation messages and error handling, so that I know exactly what needs to be corrected.

#### Acceptance Criteria

1. WHEN required fields are empty THEN the system SHALL display inline error messages
2. WHEN the user attempts to proceed with invalid data THEN the system SHALL prevent progression and highlight errors
3. WHEN file uploads fail THEN the system SHALL display specific error messages (size, format, network)
4. WHEN the backend returns errors THEN the system SHALL parse and display user-friendly messages
5. WHEN validation passes THEN the system SHALL remove error messages and allow progression

### Requirement 10: Accessibility & Responsive Design

**User Story:** As a property developer using various devices, I want the wizard to work seamlessly on desktop, tablet, and mobile, so that I can work from anywhere.

#### Acceptance Criteria

1. WHEN viewed on desktop THEN the system SHALL display full-width layouts with side-by-side sections
2. WHEN viewed on tablet THEN the system SHALL stack sections vertically while maintaining readability
3. WHEN viewed on mobile THEN the system SHALL use single-column layouts with touch-optimized controls
4. WHEN using keyboard navigation THEN the system SHALL support tab order and enter/space key interactions
5. WHEN using screen readers THEN the system SHALL provide appropriate ARIA labels and descriptions
