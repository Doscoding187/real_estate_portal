# Implementation Plan: Listing Wizard & Prospect Dashboard Polish

## Overview

This implementation plan covers polishing two wizards (Listing Wizard for properties, Development Wizard for developments) and the Prospect Dashboard. Tasks are organized by feature area and prioritized for incremental delivery.

---

## Phase 1: Shared Validation System

- [x] 1. Create shared validation engine



  - Create `client/src/lib/validation/ValidationEngine.ts` with rule-based validation
  - Implement validation rules for common fields (title, description, email, phone)
  - Add support for conditional validation based on context
  - _Requirements: 1.1, 1.2, 1.3_




- [ ] 1.1 Create InlineError component
  - Create `client/src/components/ui/InlineError.tsx` with Framer Motion animations
  - Add error icon and message display




  - Implement fade-in/fade-out transitions
  - _Requirements: 1.1, 1.3_

- [x] 1.2 Add validation to Listing Wizard steps


  - Update `ActionStep.tsx` with required field validation
  - Update `PropertyTypeStep.tsx` with required field validation
  - Update `BasicInformationStep.tsx` with title/description validation (min/max length)
  - Update `PricingStep.tsx` with numeric validation and range checks
  - Update `LocationStep.tsx` with address/coordinates validation
  - _Requirements: 1.1, 1.2, 1.5_




- [ ] 1.3 Add validation to Development Wizard steps
  - Update `BasicDetailsStep.tsx` with name/address validation
  - Update `UnitTypesStep.tsx` with unit configuration validation
  - Update `HighlightsStep.tsx` with description validation
  - Update `DeveloperInfoStep.tsx` with contact details validation


  - _Requirements: 1.1, 1.2, 10.1, 10.4_

---



## Phase 2: Draft Management & Auto-Save

- [ ] 2. Implement auto-save hook
  - Create `client/src/hooks/useAutoSave.ts` with debounced localStorage writes


  - Add last-saved timestamp tracking
  - Implement error handling for storage quota exceeded
  - _Requirements: 2.1, 2.3_

- [ ] 2.1 Add auto-save to Listing Wizard
  - Integrate `useAutoSave` hook in `ListingWizard.tsx`
  - Display "Last saved" indicator in UI



  - Show save status (saving/saved) with icon
  - _Requirements: 2.1, 2.3_

- [ ] 2.2 Add auto-save to Development Wizard
  - Integrate `useAutoSave` hook in `DevelopmentWizard.tsx`
  - Display "Last saved" indicator in UI


  - Show save status (saving/saved) with icon
  - _Requirements: 2.1, 2.3_

- [ ] 2.3 Enhance draft resume dialog
  - Update `DraftManager` component with better UI


  - Show draft details (step, property type, last modified)
  - Add "Start Fresh" and "Resume Draft" buttons
  - Implement draft cleanup on successful submission
  - _Requirements: 2.2, 2.4, 2.5_


---

## Phase 3: Media Upload Enhancements

- [x] 3. Create enhanced media upload zone


  - Create `client/src/components/media/MediaUploadZone.tsx` with drag-and-drop
  - Add visual feedback for drag-over state (blue border)
  - Implement file validation (type, size)
  - Show error messages for invalid files


  - _Requirements: 3.1, 3.4, 3.6_

- [ ] 3.1 Add upload progress indicators
  - Create `client/src/components/media/UploadProgressBar.tsx`


  - Show individual progress for each file
  - Display upload speed and time remaining
  - Add cancel button for in-progress uploads
  - _Requirements: 3.2_

- [ ] 3.2 Implement media reordering
  - Create `client/src/components/media/SortableMediaGrid.tsx` using @dnd-kit
  - Add drag handles to media thumbnails
  - Show visual feedback during drag (opacity, shadow)
  - Update display order on drop
  - _Requirements: 3.3_

- [ ] 3.3 Add primary media selection
  - Add "Set as Primary" button to media thumbnails
  - Display "Primary" badge on selected image
  - Ensure only one primary media item
  - _Requirements: 3.4_

- [ ] 3.4 Add media type indicators
  - Display video icon overlay on video thumbnails
  - Display PDF icon for document uploads
  - Display floorplan icon for floorplan uploads
  - _Requirements: 3.5_

- [ ] 3.5 Update Listing Wizard media step
  - Replace existing media upload with new `MediaUploadZone`
  - Integrate `SortableMediaGrid` for reordering
  - Add primary media selection UI
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3.6 Update Development Wizard media step
  - Replace existing media upload with new `MediaUploadZone`
  - Add media categorization (featured, amenities, outdoors, videos)
  - Integrate `SortableMediaGrid` for reordering
  - _Requirements: 3.1, 3.2, 3.3, 10.3_

---

## Phase 4: Prospect Dashboard UX

- [ ] 4. Enhance dashboard animations
  - Update `ProspectDashboard.tsx` with smooth slide-in animation (300ms)



  - Add spring physics to panel transitions
  - Implement smooth collapse/expand animations
  - _Requirements: 4.1_

- [ ] 4.1 Add real-time buyability calculation
  - Update calculation to trigger on form field change

  - Add debouncing (500ms) to prevent excessive API calls
  - Show loading spinner during calculation
  - _Requirements: 4.2_

- [x] 4.2 Animate buyability score changes


  - Create `client/src/components/prospect/BuyabilityScoreBadge.tsx`
  - Add color transition animation (green/yellow/red)
  - Implement scale animation on score change
  - Add confetti effect for high scores



  - _Requirements: 4.3_

- [x] 4.3 Add personalized recommendations


  - Update recommendations query to filter by affordability range
  - Display top 3 matching properties
  - Add "View All" button to see more recommendations
  - _Requirements: 4.4_

- [ ] 4.4 Implement collapsible floating button
  - Create floating button that shows when dashboard is collapsed

  - Display current buyability score on button
  - Animate button appearance/disappearance
  - Add pulse animation to draw attention
  - _Requirements: 4.5_

---




## Phase 5: Step Navigation Enhancement

- [x] 5. Create enhanced progress indicator



  - Create `client/src/components/wizard/ProgressIndicator.tsx`
  - Add step numbers with completion checkmarks
  - Implement hover effects on completed steps



  - Add tooltips for inaccessible steps
  - _Requirements: 5.1, 5.2, 5.3, 5.4_




- [ ] 5.1 Add step click navigation
  - Allow clicking on completed steps to navigate
  - Prevent clicking on future incomplete steps
  - Show tooltip "Complete previous steps first" on disabled steps
  - _Requirements: 5.3, 5.4_

- [ ] 5.2 Update Listing Wizard progress indicator
  - Replace existing progress indicator with new component
  - Add step completion tracking
  - Implement visual feedback (green checkmarks, blue ring)
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 5.3 Update Development Wizard progress indicator
  - Replace existing progress indicator with new component
  - Add step completion tracking
  - Implement visual feedback (green checkmarks, blue ring)
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 5.4 Add preview step summary
  - Create `client/src/components/wizard/PreviewSummary.tsx`
  - Display all entered information in organized sections
  - Add "Edit" buttons next to each section to jump back
  - Show validation warnings for incomplete optional fields
  - _Requirements: 5.5_

---

## Phase 6: Error Recovery & Feedback

- [ ] 6. Create error recovery system
  - Create `client/src/lib/errors/ErrorRecoveryStrategy.ts`
  - Define error types (network, validation, server, upload)
  - Implement retry logic for recoverable errors
  - Add error logging for debugging
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.1 Create ErrorAlert component
  - Create `client/src/components/ui/ErrorAlert.tsx`
  - Display error message with icon
  - Add "Retry" button for recoverable errors
  - Add "Dismiss" button to close alert
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 6.2 Add network error handling
  - Detect network failures during API calls
  - Show "Connection lost" message with draft saved confirmation
  - Implement automatic retry with exponential backoff
  - _Requirements: 6.1_

- [ ] 6.3 Add server validation error handling
  - Parse server validation errors from API responses
  - Map errors to specific form fields
  - Highlight affected steps in progress indicator
  - _Requirements: 6.2, 6.5_

- [ ] 6.4 Add session expiry handling
  - Detect 401 Unauthorized responses
  - Show "Session expired" dialog
  - Save draft before redirecting to login
  - Restore draft after re-authentication
  - _Requirements: 6.3_

- [ ] 6.5 Add upload error handling
  - Show retry button next to failed uploads
  - Display specific error message (file too large, invalid type, etc.)
  - Allow removing failed uploads
  - _Requirements: 6.4_

---

## Phase 7: Data Persistence

- [ ] 7. Enhance prospect data persistence
  - Update `prospects.createProspect` mutation to link session to email
  - Implement session restoration on return visit
  - Add "Remember me" checkbox for persistent sessions
  - _Requirements: 7.1, 7.2_

- [ ] 7.1 Add real-time buyability updates
  - Trigger recalculation on any form field change
  - Update affordability range immediately
  - Refresh recommendations when range changes
  - _Requirements: 7.3_

- [ ] 7.2 Implement favorites persistence
  - Save favorites to database linked to session
  - Display favorites count in dashboard header
  - Add "Remove" button to favorite items
  - _Requirements: 7.4_

- [ ] 7.3 Add recently viewed tracking
  - Track property views by session ID
  - Display last 5 viewed properties
  - Add "View Again" button to recently viewed items
  - _Requirements: 7.5_

---

## Phase 8: Mobile Responsiveness

- [ ] 8. Create mobile-optimized layouts
  - Update Listing Wizard with single-column layout for mobile
  - Update Development Wizard with single-column layout for mobile
  - Increase touch target sizes to minimum 44x44px
  - Add bottom navigation for easier thumb access
  - _Requirements: 8.1, 8.5_

- [ ] 8.1 Implement mobile prospect dashboard
  - Make dashboard full-screen on mobile devices
  - Add swipe-to-close gesture
  - Optimize form fields for mobile keyboards
  - _Requirements: 8.2_

- [ ] 8.2 Add camera integration for mobile
  - Add "Take Photo" button on mobile devices
  - Request camera permissions
  - Capture photos directly from camera
  - _Requirements: 8.3_

- [ ] 8.3 Implement swipe gestures
  - Add swipe left/right for step navigation
  - Add visual feedback during swipe
  - Prevent accidental swipes with threshold
  - _Requirements: 8.4_

---

## Phase 9: Accessibility

- [ ] 9. Implement keyboard navigation
  - Add Tab key navigation through all interactive elements
  - Add Enter/Space key activation for buttons
  - Add Escape key to close dialogs
  - Add Arrow keys for step navigation
  - _Requirements: 9.1, 9.2_

- [ ] 9.1 Add screen reader support
  - Add ARIA labels to all interactive elements
  - Add ARIA live regions for dynamic content (errors, success messages)
  - Add ARIA invalid for error states
  - Use semantic HTML (nav, main, section, article)
  - _Requirements: 9.3_

- [ ] 9.2 Enhance visual accessibility
  - Ensure 4.5:1 contrast ratio for all text
  - Add visible focus indicators (2px outline)
  - Associate error messages with form fields using aria-describedby
  - Avoid color-only indicators (add icons)
  - _Requirements: 9.4, 9.5_

---

## Phase 10: Performance Optimization

- [ ] 10. Implement lazy loading
  - Lazy load wizard step components
  - Lazy load media upload libraries (@dnd-kit, image compression)
  - Defer non-critical animations
  - _Requirements: 12.1_

- [ ] 10.1 Add client-side image compression
  - Install browser-image-compression library
  - Compress images before upload (max 1920px width, 80% quality)
  - Show compression progress
  - _Requirements: 12.2_

- [ ] 10.2 Implement memoization
  - Memoize buyability calculation with useMemo
  - Memoize expensive validation checks
  - Use React.memo for static components
  - _Requirements: 12.4_

- [ ] 10.3 Add loading indicators
  - Show skeleton loaders for initial wizard load
  - Show spinner for API calls taking > 1 second
  - Show progress bar for file uploads
  - _Requirements: 12.5_

---

## Phase 11: Testing & Quality Assurance

- [ ] 11. Write unit tests for validation engine
  - Test title length validation
  - Test email format validation
  - Test phone number validation
  - Test pricing validation based on action type
  - Test conditional validation rules
  - _Requirements: All validation requirements_

- [ ] 11.1 Write unit tests for auto-save hook
  - Test debouncing behavior
  - Test localStorage writes
  - Test error handling for quota exceeded
  - Test last-saved timestamp updates
  - _Requirements: 2.1, 2.3_

- [ ] 11.2 Write integration tests for wizard flows
  - Test complete Listing Wizard flow (all 8 steps)
  - Test complete Development Wizard flow (all 6 steps)
  - Test draft save and resume flow
  - Test media upload and reorder flow
  - Test error recovery flows
  - _Requirements: All wizard requirements_

- [ ] 11.3 Write integration tests for Prospect Dashboard
  - Test buyability calculation flow
  - Test form step navigation
  - Test favorites management
  - Test recommendations display
  - _Requirements: All prospect dashboard requirements_

---

## Phase 12: Final Polish & Deployment

- [ ] 12. Conduct accessibility audit
  - Run axe DevTools on all wizard pages
  - Test keyboard navigation manually
  - Test with screen reader (NVDA/JAWS)
  - Fix any identified issues
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 12.1 Conduct performance audit
  - Run Lighthouse on wizard pages
  - Measure time to interactive
  - Measure first contentful paint
  - Optimize any slow operations
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 12.2 Conduct mobile testing
  - Test on iOS Safari
  - Test on Android Chrome
  - Test on various screen sizes (320px - 768px)
  - Test touch gestures
  - Test camera integration
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12.3 Create user documentation
  - Write guide for Listing Wizard
  - Write guide for Development Wizard
  - Write guide for Prospect Dashboard
  - Add tooltips and help text in UI
  - _Requirements: All requirements_

- [ ] 12.4 Deploy to staging
  - Deploy Phase 1-10 changes to staging environment
  - Run smoke tests
  - Conduct user acceptance testing
  - Fix any critical bugs
  - _Requirements: All requirements_

- [ ] 12.5 Deploy to production
  - Deploy to production with feature flags
  - Monitor error rates and performance metrics
  - Collect user feedback
  - Plan follow-up improvements
  - _Requirements: All requirements_

---

## Checkpoint Tasks

- [ ] Checkpoint 1: After Phase 3
  - Ensure all tests pass
  - Verify validation works across both wizards
  - Verify draft management works correctly
  - Verify media upload works with drag-and-drop
  - Ask user if questions arise

- [ ] Checkpoint 2: After Phase 6
  - Ensure all tests pass
  - Verify step navigation works smoothly
  - Verify error recovery works for all error types
  - Verify prospect dashboard animations are smooth
  - Ask user if questions arise

- [ ] Checkpoint 3: After Phase 9
  - Ensure all tests pass
  - Verify mobile responsiveness on real devices
  - Verify accessibility with keyboard and screen reader
  - Verify performance meets targets (< 3s load time)
  - Ask user if questions arise

- [ ] Final Checkpoint: Before Production
  - Ensure all tests pass
  - Verify all requirements are met
  - Verify documentation is complete
  - Verify staging environment is stable
  - Get user approval for production deployment
