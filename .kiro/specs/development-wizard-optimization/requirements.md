# Requirements Document

## Introduction

This specification defines the comprehensive Developer Listing Wizard for the real estate marketplace platform. The wizard enables property developers to create detailed listings for residential developments with multiple unit types, spec variations, and complete project information. The system implements a clean, scalable 5-step process with progressive disclosure, specification inheritance, and industry-standard data organization.

**Wizard Flow:**
- **Step 1:** Development Details (name, location, amenities, highlights, development media)
- **Step 2:** Unit Types & Configurations (with amenities, specifications & finishes, and media per unit type)
- **Step 3:** Phase Details & Infrastructure (development-level only, no unit-specific fields)
- **Step 4:** Review & Publish

## Glossary

- **Development**: A residential property development project with multiple unit types
- **Development Wizard**: 5-step form interface for creating development listings
- **Unit Type**: A category of units with shared characteristics (e.g., "2 Bed, 1 Bath")
- **Spec Variation**: A specific configuration within a unit type (e.g., "Standard Spec", "GAP Spec", "Premium Spec")
- **Base Features**: Default specifications that apply to all specs within a unit type
- **Specification Inheritance**: System where unit specs inherit from development-level settings unless overridden
- **Development Amenities**: Shared facilities available to all residents (pools, clubhouse, etc.)
- **Estate-Level Features**: Infrastructure and specifications that apply to the entire development
- **Upgrade Pack**: Optional add-on features available for purchase
- **Progressive Disclosure**: UX pattern that reveals complexity only when needed

## Requirements

### Requirement 1: Development Details Step

**User Story:** As a property developer, I want to provide comprehensive development information in an organized format, so that potential buyers understand the project scope and location.

#### Acceptance Criteria

1. WHEN entering development details THEN the system SHALL display fields for name, status, expected completion date, and description
2. WHEN selecting development status THEN the system SHALL provide badge options including "Now Selling", "Launching Soon", "Under Construction", "Ready to Move", "Sold Out", "Phase Completed", and "New Phase Launching"
3. WHEN entering development name THEN the system SHALL require minimum 5 characters
4. THE system SHALL auto-fill developer name from the authenticated user's account as read-only
5. THE system SHALL display rating as read-only with explanation "Rating is automatically calculated by the system"

### Requirement 2: Location Input

**User Story:** As a property developer, I want to specify my development's location using an interactive map with pin-drop functionality, so that I can provide accurate geolocation data.

#### Acceptance Criteria

1. WHEN the location section loads THEN the system SHALL display an interactive drop-pin map as the primary input method
2. WHEN the user drops a pin on the map THEN the system SHALL capture latitude and longitude coordinates
3. WHEN coordinates are captured THEN the system SHALL perform reverse geocoding to populate province, city, and suburb fields
4. WHEN reverse geocoding succeeds THEN the system SHALL set GPS accuracy to "accurate"
5. WHEN reverse geocoding provides approximate results THEN the system SHALL set GPS accuracy to "approximate"
6. THE system SHALL allow manual address field entry as an optional override
7. WHEN the user enables "No official street yet" toggle THEN the system SHALL skip street validation

### Requirement 3: Development Amenities

**User Story:** As a property developer, I want to specify shared amenities available to all residents, so that buyers understand the lifestyle offerings of the development.

#### Acceptance Criteria

1. WHEN adding development amenities THEN the system SHALL provide selectable options including Swimming Pool, Clubhouse, Jogging Trails, Parks, Braai Areas, Security Features, and Fibre Ready
2. WHEN selecting amenities THEN the system SHALL allow multiple selections
3. THE system SHALL display selected amenities as badges or checkboxes
4. THE system SHALL store amenities as an array in the database
5. THE system SHALL distinguish between development amenities and unit-specific features

### Requirement 4: Development Highlights

**User Story:** As a property developer, I want to add key selling points that differentiate my development, so that potential buyers quickly understand unique value propositions.

#### Acceptance Criteria

1. WHEN adding development highlights THEN the system SHALL allow up to 5 free-form text entries
2. WHEN entering highlights THEN the system SHALL provide examples like "2 min from schools", "Close to Mall of the South"
3. THE system SHALL display a counter showing "X/5" for highlights
4. WHEN the limit is reached THEN the system SHALL disable the add button
5. THE system SHALL allow removing and editing existing highlights

### Requirement 5: Unit Types Management

**User Story:** As a property developer, I want to define multiple unit types with detailed configurations including amenities and specifications, so that buyers can understand the different options available in my development.

#### Acceptance Criteria

1. WHEN viewing the unit types step THEN the system SHALL display a card-based list of configured unit types
2. WHEN adding a new unit type THEN the system SHALL open a modal with four tabs: Base Configuration, Amenities, Specifications & Finishes, and Media
3. WHEN no unit types exist THEN the system SHALL display an empty state with a clear call-to-action to add the first unit type
4. THE system SHALL allow adding, editing, duplicating, and deleting unit types
5. WHEN duplicating a unit type THEN the system SHALL create a copy with "(Copy)" appended to the name

### Requirement 6: Unit Type Base Configuration

**User Story:** As a property developer, I want to define default specifications for each unit type, so that I establish a template for all variations within that type.

#### Acceptance Criteria

1. WHEN entering base configuration THEN the system SHALL require unit type name, bedrooms, bathrooms, parking allocation, size, and base price range
2. WHEN entering unit type name THEN the system SHALL accept descriptive names like "2 Bedroom Apartment", "60m² Simplex", or "Bachelor Studio"
3. WHEN uploading base media THEN the system SHALL accept Unit Type Gallery images, Floor Plans, and Renders/Videos
4. THE system SHALL apply base configuration to all specs within the unit type unless overridden
5. THE system SHALL store only unit-level information without development-wide specifications

### Requirement 6A: Unit Type Amenities

**User Story:** As a property developer, I want to specify amenities at both the development level and per unit type, so that buyers understand which features are standard across all units and which are specific to certain unit types.

#### Acceptance Criteria

1. WHEN configuring unit type amenities THEN the system SHALL display two sections: Standard Amenities and Additional Amenities
2. WHEN viewing Standard Amenities THEN the system SHALL show all development-wide amenities as read-only checkboxes with visual indication that they apply to all units
3. WHEN adding Additional Amenities THEN the system SHALL provide selectable options specific to the unit type including Built-in Wardrobes, Balcony, Pet-Friendly, Garden, Study Room, and En-suite Bathroom
4. WHEN selecting additional amenities THEN the system SHALL allow multiple selections per unit type
5. THE system SHALL inherit standard amenities from development level automatically
6. THE system SHALL store additional amenities separately per unit type
7. WHEN displaying unit type amenities THEN the system SHALL combine standard and additional amenities in the final listing

### Requirement 6B: Unit Type Specifications & Finishes

**User Story:** As a property developer, I want to define specifications and finishes for each unit type, so that buyers understand the quality and features of different unit configurations.

#### Acceptance Criteria

1. WHEN defining unit type specifications THEN the system SHALL provide fields for Built-in Features, Flooring, Kitchen Finishes, Bathroom Finishes, and Electrical Features
2. WHEN entering built-in features THEN the system SHALL provide options for Built-in Wardrobes, Tiled Flooring, Granite Counters, and Prepaid Electricity
3. WHEN defining finishes THEN the system SHALL provide fields for Paint & Internal Walls, Flooring Types, Kitchen Standard Features, and Bathroom Standard Features
4. THE system SHALL apply specifications to all specs within the unit type unless overridden at spec variation level
5. THE system SHALL store specifications per unit type, not at development level
6. WHEN a spec variation overrides specifications THEN the system SHALL display the override clearly

### Requirement 7: Spec Variations Within Unit Types

**User Story:** As a property developer, I want to create multiple spec variations for each unit type, so that buyers can choose between different finish levels and pricing options.

#### Acceptance Criteria

1. WHEN adding spec variations THEN the system SHALL allow multiple specs per unit type (e.g., "Standard Spec", "GAP Spec", "Affordable Spec", "Premium Spec")
2. WHEN creating a spec THEN the system SHALL require spec name, price, bedrooms/bathrooms, size, and spec description
3. WHEN defining spec-specific media THEN the system SHALL allow uploading photos, floor plans, videos, and PDFs unique to that spec
4. WHEN defining spec-specific documents THEN the system SHALL accept PDF uploads
5. THE system SHALL allow amenity and specification overrides where specs can add, remove, or replace inherited features
6. THE system SHALL inherit unit type amenities and specifications unless explicitly overridden at spec level

### Requirement 8: Specification Inheritance Model

**User Story:** As a property developer, I want specifications and amenities to inherit from development and unit type defaults automatically, so that I don't duplicate data and can make efficient updates.

#### Acceptance Criteria

1. WHEN a unit type is created THEN the system SHALL inherit all development-level amenities automatically as standard amenities
2. WHEN a spec variation is created THEN the system SHALL inherit all unit type amenities and specifications automatically
3. WHEN unit type amenities or specifications are updated THEN the system SHALL propagate changes to all specs that haven't overridden those features
4. WHEN a spec overrides an amenity or specification THEN the system SHALL store only the override, not the full feature set
5. THE system SHALL compute final spec features as: Development Amenities + Unit Type Amenities + Unit Type Specifications + Spec Overrides
6. THE system SHALL display inherited features with clear visual indication of their source (development-level, unit type-level, or spec-level)

### Requirement 9: Unit Type Media Management

**User Story:** As a property developer, I want to organize media by category for each unit type, so that buyers can easily find floor plans, interior photos, and renderings.

#### Acceptance Criteria

1. WHEN uploading media THEN the system SHALL organize files into categories: Photos, Floor Plans, Videos, and PDFs
2. WHEN uploading floor plans THEN the system SHALL accept both images and PDF files
3. WHEN uploading photos THEN the system SHALL accept image files only
4. WHEN media is uploaded THEN the system SHALL allow setting one image as primary per unit type
5. THE system SHALL support drag-and-drop file upload
6. THE system SHALL allow reordering and removing media items
7. THE system SHALL inherit unit type media to all specs unless replaced at spec level

### Requirement 10: Phase Details & Development Infrastructure

**User Story:** As a property developer, I want to specify phase-specific information and estate-level infrastructure, so that buyers understand the development timeline and overall project quality.

#### Acceptance Criteria

1. WHEN entering phase details THEN the system SHALL provide fields for Phase Name, Phase Number, Expected Completion Date, and Phase Status
2. WHEN adding development infrastructure THEN the system SHALL provide selectable options including Perimeter Wall, Controlled Access, Electric Fence, CCTV, Brick & Mortar Construction, Paved Roads, Fibre Ready, and Solar Installations
3. WHEN selecting infrastructure features THEN the system SHALL allow multiple selections
4. THE system SHALL store only development-level information without unit-specific configurations
5. THE system SHALL distinguish between development infrastructure (estate-level) and unit-specific features
6. THE system SHALL display selected infrastructure features on the development listing page

### Requirement 11: Document Management

**User Story:** As a property developer, I want to upload supporting documents for my development, so that buyers can access detailed information.

#### Acceptance Criteria

1. WHEN uploading documents THEN the system SHALL accept PDF files for Brochure, Site Development Plan, Pricing Sheet, Estate Rules, Engineering Pack, and Additional Forms
2. WHEN documents are uploaded THEN the system SHALL allow marking them as development-wide or unit-type-specific
3. THE system SHALL display document names with file size and upload date
4. THE system SHALL allow removing and replacing documents
5. THE system SHALL validate file types and size limits

### Requirement 12: Review & Publish

**User Story:** As a property developer, I want to review all entered information before publishing, so that I can verify accuracy and completeness.

#### Acceptance Criteria

1. WHEN viewing the review step THEN the system SHALL display a comprehensive summary including Development Summary, Unit Types Summary, Development Features Summary, and Documents Summary
2. WHEN reviewing unit types THEN the system SHALL show each unit type with core info, all specs with price differences, media summary, and feature differences between specs
3. WHEN reviewing development features THEN the system SHALL display estate-level specs and amenities
4. WHEN reviewing documents THEN the system SHALL list all uploaded documents with names and types
5. THE system SHALL provide "Save as Draft" and "Publish" buttons
6. WHEN saving as draft THEN the system SHALL store the listing without making it publicly visible
7. WHEN publishing THEN the system SHALL validate all required fields and make the listing publicly visible

### Requirement 13: Progressive Disclosure & Clean UI

**User Story:** As a property developer, I want a clean, uncluttered interface with progressive disclosure, so that I can focus on one task at a time without cognitive overload.

#### Acceptance Criteria

1. THE system SHALL display minimal fields on screen at one time
2. THE system SHALL use tabs for organizing complex sections (unit types)
3. THE system SHALL use expandable spec cards for managing variations
4. THE system SHALL prevent overwhelming users with too many fields simultaneously
5. THE system SHALL maintain consistent visual hierarchy throughout the wizard
6. THE system SHALL use clear section headings and grouping

### Requirement 14: Auto-Save & Draft Management

**User Story:** As a property developer, I want my progress to be automatically saved, so that I can resume my work if interrupted.

#### Acceptance Criteria

1. WHEN the user makes changes THEN the system SHALL auto-save progress to local storage
2. WHEN the user returns to an incomplete wizard THEN the system SHALL offer to resume from the last saved state
3. WHEN the user chooses to start fresh THEN the system SHALL clear all saved data
4. THE system SHALL display save status indicator showing last saved time
5. THE system SHALL persist draft data across browser sessions

### Requirement 15: Validation & Error Handling

**User Story:** As a property developer, I want inline validation with clear error messages, so that I can correct mistakes immediately.

#### Acceptance Criteria

1. WHEN a required field is left empty THEN the system SHALL display an inline error message
2. WHEN field validation fails THEN the system SHALL show specific guidance on how to fix the error
3. WHEN the user corrects an error THEN the system SHALL clear the error message immediately
4. THE system SHALL mark required fields with a red asterisk (*)
5. THE system SHALL validate development name for minimum 5 characters

### Requirement 16: Wizard Navigation

**User Story:** As a property developer, I want to navigate between wizard steps easily, so that I can review and edit information across different sections.

#### Acceptance Criteria

1. WHEN viewing the wizard THEN the system SHALL display a progress indicator showing all 5 steps
2. WHEN clicking on a step in the progress indicator THEN the system SHALL navigate to that step
3. WHEN on the first step THEN the system SHALL disable the "Previous" button
4. WHEN on the last step THEN the system SHALL replace "Next" with "Save as Draft" and "Publish" buttons
5. THE system SHALL maintain step completion state visually in the progress indicator

### Requirement 17: Scalability & Performance

**User Story:** As a property developer, I want the system to handle large developments with many unit types and specs, so that I can list complex projects without performance issues.

#### Acceptance Criteria

1. THE system SHALL support hundreds of unit types per development
2. THE system SHALL support many spec variations per unit type
3. THE system SHALL handle large media uploads efficiently
4. THE system SHALL maintain responsive UI with deep nesting
5. THE system SHALL use efficient data structures to prevent duplication
