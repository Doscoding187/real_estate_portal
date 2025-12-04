# Implementation Plan

- [x] 1. Database schema updates for phase support



  - Add `development_phases` table with parent relationship
  - Add phase-related fields to wizard state
  - Create migration script for new schema







  - _Requirements: 6.1, 6.2, 6.3_



- [ ] 2. Create DevelopmentTypeSelector component
  - [x] 2.1 Build type selection UI with two card options


    - Create large, visually distinct cards for "New Development" and "New Phase"
    - Implement selection state management

    - Add hover and selected states

    - _Requirements: 1.1, 1.4_

  - [ ] 2.2 Integrate type selector into wizard flow
    - Add as Step 0 in wizard sequence
    - Update wizard state to track development type

    - Conditionally render subsequent steps based on selection
    - _Requirements: 1.2, 1.3, 1.5_

- [ ] 3. Optimize BasicDetailsStep for master developments
  - [x] 3.1 Restructure into three compact sections

    - Create BasicInformationSection component
    - Create LocationSection component with map-first approach
    - Create ProjectOverviewSection component
    - _Requirements: 2.1_


  - [ ] 3.2 Implement development name validation
    - Add minimum 5 character validation
    - Display inline error on blur
    - Clear error on valid input
    - _Requirements: 2.2, 9.5_


  - [ ] 3.3 Add multi-select status badges
    - Create badge component with selection state
    - Implement status options (Now Selling, Launching Soon, etc.)




    - Style selected vs unselected states
    - _Requirements: 2.3_

  - [x] 3.4 Auto-fill developer name from profile

    - Fetch developer profile on component mount
    - Set developer name as read-only
    - Display in Basic Information section
    - _Requirements: 2.4_


  - [ ] 3.5 Display auto-calculated rating
    - Show rating field as read-only
    - Add explanatory text "Rating is automatically calculated by the system"
    - Style as disabled input
    - _Requirements: 2.5_


- [ ] 4. Enhance LocationSection with map-first approach
  - [ ] 4.1 Integrate LocationMapPicker as primary input
    - Position map prominently at top of section
    - Configure initial center point

    - Handle pin drop events
    - _Requirements: 3.1, 3.8_

  - [x] 4.2 Implement reverse geocoding




    - Call geocoding API on pin drop
    - Parse response for address components
    - Populate suburb, city, province fields
    - _Requirements: 3.2, 3.3_


  - [ ] 4.3 Add GPS accuracy indicator
    - Display badge showing "Accurate" or "Approximate"
    - Set based on geocoding result quality
    - Style with appropriate colors (green/orange)
    - _Requirements: 3.4, 3.5_


  - [ ] 4.4 Implement manual address override
    - Add toggle for manual entry mode
    - Allow editing of auto-populated fields
    - Show toast notification on manual edit
    - _Requirements: 3.6_



  - [x] 4.5 Add "No official street yet" toggle





    - Create checkbox for new developments
    - Skip street validation when enabled
    - Update validation rules accordingly
    - _Requirements: 3.7_


- [ ] 5. Build ProjectOverviewSection
  - [ ] 5.1 Add total units input
    - Create number input with validation
    - Mark as required field
    - Add helpful placeholder text
    - _Requirements: 4.1_


  - [ ] 5.2 Add project size input
    - Create number input with unit selector (m²/hectares)




    - Make optional
    - Add conversion helper text
    - _Requirements: 4.2_

  - [x] 5.3 Implement project highlights input

    - Create tag input component
    - Limit to maximum 5 highlights
    - Show counter "X/5"
    - Add/remove functionality
    - _Requirements: 4.3, 4.5_

  - [ ] 5.4 Add rich text description editor
    - Integrate rich text editor component

    - Support basic formatting (bold, italic, lists)
    - Add character count if needed
    - _Requirements: 4.4_

- [x] 6. Create PhaseDetailsStep component

  - [ ] 6.1 Build ParentLinkSection
    - Create dropdown of user's developments
    - Fetch developments on component mount
    - Filter by current user
    - Display development name and location
    - _Requirements: 5.1, 5.2_

  - [ ] 6.2 Build PhaseInformationSection
    - Add phase name/number input
    - Create spec type selector (Affordable/GAP/Luxury/Custom)
    - Add custom type input when "Custom" selected
    - Implement phase status badges
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ] 6.3 Build OptionalPhaseDetailsSection
    - Create collapsible section with toggle
    - Hide by default
    - Add units in phase input
    - Create finishing differences inputs (Kitchen/Bathrooms/Flooring/Electrical)
    - Add phase highlights input
    - Add expected completion date picker
    - Add phase description textarea
    - _Requirements: 5.6, 5.7_

- [ ] 7. Update wizard state management
  - [ ] 7.1 Add development type to Zustand store
    - Add `developmentType` field
    - Add setter action
    - Persist to localStorage
    - _Requirements: 1.2_

  - [ ] 7.2 Add phase-specific fields to store
    - Add `parentDevelopmentId`
    - Add `phaseName`, `phaseNumber`
    - Add `specType`, `customSpecType`
    - Add `finishingDifferences`
    - Add `phaseHighlights`
    - Add phase-specific setters
    - _Requirements: 5.3, 5.4, 5.7_

  - [ ] 7.3 Add GPS accuracy to store
    - Add `gpsAccuracy` field
    - Add setter action
    - Update on geocoding results
    - _Requirements: 3.4, 3.5_

  - [ ] 7.4 Add project highlights to store
    - Add `projectHighlights` array
    - Add `addProjectHighlight` action
    - Add `removeProjectHighlight` action
    - Enforce maximum 5 limit
    - _Requirements: 4.3_

- [ ] 8. Implement backend API endpoints
  - [ ] 8.1 Create phase creation endpoint
    - Define POST /api/developer/developments/:id/phases
    - Validate phase data
    - Create phase record with parent link
    - Update parent development phase count
    - Return created phase
    - _Requirements: 6.2, 6.3_

  - [ ] 8.2 Create get user developments endpoint
    - Define GET /api/developer/developments
    - Filter by authenticated user
    - Return list of developments for dropdown
    - _Requirements: 5.2_

  - [ ] 8.3 Update development creation endpoint
    - Add support for new fields (projectSize, projectHighlights, gpsAccuracy)
    - Validate project highlights limit
    - Handle GPS accuracy indicator
    - _Requirements: 2.1, 3.4, 4.2, 4.3_

- [ ] 9. Implement conditional step rendering
  - [ ] 9.1 Update wizard step sequence logic
    - Check development type in state
    - Render PhaseDetailsStep for phase type
    - Render BasicDetailsStep for master type
    - Skip irrelevant steps based on type
    - _Requirements: 1.2, 1.3_

  - [ ] 9.2 Update progress indicator
    - Show different step counts for master vs phase
    - Update step titles based on flow
    - Maintain step navigation
    - _Requirements: 10.1, 10.5_

- [ ] 10. Enhance validation and error handling
  - [ ] 10.1 Add inline validation for all required fields
    - Implement blur validation
    - Display errors immediately
    - Clear on correction
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 10.2 Add required field indicators
    - Mark all required fields with red asterisk
    - Add legend explaining asterisk
    - _Requirements: 9.4_

  - [ ] 10.3 Implement geocoding error handling
    - Catch geocoding API errors
    - Display user-friendly error message
    - Provide retry option
    - Fall back to manual entry
    - _Requirements: 3.2, 3.3_

- [ ] 11. Implement auto-save enhancements
  - [ ] 11.1 Add debounced auto-save
    - Implement 3-second debounce
    - Save to localStorage
    - Save to database (when available)
    - _Requirements: 8.1_

  - [ ] 11.2 Add save status indicator
    - Show "Saving...", "Saved", or error state
    - Display last saved timestamp
    - Position in wizard header
    - _Requirements: 8.4_

  - [ ] 11.3 Implement draft restoration
    - Check for existing draft on mount
    - Show resume dialog if draft exists
    - Restore all field values
    - Clear draft on fresh start
    - _Requirements: 8.2, 8.3_

- [ ] 12. Update wizard navigation
  - [ ] 12.1 Implement step-based navigation
    - Enable clicking on progress indicator steps
    - Validate current step before allowing navigation
    - Maintain step completion state
    - _Requirements: 10.2, 10.5_

  - [ ] 12.2 Update Previous/Next button logic
    - Disable Previous on first step
    - Replace Next with Submit on last step
    - Validate before proceeding
    - _Requirements: 10.3, 10.4_

- [ ] 13. Testing and quality assurance
  - [ ]* 13.1 Write unit tests for new components
    - Test DevelopmentTypeSelector selection logic
    - Test field visibility based on type
    - Test validation rules
    - Test highlight limit enforcement
    - _Requirements: All_

  - [ ]* 13.2 Write property-based tests
    - **Property 1: Development type selection determines field visibility**
    - **Validates: Requirements 1.2, 1.3**
    
  - [ ]* 13.3 Write property-based tests
    - **Property 4: Project highlights are limited to 5**
    - **Validates: Requirements 4.3**
    
  - [ ]* 13.4 Write property-based tests
    - **Property 10: Development name validation**
    - **Validates: Requirements 9.5**

  - [ ]* 13.5 Write integration tests
    - Test complete master development flow
    - Test complete phase creation flow
    - Test draft save and restore
    - Test navigation between steps
    - _Requirements: All_

- [ ] 14. Documentation and polish
  - [ ] 14.1 Update user documentation
    - Document new type selection step
    - Explain map-first location approach
    - Document phase creation workflow
    - _Requirements: All_

  - [ ] 14.2 Add inline help text
    - Add tooltips for complex fields
    - Add placeholder examples
    - Add field descriptions
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 14.3 Polish UI/UX
    - Ensure consistent spacing
    - Verify responsive design
    - Test accessibility
    - Optimize animations
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 15. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
