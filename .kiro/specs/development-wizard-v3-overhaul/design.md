# Development Wizard V3 - Design Document

## Overview

The Development Wizard V3 is a complete overhaul that transforms the development listing process into a professional-grade, 6-step workflow. This design prioritizes progressive disclosure, logical grouping, and scalability to support residential, commercial, and land developments with single or multi-phase structures.

## Architecture

### High-Level Flow

```
Step 1: Development Type Selection
   ↓
Step 2: Property Type Selection
   ↓
Step 3: Unit Types & Configurations
   ↓
Step 4: Development Details & Amenities
   ↓
Step 5: Development Media
   ↓
Step 6: Contact Information & Final Preview
```

### Key Architectural Decisions

1. **Separation of Concerns**: Development-level data vs Unit-level data
2. **Conditional Rendering**: Property type determines available fields
3. **Nested State Management**: Zustand with persist middleware
4. **Component Modularity**: Each step is a self-contained component
5. **Backward Compatibility**: Maintain existing database schema where possible

## Components and Interfaces

### State Management Structure

```typescript
interface DevelopmentWizardV3State {
  // Wizard Meta
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
  completedSteps: number[];
  
  // Step 1: Development Type
  developmentType: 'new' | 'phase';
  parentDevelopmentId?: number;
  parentDevelopmentData?: {
    name: string;
    location: LocationData;
    amenities: string[];
  };
  
  // Step 2: Property Type
  propertyType: 'residential' | 'commercial' | 'land';
  
  // Step 3: Unit Types
  unitTypes: UnitTypeV3[];
  
  // Step 4: Development Details
  developmentDetails: {
    name: string;
    status: DevelopmentStatus;
    ownershipType: 'freehold' | 'sectional-title' | 'leasehold';
    location: LocationData;
    amenities: AmenitiesByCategory;
    highlights: string[]; // max 5
  };
  
  // Step 5: Development Media
  media: {
    featuredImage: MediaItem;
    exterior: MediaItem[];
    interior: MediaItem[];
    amenities: MediaItem[];
    floorPlans: MediaItem[];
    videos: MediaItem[];
  };
  
  // Step 6: Contact & Review
  contacts: ContactPerson[];
  
  // Actions
  setDevelopmentType: (type: 'new' | 'phase') => void;
  setParentDevelopment: (id: number, data: ParentDevelopmentData) => void;
  setPropertyType: (type: PropertyType) => void;
  addUnitType: (unitType: UnitTypeV3) => void;
  updateUnitType: (id: string, updates: Partial<UnitTypeV3>) => void;
  duplicateUnitType: (id: string) => void;
  // ... more actions
}
```

### Unit Type Structure (Enhanced)

```typescript
interface UnitTypeV3 {
  id: string;
  
  // Tab 1: Identification
  displayName: string;
  internalCode: string;
  
  // Tab 2: Configuration
  bedrooms?: number; // residential only
  bathrooms?: number; // residential only
  floorSize: number; // m²
  yardSize?: number; // residential only
  priceFrom: number;
  priceTo?: number;
  
  // Commercial-specific
  officeLayout?: 'open-plan' | 'cellular' | 'mixed';
  retailBaySize?: number;
  
  // Land-specific
  plotSize?: number;
  zoning?: string;
  servicesAvailable?: string[];
  
  // Tab 3: Specifications
  specifications: {
    bathroom?: BathroomSpecs;
    kitchen?: KitchenSpecs;
    interior?: InteriorSpecs;
    exterior?: ExteriorSpecs;
  };
  
  // Tab 4: Media
  media: {
    interior: MediaItem[];
    exterior: MediaItem[];
    floorPlans: MediaItem[];
    videos: MediaItem[];
    renders3D: MediaItem[];
  };
  
  // Tab 5: Extras & Upgrades
  upgrades: UpgradePackage[];
}

interface UpgradePackage {
  id: string;
  name: string; // "Premium Kitchen", "Smart Home Package"
  description: string;
  priceIncrease: number;
  features: string[];
}
```

### Component Hierarchy

```
DevelopmentWizardV3
├── WizardHeader (progress indicator, save status)
├── Step1_DevelopmentTypeSelection
│   ├── TypeCard (New Development)
│   └── TypeCard (New Phase)
│       └── ParentDevelopmentSelector
├── Step2_PropertyTypeSelection
│   ├── PropertyTypeCard (Residential)
│   ├── PropertyTypeCard (Commercial)
│   └── PropertyTypeCard (Land/Plots)
├── Step3_UnitTypesConfiguration
│   ├── UnitTypesList
│   │   └── UnitTypeCard (with edit/duplicate/delete)
│   └── UnitTypeModal
│       ├── Tab1_Identification
│       ├── Tab2_Configuration
│       ├── Tab3_Specifications
│       │   ├── BathroomSpecsSection
│       │   ├── KitchenSpecsSection
│       │   ├── InteriorSpecsSection
│       │   └── ExteriorSpecsSection
│       ├── Tab4_Media
│       │   ├── MediaUploadZone (Interior)
│       │   ├── MediaUploadZone (Exterior)
│       │   ├── MediaUploadZone (Floor Plans)
│       │   ├── MediaUploadZone (Videos)
│       │   └── MediaUploadZone (3D Renders)
│       └── Tab5_ExtrasUpgrades
│           └── UpgradePackageEditor
├── Step4_DevelopmentDetails
│   ├── DevelopmentInfoSection
│   ├── LocationSection (with map picker)
│   ├── AmenitiesSection (categorized)
│   └── HighlightsSection
├── Step5_DevelopmentMedia
│   ├── FeaturedImageUpload
│   ├── MediaCategoryUpload (Exterior)
│   ├── MediaCategoryUpload (Interior)
│   ├── MediaCategoryUpload (Amenities)
│   ├── MediaCategoryUpload (Floor Plans)
│   └── MediaCategoryUpload (Videos)
├── Step6_ContactAndReview
│   ├── ContactPersonsSection
│   │   └── ContactPersonForm (multiple)
│   └── ComprehensiveReview
│       ├── ReviewSection (Development Type & Property Type)
│       ├── ReviewSection (Unit Types Summary)
│       ├── ReviewSection (Development Details)
│       ├── ReviewSection (Media Summary)
│       └── ReviewSection (Contacts)
└── WizardNavigation (Previous/Next/Submit buttons)
```

## Data Models

### Database Schema Updates

```sql
-- Add new columns to developments table
ALTER TABLE developments
ADD COLUMN property_type ENUM('residential', 'commercial', 'land') NOT NULL DEFAULT 'residential',
ADD COLUMN parent_development_id INT NULL,
ADD COLUMN ownership_type ENUM('freehold', 'sectional_title', 'leasehold') NOT NULL DEFAULT 'freehold',
ADD FOREIGN KEY (parent_development_id) REFERENCES developments(id) ON DELETE SET NULL;

-- Add index for phase lookups
CREATE INDEX idx_developments_parent ON developments(parent_development_id);
CREATE INDEX idx_developments_property_type ON developments(property_type);

-- Expand unit_types table
ALTER TABLE unit_types
ADD COLUMN internal_code VARCHAR(50),
ADD COLUMN office_layout ENUM('open-plan', 'cellular', 'mixed'),
ADD COLUMN retail_bay_size DECIMAL(10,2),
ADD COLUMN plot_size DECIMAL(10,2),
ADD COLUMN zoning VARCHAR(100),
ADD COLUMN services_available JSON,
ADD COLUMN specifications JSON,
ADD COLUMN upgrades JSON;

-- Create contacts table
CREATE TABLE development_contacts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  development_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Step Progression Validation
*For any* wizard state, when attempting to proceed to the next step, the current step must pass all validation rules before progression is allowed.
**Validates: Requirements 1.5, 2.5, 3.11, 4.8, 5.10, 6.7**

### Property 2: Development Type Inheritance
*For any* phase development, when a parent development is selected, the phase must inherit location and amenities from the parent.
**Validates: Requirements 1.4**

### Property 3: Property Type Conditional Fields
*For any* property type selection, only fields relevant to that property type should be visible and required in subsequent steps.
**Validates: Requirements 2.2, 2.3, 2.4, 7.1, 7.2, 7.3**

### Property 4: Unit Type Uniqueness
*For any* development, no two unit types should have the same internal code.
**Validates: Requirements 3.3**

### Property 5: Media Organization Consistency
*For any* media upload, the media item must be stored in exactly one category and maintain its display order within that category.
**Validates: Requirements 5.9**

### Property 6: Contact Person Requirement
*For any* development submission, at least one contact person with valid phone and email must be provided.
**Validates: Requirements 6.3**

### Property 7: Draft Restoration Completeness
*For any* saved draft, when restored, all previously entered data must be present and the wizard must navigate to the last active step.
**Validates: Requirements 8.3**

### Property 8: Validation Error Clarity
*For any* validation failure, the system must display specific, actionable error messages that guide the user to the problematic field.
**Validates: Requirements 9.1, 9.2, 9.4**

## Error Handling

### Validation Errors
- **Field-level**: Inline errors below each field
- **Step-level**: Summary at top of step before progression
- **Form-level**: Comprehensive review in Step 6

### Network Errors
- **Auto-save failures**: Silent retry with status indicator
- **Submission failures**: Modal with retry option
- **Media upload failures**: Per-file error with retry button

### User Errors
- **Duplicate internal codes**: Prevent save with clear message
- **Exceeding limits**: Disable add button with explanation
- **Invalid file types**: Reject with accepted formats list

## Testing Strategy

### Unit Tests
- Validation functions for each field type
- State management actions (add, update, delete)
- Conditional rendering logic
- Media upload handling

### Property-Based Tests
- Property 1: Step progression validation across all steps
- Property 2: Parent development inheritance
- Property 3: Conditional field visibility
- Property 4: Unit type code uniqueness
- Property 5: Media category consistency
- Property 6: Contact person validation
- Property 7: Draft restoration completeness
- Property 8: Error message clarity

### Integration Tests
- Complete wizard flow (all 6 steps)
- Draft save and restore
- Parent development selection and inheritance
- Media upload and organization
- Final submission and backend integration

### E2E Tests
- Create new residential development
- Create phase of existing development
- Create commercial development
- Create land/plots development
- Resume from draft
- Handle network failures gracefully

## Migration Strategy

### Phase 1: Database Schema
1. Run migration to add new columns
2. Set default values for existing developments
3. Verify data integrity

### Phase 2: State Management
1. Create new Zustand store (v3)
2. Implement all actions
3. Add persist middleware
4. Test state transitions

### Phase 3: Component Development
1. Build Step 1 & 2 (type selectors)
2. Build Step 4 (development details)
3. Build Step 5 (media - extract from existing)
4. Build Step 3 (unit types - reorganize existing)
5. Build Step 6 (contact & review)

### Phase 4: Integration
1. Wire up all steps to state
2. Implement navigation logic
3. Add validation
4. Test complete flow

### Phase 5: Backend Integration
1. Update API endpoints
2. Handle new data structure
3. Test submission
4. Deploy

## Performance Considerations

- **Lazy Loading**: Load step components only when needed
- **Image Optimization**: Compress uploads before storage
- **Debounced Auto-save**: Prevent excessive saves
- **Virtualized Lists**: For developments with many unit types
- **Code Splitting**: Separate bundles per step

## Accessibility

- **Keyboard Navigation**: Full tab order support
- **Screen Readers**: ARIA labels on all interactive elements
- **Focus Management**: Trap focus in modals
- **Color Contrast**: WCAG AA compliance
- **Touch Targets**: Minimum 44x44px on mobile
