# Implementation Plan

- [x] 1. Database schema and migrations





  - [x] 1.1 Create developments table schema


    - Add all fields from design document
    - Create indexes for performance
    - Add foreign keys and constraints
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [x] 1.2 Create unit_types table schema


    - Define base configuration fields
    - Add JSON columns for base features, finishes, media
    - Create indexes and foreign keys
    - _Requirements: 5.1, 6.1, 6.3, 6.4, 6.5_

  - [x] 1.3 Create spec_variations table schema


    - Define spec fields with inheritance support
    - Add JSON columns for overrides and media
    - Create indexes and foreign keys
    - _Requirements: 7.1, 7.2, 7.5, 8.3_

  - [x] 1.4 Create development_documents table schema


    - Define document fields
    - Add support for development-wide and unit-specific docs
    - Create indexes
    - _Requirements: 11.1, 11.2_

  - [x] 1.5 Write migration scripts


    - Create migration runner
    - Test migrations on development database
    - Prepare rollback scripts
    - _Requirements: All database requirements_

- [-] 2. State management setup


  - [-] 2.1 Create Zustand store structure



    - Define DevelopmentWizardState interface
    - Implement state slices for each step
    - Add persistence middleware for auto-save
    - _Requirements: 14.1, 14.5_

  - [ ] 2.2 Implement development data actions
    - setDevelopmentData()
    - setLocation()
    - addAmenity(), removeAmenity()
    - addHighlight(), removeHighlight()
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [ ] 2.3 Implement unit type actions
    - addUnitType(), updateUnitType(), deleteUnitType()
    - duplicateUnitType()
    - setBaseFeatures(), setBaseFinishes()
    - _Requirements: 5.1, 5.4, 5.5, 6.1_

  - [ ] 2.4 Implement spec variation actions
    - addSpec(), updateSpec(), deleteSpec()
    - setSpecOverrides()
    - computeFinalFeatures() (inheritance logic)
    - _Requirements: 7.1, 8.1, 8.3, 8.4_

  - [ ] 2.5 Implement document and feature actions
    - setDevelopmentFeatures()
    - addDocument(), removeDocument()
    - _Requirements: 10.1, 11.1_

  - [ ] 2.6 Implement wizard navigation actions
    - setCurrentStep()
    - validateStep()
    - canProceed()
    - _Requirements: 16.1, 16.2_

  - [ ] 2.7 Implement save and publish actions
    - saveDraft()
    - publish()
    - Auto-save with debouncing
    - _Requirements: 12.6, 12.7, 14.1_

- [ ] 3. Step 1: Development Details
  - [ ] 3.1 Create DevelopmentDetailsStep component
    - Build main step container
    - Implement section layout
    - Add step validation
    - _Requirements: 1.1_

  - [ ] 3.2 Build BasicInformationSection
    - Development name input with validation
    - Status badge selector
    - Completion date picker
    - Developer name (read-only)
    - Rating display (read-only)
    - Description rich text editor
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 3.3 Build LocationSection with map integration
    - Integrate LocationMapPicker component
    - Implement pin drop functionality
    - Add reverse geocoding
    - Display GPS accuracy indicator
    - Add manual address override
    - Add "No official street yet" toggle
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 3.4 Build DevelopmentAmenitiesSection
    - Create multi-select amenity picker
    - Display as badges or checkboxes
    - Group by category
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.5 Build DevelopmentHighlightsSection
    - Create tag input component
    - Implement 5-item limit
    - Add counter display "X/5"
    - Add/remove functionality
    - Show example suggestions
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 3.6 Build DevelopmentMediaSection
    - Hero image upload zone
    - Development photos multi-upload with drag & drop
    - Development videos upload
    - Set primary image functionality
    - Reorder/remove media
    - _Requirements: Step 1 Media_

- [ ] 4. Step 2: Unit Types - Main View
  - [ ] 4.1 Create UnitTypesStep component
    - Build main step container
    - Implement grid layout for cards
    - Add summary statistics
    - _Requirements: 5.1_

  - [ ] 4.2 Build UnitTypeCard component
    - Display unit type summary
    - Show bedrooms, bathrooms, size, price
    - Show number of specs
    - Add Edit, Duplicate, Delete buttons
    - Implement hover effects
    - _Requirements: 5.1, 5.4_

  - [ ] 4.3 Build EmptyState component
    - Create "Add Your First Unit Type" CTA
    - Add helpful description
    - Style with icon and centered layout
    - _Requirements: 5.3_

  - [ ] 4.4 Implement unit type CRUD operations
    - Add new unit type
    - Edit existing unit type
    - Duplicate unit type (with "(Copy)" suffix)
    - Delete unit type with confirmation
    - _Requirements: 5.4, 5.5_

- [ ] 5. Step 2: Unit Types - Modal Tab A (Base Configuration)
  - [ ] 5.1 Create UnitTypeModal component
    - Build modal container
    - Implement 5-tab navigation (Base Configuration, Amenities, Specifications & Finishes, Media, Spec Variations)
    - Add Previous/Next/Save buttons
    - Handle form state
    - _Requirements: 5.2_

  - [ ] 5.2 Build BaseConfigurationTab component
    - Create tab container
    - Organize into sections
    - _Requirements: 6.1_

  - [ ] 5.3 Build BasicInfoSection (Tab A)
    - Unit type name input
    - Bedrooms & bathrooms inputs
    - Parking dropdown
    - Unit size & yard size inputs
    - Base price range inputs
    - _Requirements: 6.1, 6.2_

- [ ] 6. Step 2: Unit Types - Modal Tab B (Amenities)
  - [ ] 6.1 Build AmenitiesTab component
    - Create tab container
    - Organize into two sections
    - _Requirements: 6A.1_

  - [ ] 6.2 Build StandardAmenitiesSection (Tab B)
    - Display development-level amenities (read-only)
    - Show visual indication that these are inherited
    - Display as checkboxes (disabled) or badges
    - _Requirements: 6A.2, 6A.5_

  - [ ] 6.3 Build AdditionalAmenitiesSection (Tab B)
    - Multi-select checkboxes for unit type-specific amenities
    - Options: Built-in Wardrobes, Balcony, Pet-Friendly, Garden, Study Room, En-suite Bathroom
    - Allow multiple selections
    - _Requirements: 6A.3, 6A.4, 6A.6_

  - [ ] 6.4 Implement amenity inheritance logic
    - Combine standard and additional amenities
    - Display final amenity list
    - Store only additional amenities in database
    - _Requirements: 6A.5, 6A.6, 6A.7_

- [ ] 7. Step 2: Unit Types - Modal Tab C (Specifications & Finishes)
  - [ ] 7.1 Build SpecificationsFinishesTab component
    - Create tab container
    - Organize into three sections
    - _Requirements: 6B.1_

  - [ ] 7.2 Build BuiltInFeaturesSection (Tab C)
    - Built-in wardrobes toggle
    - Tiled flooring toggle
    - Granite counters toggle
    - _Requirements: 6B.2_

  - [ ] 7.3 Build FinishesSection (Tab C)
    - Paint & internal walls input
    - Flooring types input
    - Kitchen standard features input
    - Bathroom standard features input
    - _Requirements: 6B.3_

  - [ ] 7.4 Build ElectricalFeaturesSection (Tab C)
    - Prepaid electricity toggle
    - _Requirements: 6B.2_

  - [ ] 7.5 Implement specifications storage
    - Store specifications per unit type
    - Apply to all specs unless overridden
    - _Requirements: 6B.4, 6B.5_

- [ ] 8. Step 2: Unit Types - Modal Tab D (Media)
  - [ ] 8.1 Build MediaTab component
    - Create tab container
    - Organize by category
    - _Requirements: 9.1_

  - [ ] 8.2 Build UnitTypeGalleryUpload section
    - Multi-image upload
    - Drag & drop support
    - Set primary image
    - Reorder/remove
    - _Requirements: 9.1, 9.3, 9.4, 9.5, 9.6_

  - [ ] 8.3 Build FloorPlansUpload section
    - Upload images or PDFs
    - Multiple floor plan support
    - Reorder/remove
    - _Requirements: 9.1, 9.2, 9.6_

  - [ ] 8.4 Build RendersVideosUpload section
    - Video files or URLs
    - 3D renders
    - Preview thumbnails
    - Reorder/remove
    - _Requirements: 9.1, 9.6_

  - [ ] 8.5 Implement media inheritance
    - Inherit unit type media to specs
    - Allow spec-level media overrides
    - Display inheritance indicator
    - _Requirements: 9.7_

- [ ] 9. Step 2: Unit Types - Modal Tab E (Spec Variations)
  - [ ] 9.1 Build SpecVariationsTab component
    - Create tab container
    - Display list of spec cards
    - Add "Add New Spec" button
    - _Requirements: 7.1_

  - [ ] 9.2 Build SpecCard component (expandable)
    - Display spec summary (name, price, key differences)
    - Implement expand/collapse
    - Show inherited amenities and specifications
    - _Requirements: 7.1, 8.6_

  - [ ] 9.3 Build SpecModal/SpecForm component
    - Spec name input
    - Price input
    - Description textarea
    - Bedrooms/bathrooms/size overrides
    - _Requirements: 7.2_

  - [ ] 9.4 Implement amenity and specification override system
    - Display inherited amenities (read-only)
    - Display inherited specifications (read-only)
    - Add "Override" toggle per amenity/specification
    - Allow adding new amenities
    - Allow removing inherited amenities
    - Allow overriding specifications
    - _Requirements: 7.5, 8.2, 8.4_

  - [ ] 9.5 Build spec-specific media uploader
    - Photos upload
    - Floor plans upload
    - Videos upload
    - PDFs upload
    - Category-based organization
    - _Requirements: 7.3_

  - [ ] 9.6 Build spec-specific document uploader
    - PDF upload for spec documents
    - Display uploaded documents
    - Remove functionality
    - _Requirements: 7.4_

  - [ ] 9.7 Implement complete inheritance logic
    - computeFinalFeatures() function
    - Merge development amenities + unit type amenities + unit type specifications + spec overrides
    - Handle add/remove operations for amenities
    - Handle specification overrides
    - Display computed result with source indicators
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 10. Step 3: Phase Details & Infrastructure
  - [ ] 10.1 Create PhaseDetailsStep component
    - Build step container
    - Organize into two sections
    - _Requirements: 10.1_

  - [ ] 10.2 Build PhaseInformationSection
    - Phase name input
    - Phase number input
    - Expected completion date picker
    - Phase status dropdown (Planning, Under Construction, Completed)
    - _Requirements: 10.1_

  - [ ] 10.3 Build DevelopmentInfrastructureSection
    - Multi-select checkboxes or badges
    - Group by category (Security, Construction, Utilities)
    - Options: Perimeter Wall, Controlled Access, Electric Fence, CCTV, Brick & Mortar, Paved Roads, Fibre Ready, Solar Installations
    - Display selected infrastructure
    - _Requirements: 10.2, 10.3_

  - [ ] 10.4 Implement infrastructure storage
    - Store as array
    - Development-level only (no unit-specific fields)
    - _Requirements: 10.4, 10.5_

- [ ] 11. Step 4: Review & Publish
  - [ ] 11.1 Create ReviewPublishStep component
    - Build step container
    - Organize summary sections
    - _Requirements: 12.1_

  - [ ] 11.2 Build DevelopmentSummary component
    - Display name, location, status
    - Show development amenities list (inherited by all unit types)
    - Show highlights list
    - Show media summary (hero image, photos, videos)
    - _Requirements: 12.1_

  - [ ] 11.3 Build UnitTypesSummary component
    - Display each unit type
    - Show core info (beds, baths, size, price range)
    - Show standard amenities (inherited from development)
    - Show additional amenities (unit type-specific)
    - Show specifications & finishes
    - List all spec variations with price differences
    - Show media count
    - Highlight amenity and specification differences between specs
    - _Requirements: 12.2_

  - [ ] 11.4 Build PhaseInfrastructureSummary component
    - Display phase information (name, number, completion date, status)
    - Display estate-level infrastructure features
    - Group by category
    - _Requirements: 12.3_

  - [ ] 11.5 Implement publish actions
    - "Save as Draft" button
    - "Publish" button
    - Validate all required fields
    - Handle success/error states
    - _Requirements: 12.5, 12.6, 12.7_

- [ ] 12. Wizard navigation and progress
  - [ ] 12.1 Create WizardProgress component
    - Display 4-step indicator
    - Show current step
    - Show completed steps
    - Allow clicking to navigate
    - _Requirements: 16.1, 16.2, 16.5_

  - [ ] 12.2 Implement step navigation logic
    - Previous/Next buttons
    - Disable Previous on first step
    - Replace Next with actions on last step
    - Validate before proceeding
    - _Requirements: 16.3, 16.4_

  - [ ] 12.3 Implement step validation
    - Validate required fields per step
    - Prevent progression with errors
    - Show validation errors
    - _Requirements: 15.1, 15.2, 15.3_

- [ ] 13. Validation and error handling
  - [ ] 13.1 Implement field-level validation
    - Development name (min 5 chars)
    - Required field validation
    - Format validation (email, phone, etc.)
    - _Requirements: 15.1, 15.5_

  - [ ] 13.2 Build inline error display
    - Show errors on blur
    - Clear errors on correction
    - Display specific guidance
    - Mark required fields with asterisk
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 13.3 Implement geocoding error handling
    - Catch API errors
    - Display user-friendly messages
    - Provide retry option
    - Fall back to manual entry
    - _Requirements: 2.3_

  - [ ] 13.4 Implement file upload error handling
    - Validate file types
    - Check file size limits
    - Display upload progress
    - Handle failures gracefully
    - Allow retry
    - _Requirements: 11.5_

- [ ] 14. Auto-save and draft management
  - [ ] 14.1 Implement auto-save functionality
    - Debounce changes (3 seconds)
    - Save to localStorage
    - Save to database (when available)
    - _Requirements: 14.1_

  - [ ] 14.2 Build save status indicator
    - Show "Saving...", "Saved", or error state
    - Display last saved timestamp
    - Position in wizard header
    - _Requirements: 14.4_

  - [ ] 14.3 Implement draft restoration
    - Check for existing draft on mount
    - Show resume dialog
    - Restore all field values
    - Clear draft on fresh start
    - _Requirements: 14.2, 14.3_

  - [ ] 14.4 Implement draft persistence
    - Persist across browser sessions
    - Handle localStorage limits
    - Sync with database
    - _Requirements: 14.5_

- [ ] 15. Backend API endpoints
  - [ ] 15.1 Create development CRUD endpoints
    - POST /api/developer/developments (create)
    - GET /api/developer/developments/:id (read)
    - PUT /api/developer/developments/:id (update)
    - DELETE /api/developer/developments/:id (delete)
    - _Requirements: 1.1, 12.6, 12.7_

  - [ ] 15.2 Create unit type endpoints
    - POST /api/developer/developments/:id/unit-types
    - PUT /api/developer/unit-types/:id
    - DELETE /api/developer/unit-types/:id
    - _Requirements: 5.1, 5.4_

  - [ ] 15.3 Create spec variation endpoints
    - POST /api/developer/unit-types/:id/specs
    - PUT /api/developer/specs/:id
    - DELETE /api/developer/specs/:id
    - _Requirements: 7.1_

  - [ ] 14.4 Create document upload endpoints
    - POST /api/developer/developments/:id/documents
    - DELETE /api/developer/documents/:id
    - _Requirements: 11.1_

  - [ ] 14.5 Create media upload endpoints
    - POST /api/developer/media/upload
    - DELETE /api/developer/media/:id
    - Support for images, PDFs, videos
    - _Requirements: 6.5, 7.3, 9.1_

  - [ ] 14.6 Create geocoding endpoint
    - POST /api/geocoding/reverse
    - Handle Google Maps API integration
    - Return formatted address components
    - _Requirements: 2.3_

  - [ ] 14.7 Create draft save/restore endpoints
    - POST /api/developer/developments/draft
    - GET /api/developer/developments/draft/:id
    - _Requirements: 14.1, 14.2_

- [ ] 15. UI/UX polish and accessibility
  - [ ] 15.1 Implement progressive disclosure
    - Use tabs for complex sections
    - Use expandable cards for specs
    - Minimize fields on screen
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ] 15.2 Ensure consistent visual hierarchy
    - Clear section headings
    - Proper spacing and grouping
    - Consistent button styles
    - _Requirements: 13.5, 13.6_

  - [ ] 15.3 Implement keyboard navigation
    - Tab order
    - Enter to submit
    - Escape to close modals
    - Arrow keys for navigation
    - _Requirements: Accessibility_

  - [ ] 15.4 Add ARIA labels and roles
    - Label all interactive elements
    - Add role attributes
    - Announce dynamic content
    - Associate errors with fields
    - _Requirements: Accessibility_

  - [ ] 15.5 Ensure mobile responsiveness
    - Responsive grid layouts
    - Touch-friendly tap targets
    - Mobile-optimized map
    - Collapsible sections on small screens
    - Bottom sheet modals on mobile
    - _Requirements: Mobile Responsiveness_

  - [ ] 15.6 Implement loading states
    - Skeleton screens
    - Loading spinners
    - Progress indicators
    - Optimistic updates
    - _Requirements: Performance_

- [ ] 16. Testing
  - [ ] 16.1 Write unit tests for validation
    - Test development name validation
    - Test highlights limit enforcement
    - Test required field validation
    - _Requirements: 1.3, 4.3, 15.5_

  - [ ] 16.2 Write unit tests for inheritance logic
    - Test computeFinalFeatures()
    - Test override merging
    - Test add/remove/replace operations
    - _Requirements: 8.1, 8.3, 8.4_

  - [ ] 16.3 Write property-based tests
    - **Property 1: Development name validation**
    - **Validates: Requirements 1.3**

  - [ ] 16.4 Write property-based tests
    - **Property 2: Highlights limit enforcement**
    - **Validates: Requirements 4.3**

  - [ ] 16.5 Write property-based tests
    - **Property 4: Specification inheritance**
    - **Validates: Requirements 8.1, 8.4**

  - [ ] 16.6 Write property-based tests
    - **Property 5: Override storage efficiency**
    - **Validates: Requirements 8.3**

  - [ ] 16.7 Write property-based tests
    - **Property 6: Unit type duplication**
    - **Validates: Requirements 5.5**

  - [ ] 16.8 Write property-based tests
    - **Property 7: Primary image uniqueness**
    - **Validates: Requirements 9.4**

  - [ ] 16.9 Write integration tests
    - Test complete wizard flow
    - Test unit type and spec management
    - Test draft save and restore
    - Test navigation between steps
    - _Requirements: All_

  - [ ] 16.10 Write E2E tests
    - Test user journey from start to publish
    - Test map interaction
    - Test media upload
    - Test error recovery
    - _Requirements: All_

- [ ] 17. Documentation
  - [ ] 17.1 Write component documentation
    - Document props and interfaces
    - Add usage examples
    - Document inheritance model
    - _Requirements: All_

  - [ ] 17.2 Write user guide
    - Document wizard steps
    - Explain inheritance model
    - Provide best practices
    - Add screenshots
    - _Requirements: All_

  - [ ] 17.3 Write API documentation
    - Document all endpoints
    - Provide request/response examples
    - Document error codes
    - _Requirements: All_

- [ ] 18. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
