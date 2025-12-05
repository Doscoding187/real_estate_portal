# Requirements Document

## Introduction

This specification defines the optimization of the Developer Listing Wizard for the real estate marketplace platform. The wizard is a cornerstone feature that enables property developers to create listings for master developments and multi-phase developments (extensions/phases). The current implementation needs to be streamlined to provide a simpler, more intuitive user experience while maintaining support for complex development structures.

## Glossary

- **Master Development**: A primary development project that can contain multiple phases or extensions
- **Phase/Extension**: A sub-development linked to a master development with its own specifications
- **Development Wizard**: Multi-step form interface for creating development listings
- **GPS Accuracy**: Indicator of location precision (accurate/approximate)
- **Spec Type**: Classification of development phase (Affordable/GAP/Luxury/Custom)
- **Project Highlights**: Up to 5 key selling points that differentiate a development
- **Reverse Geocoding**: Converting GPS coordinates to human-readable address

## Requirements

### Requirement 1

**User Story:** As a property developer, I want to choose between creating a new development or adding a phase to an existing development, so that I can efficiently manage my portfolio structure.

#### Acceptance Criteria

1. WHEN the wizard loads THEN the system SHALL display a single question "What would you like to add?" with two selectable card options
2. WHEN the user selects "New Development" THEN the system SHALL display fields for master development creation
3. WHEN the user selects "New Phase / Extension" THEN the system SHALL display simplified fields for phase creation
4. THE system SHALL maintain clear visual distinction between the two options using large selectable cards
5. THE system SHALL prevent displaying unnecessary fields based on the user's selection

### Requirement 2

**User Story:** As a property developer creating a new development, I want to provide basic information in a minimal, organized format, so that I can quickly input essential details without feeling overwhelmed.

#### Acceptance Criteria

1. WHEN creating a new development THEN the system SHALL display three compact sections: Basic Information, Location, and Development Overview
2. WHEN entering development name THEN the system SHALL require minimum 5 characters
3. WHEN selecting development status THEN the system SHALL provide multi-select badge options including "Now Selling", "Launching Soon", "Under Construction", "Ready to Move", "Sold Out", "Phase Completed", and "New Phase Launching"
4. THE system SHALL auto-fill developer name from the authenticated user's account as read-only
5. THE system SHALL display rating as read-only with explanation "Rating is automatically calculated by the system"

### Requirement 3

**User Story:** As a property developer, I want to specify my development's location using an interactive map with pin-drop functionality, so that I can provide accurate geolocation data.

#### Acceptance Criteria

1. WHEN the location section loads THEN the system SHALL display an interactive drop-pin map as the primary input method
2. WHEN the user drops a pin on the map THEN the system SHALL capture latitude and longitude coordinates
3. WHEN coordinates are captured THEN the system SHALL perform reverse geocoding to populate nearest suburb and city
4. WHEN reverse geocoding succeeds THEN the system SHALL set GPS accuracy to "accurate"
5. WHEN reverse geocoding provides approximate results THEN the system SHALL set GPS accuracy to "approximate"
6. THE system SHALL allow manual address field entry as an optional override
7. WHEN the user enables "No official street yet" toggle THEN the system SHALL skip street validation
8. THE system SHALL treat map location as the authoritative source for coordinates

### Requirement 4

**User Story:** As a property developer, I want to provide development overview information including units, size, and highlights, so that potential buyers understand the project scope.

#### Acceptance Criteria

1. WHEN entering project overview THEN the system SHALL require total number of units
2. WHEN entering project size THEN the system SHALL accept values in square meters or hectares
3. WHEN adding project highlights THEN the system SHALL allow up to 5 tag or bullet inputs
4. WHEN entering project description THEN the system SHALL provide rich text editing capabilities
5. THE system SHALL display a counter showing "X/5" for project highlights

### Requirement 5

**User Story:** As a property developer adding a phase to an existing development, I want a simplified form that links to the parent development, so that I can quickly add extensions without re-entering master development details.

#### Acceptance Criteria

1. WHEN creating a new phase THEN the system SHALL display a simplified form with three sections: Link to Parent, Phase Information, and Optional Phase Details
2. WHEN linking to parent THEN the system SHALL provide a dropdown of the user's existing developments
3. WHEN entering phase information THEN the system SHALL require phase name/number (e.g., "Extension 57", "Phase 2", "Block A")
4. WHEN selecting spec type THEN the system SHALL provide options: Affordable, GAP, Luxury, and Custom Type
5. WHEN selecting phase status THEN the system SHALL use the same badge options as master development
6. THE system SHALL hide optional phase details by default behind a "Show Phase Details" toggle
7. WHEN optional details are expanded THEN the system SHALL display fields for units in phase, finishing differences, phase highlights, expected completion date, and phase description

### Requirement 6

**User Story:** As a property developer, I want the system to automatically manage relationships between master developments and phases, so that my portfolio structure is maintained correctly.

#### Acceptance Criteria

1. WHEN saving a new development THEN the system SHALL create a master development record with unique ID, basic details, geolocation, highlights, status, and overview
2. WHEN saving a new phase THEN the system SHALL create a child record linked to the master development with ParentDevelopmentID, phase details, specs, status, and differences from master
3. WHEN a phase is created THEN the system SHALL automatically update the parent development with phase count and phase list
4. WHEN a phase does not override location THEN the system SHALL inherit master development location
5. THE system SHALL maintain referential integrity between master developments and phases

### Requirement 6A

**User Story:** As a property developer, I want to define multiple unit types with detailed configurations, so that buyers can understand the different options available in my development.

#### Acceptance Criteria

1. WHEN viewing the unit types step THEN the system SHALL display a card-based list of configured unit types
2. WHEN adding a new unit type THEN the system SHALL open a modal with four tabs: Basic Info, Specifications, Media, and Optional Extras
3. WHEN no unit types exist THEN the system SHALL display an empty state with a clear call-to-action to add the first unit type
4. THE system SHALL allow adding, editing, duplicating, and deleting unit types
5. WHEN duplicating a unit type THEN the system SHALL create a copy with "(Copy)" appended to the name

### Requirement 6B

**User Story:** As a property developer, I want to specify basic unit information with minimal required fields, so that I can quickly configure unit types without unnecessary complexity.

#### Acceptance Criteria

1. WHEN entering basic unit info THEN the system SHALL require unit type name, bedrooms, bathrooms, minimum price, and available units
2. WHEN entering unit type name THEN the system SHALL accept descriptive names like "2 Bedroom Apartment", "60m² Simplex", or "Bachelor Studio"
3. WHEN entering floor size THEN the system SHALL accept values in square meters
4. WHEN entering price range THEN the system SHALL require minimum price and optionally accept maximum price
5. WHEN selecting parking THEN the system SHALL provide options: None, 1 Bay, 2 Bays, Carport, or Garage
6. THE system SHALL allow optional fields for completion date, deposit required, and internal notes

### Requirement 6C

**User Story:** As a property developer, I want unit specifications to inherit from master development settings by default, so that I don't have to re-enter common specifications for each unit type.

#### Acceptance Criteria

1. WHEN viewing specifications tab THEN the system SHALL display inherited master specifications as read-only
2. WHEN master specifications are displayed THEN the system SHALL show kitchen type, countertops, flooring, bathroom finish, geyser, electricity, and security
3. WHEN a developer wants to override a specification THEN the system SHALL provide a toggle to enable editing for that specific field
4. WHEN a specification is overridden THEN the system SHALL store only the overridden value in the database
5. THE system SHALL compute final unit specifications as: Master Specs + Overrides + Custom Specs

### Requirement 6D

**User Story:** As a property developer, I want to add custom specifications for unique unit features, so that I can communicate special characteristics that don't fit standard categories.

#### Acceptance Criteria

1. WHEN adding custom specifications THEN the system SHALL provide repeatable field name/value pairs
2. WHEN entering custom specs THEN the system SHALL allow unlimited entries
3. THE system SHALL provide examples like "Smart Home Automation" → "Optional", "Geyser Size" → "200L Solar-Electric Hybrid"
4. WHEN removing a custom spec THEN the system SHALL delete it without affecting other specifications
5. THE system SHALL store custom specifications separately from standard specifications

### Requirement 6E

**User Story:** As a property developer, I want to upload unit-specific media organized by category, so that buyers can see floor plans, interior photos, and renderings for each unit type.

#### Acceptance Criteria

1. WHEN uploading media THEN the system SHALL organize files into categories: Floor Plans, Interior Images, Exterior Images, and 3D Renderings
2. WHEN uploading floor plans THEN the system SHALL accept both images and PDF files
3. WHEN uploading other media THEN the system SHALL accept image files only
4. WHEN media is uploaded THEN the system SHALL allow setting one image as primary per unit type
5. WHEN entering virtual tour THEN the system SHALL accept URLs for Matterport, YouTube, or Vimeo
6. THE system SHALL support drag-and-drop file upload
7. THE system SHALL allow reordering and removing media items

### Requirement 6F

**User Story:** As a property developer, I want to define optional upgrade packs for each unit type, so that buyers can see available add-ons and customization options.

#### Acceptance Criteria

1. WHEN adding upgrade packs THEN the system SHALL provide repeatable entries with name, description, and optional price
2. WHEN entering upgrade name THEN the system SHALL require a descriptive name like "Solar Upgrade" or "Premium Kitchen Pack"
3. WHEN entering price THEN the system SHALL allow optional pricing (for "Price on Request" scenarios)
4. THE system SHALL display total optional value by summing all upgrade pack prices
5. THE system SHALL provide examples like "Solar Upgrade + R18,000", "Premium Kitchen Pack + R12,000"

### Requirement 7

**User Story:** As a property developer, I want a clean, uncluttered interface with progressive disclosure, so that I can focus on one task at a time without cognitive overload.

#### Acceptance Criteria

1. THE system SHALL display minimal fields on screen at one time
2. THE system SHALL use expandable sections only when needed
3. THE system SHALL provide clear separation between master and phase creation flows
4. THE system SHALL prevent duplicate data entry between related forms
5. THE system SHALL use map-first approach for location accuracy
6. THE system SHALL provide editable fields with intelligent defaults
7. THE system SHALL maintain consistent visual hierarchy throughout the wizard

### Requirement 8

**User Story:** As a property developer, I want my progress to be automatically saved, so that I can resume my work if interrupted.

#### Acceptance Criteria

1. WHEN the user makes changes THEN the system SHALL auto-save progress to local storage
2. WHEN the user returns to an incomplete wizard THEN the system SHALL offer to resume from the last saved state
3. WHEN the user chooses to start fresh THEN the system SHALL clear all saved data
4. THE system SHALL display save status indicator showing last saved time
5. THE system SHALL persist draft data across browser sessions

### Requirement 9

**User Story:** As a property developer, I want inline validation with clear error messages, so that I can correct mistakes immediately.

#### Acceptance Criteria

1. WHEN a required field is left empty THEN the system SHALL display an inline error message
2. WHEN field validation fails THEN the system SHALL show specific guidance on how to fix the error
3. WHEN the user corrects an error THEN the system SHALL clear the error message immediately
4. THE system SHALL mark required fields with a red asterisk (*)
5. THE system SHALL validate development name for minimum 5 characters

### Requirement 10

**User Story:** As a property developer, I want to navigate between wizard steps easily, so that I can review and edit information across different sections.

#### Acceptance Criteria

1. WHEN viewing the wizard THEN the system SHALL display a progress indicator showing all steps
2. WHEN clicking on a step in the progress indicator THEN the system SHALL navigate to that step
3. WHEN on the first step THEN the system SHALL disable the "Previous" button
4. WHEN on the last step THEN the system SHALL replace "Next" with submission controls
5. THE system SHALL maintain step completion state visually in the progress indicator
