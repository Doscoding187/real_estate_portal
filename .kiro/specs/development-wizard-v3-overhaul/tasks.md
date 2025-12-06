# Development Wizard V3 - Implementation Tasks

## Phase 1: Database Schema & Backend Setup

- [ ] 1. Database schema updates
  - Add property_type, parent_development_id, ownership_type columns to developments table
  - Add indexes for performance
  - Expand unit_types table with new fields
  - Create development_contacts table
  - Run migration script
  - _Requirements: All_

- [ ] 2. Backend API updates
  - Update development creation endpoint to handle new structure
  - Add parent development lookup endpoint
  - Update unit types endpoints
  - Add contacts endpoints
  - Add validation for new fields
  - _Requirements: All_

## Phase 2: State Management

- [ ] 3. Create new Zustand store
  - Define DevelopmentWizardV3State interface
  - Implement all state actions
  - Add persist middleware configuration
  - Add draft management logic
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 4. Implement conditional logic
  - Property type conditional fields
  - Development type inheritance
  - Validation rules per step
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Phase 3: Step Components (Simple First)

- [ ] 5. Step 1: Development Type Selection
  - Create DevelopmentTypeSelection component
  - Build TypeCard component (reusable)
  - Implement ParentDevelopmentSelector with search
  - Add inheritance logic for phases
  - Wire up to state
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 6. Step 2: Property Type Selection
  - Create PropertyTypeSelection component
  - Build PropertyTypeCard components (3 variants)
  - Add icons and descriptions
  - Wire up to state
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 7. Step 4: Development Details & Amenities
  - Create DevelopmentDetailsStep component
  - Build DevelopmentInfoSection
  - Build LocationSection with map picker
  - Build AmenitiesSection (categorized checkboxes)
  - Build HighlightsSection (max 5)
  - Wire up to state
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [ ] 8. Step 5: Development Media
  - Create DevelopmentMediaStep component
  - Build FeaturedImageUpload component
  - Build MediaCategoryUpload component (reusable)
  - Implement drag-to-reorder functionality
  - Add file validation and error handling
  - Wire up to state
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

## Phase 4: Complex Components

- [ ] 9. Step 3: Unit Types & Configurations (Part 1 - Structure)
  - Create UnitTypesConfigurationStep component
  - Build UnitTypesList component
  - Build UnitTypeCard component
  - Implement add/edit/duplicate/delete actions
  - _Requirements: 3.1, 3.2, 3.9, 3.10_

- [ ] 10. Step 3: Unit Types & Configurations (Part 2 - Modal Tabs)
  - Create UnitTypeModal with tab structure
  - Build Tab1_Identification
  - Build Tab2_Configuration with conditional fields
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 11. Step 3: Unit Types & Configurations (Part 3 - Specifications)
  - Build Tab3_Specifications
  - Create BathroomSpecsSection
  - Create KitchenSpecsSection
  - Create InteriorSpecsSection
  - Create ExteriorSpecsSection
  - _Requirements: 3.6_

- [ ] 12. Step 3: Unit Types & Configurations (Part 4 - Media & Extras)
  - Build Tab4_Media with organized upload zones
  - Build Tab5_ExtrasUpgrades
  - Create UpgradePackageEditor
  - Wire up all tabs to state
  - _Requirements: 3.7, 3.8, 3.11_

- [ ] 13. Step 6: Contact Information & Final Preview
  - Create ContactAndReviewStep component
  - Build ContactPersonsSection (multiple contacts)
  - Build ContactPersonForm
  - Build ComprehensiveReview component
  - Add ReviewSection components for each step
  - Implement Quick Edit navigation
  - Add final submission logic
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

## Phase 5: Wizard Integration

- [ ] 14. Main wizard component
  - Create DevelopmentWizardV3 component
  - Build WizardHeader with progress indicator
  - Build WizardNavigation (Previous/Next/Submit)
  - Implement step routing logic
  - Add step validation before progression
  - _Requirements: All_

- [ ] 15. Draft management
  - Implement auto-save functionality (3-second debounce)
  - Build draft resume dialog
  - Add draft save to database
  - Test draft restoration
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 16. Validation & error handling
  - Implement field-level validation
  - Add step-level validation
  - Build error display components
  - Add network error handling
  - Test all error scenarios
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

## Phase 6: Polish & Testing

- [ ] 17. Responsive design
  - Test on desktop (1920x1080, 1366x768)
  - Test on tablet (iPad, Android tablets)
  - Test on mobile (iPhone, Android phones)
  - Adjust layouts for each breakpoint
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 18. Accessibility
  - Add keyboard navigation support
  - Add ARIA labels and descriptions
  - Test with screen readers
  - Verify color contrast
  - Test touch targets on mobile
  - _Requirements: 10.4, 10.5_

- [ ] 19. Performance optimization
  - Implement lazy loading for steps
  - Add image compression
  - Optimize bundle size
  - Test load times
  - _Requirements: All_

- [ ] 20. End-to-end testing
  - Test complete residential development flow
  - Test complete commercial development flow
  - Test complete land/plots development flow
  - Test phase creation flow
  - Test draft save and restore
  - Test error scenarios
  - _Requirements: All_

## Phase 7: Migration & Deployment

- [ ] 21. Data migration
  - Migrate existing developments to new structure
  - Set default values for new fields
  - Verify data integrity
  - _Requirements: All_

- [ ] 22. Deployment
  - Deploy database migrations
  - Deploy backend updates
  - Deploy frontend updates
  - Monitor for errors
  - _Requirements: All_

- [ ] 23. Documentation
  - Update user documentation
  - Create developer guide
  - Document API changes
  - Create video tutorials
  - _Requirements: All_

## Checkpoint Tasks

- [ ] Checkpoint 1: After Phase 2
  - Ensure all tests pass
  - Verify state management works correctly
  - Ask user if questions arise

- [ ] Checkpoint 2: After Phase 4
  - Ensure all tests pass
  - Verify all components render correctly
  - Test navigation between steps
  - Ask user if questions arise

- [ ] Checkpoint 3: After Phase 6
  - Ensure all tests pass
  - Verify complete wizard flow
  - Test on all devices
  - Ask user if questions arise

- [ ] Final Checkpoint: After Phase 7
  - Ensure all tests pass
  - Verify production deployment
  - Monitor for issues
  - Ask user if questions arise
