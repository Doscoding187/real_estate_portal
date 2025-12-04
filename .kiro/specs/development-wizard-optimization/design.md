# Design Document

## Overview

This design optimizes the Developer Listing Wizard to provide a streamlined, intuitive experience for creating master developments and multi-phase developments. The optimization focuses on progressive disclosure, map-first location input, and clear separation between master and phase creation flows.

## Architecture

### Component Structure

```
DevelopmentWizard (Main Container)
├── DevelopmentTypeSelector (NEW - Step 0)
│   ├── NewDevelopmentCard
│   └── NewPhaseCard
├── BasicDetailsStep (Optimized)
│   ├── BasicInformationSection
│   ├── LocationSection (Map-First)
│   └── ProjectOverviewSection
├── PhaseDetailsStep (NEW)
│   ├── ParentLinkSection
│   ├── PhaseInformationSection
│   └── OptionalPhaseDetailsSection (Collapsible)
├── UnitTypesStep (Existing)
├── HighlightsStep (Existing)
├── MediaUploadStep (Existing)
├── UnitMediaStep (Existing)
├── DeveloperInfoStep (Existing)
└── PreviewStep (Existing)
```

### Data Flow

1. User selects development type (master or phase)
2. System conditionally renders appropriate step sequence
3. Form data flows through Zustand store
4. Auto-save persists to localStorage and database
5. Submission creates appropriate database records with relationships

## Components and Interfaces

### DevelopmentTypeSelector Component

**Purpose:** Initial step to determine creation flow

**Props:**
```typescript
interface DevelopmentTypeSelectorProps {
  onSelect: (type: 'master' | 'phase') => void;
}
```

**State:**
- Selected type: 'master' | 'phase' | null

**Behavior:**
- Displays two large, visually distinct cards
- Highlights selected card
- Proceeds to appropriate step sequence on selection

### Optimized BasicDetailsStep Component

**Sections:**

1. **Basic Information**
   - Development Name (text input, min 5 chars)
   - Development Status (multi-select badges)
   - Developer Name (read-only, auto-filled)
   - Rating (read-only, system-calculated)

2. **Location (Map-First)**
   - Interactive Map with Pin Drop
   - GPS Accuracy Indicator
   - Auto-populated Address Fields
   - Manual Override Toggle
   - "No official street yet" option

3. **Project Overview**
   - Total Units (number input)
   - Project Size (number input with unit selector)
   - Project Highlights (tag input, max 5)
   - Project Description (rich text)

### PhaseDetailsStep Component (NEW)

**Sections:**

1. **Link to Parent**
   - Parent Development Dropdown (filtered by user's developments)

2. **Phase Information**
   - Phase Name/Number (text input)
   - Spec Type (select: Affordable/GAP/Luxury/Custom)
   - Phase Status (multi-select badges)

3. **Optional Phase Details** (Collapsible)
   - Units in Phase
   - Finishing Differences (Kitchen/Bathrooms/Flooring/Electrical)
   - Phase Highlights
   - Expected Completion Date
   - Phase Description

## Data Models

### Enhanced Development Model

```typescript
interface Development {
  id: number;
  developerId: number;
  name: string;
  slug: string;
  description: string;
  developmentType: 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'complex';
  status: 'now-selling' | 'launching-soon' | 'under-construction' | 'ready-to-move' | 'sold-out' | 'phase-1-complete';
  
  // Location
  address: string;
  city: string;
  province: string;
  suburb?: string;
  postalCode?: string;
  latitude: string;
  longitude: string;
  gpsAccuracy: 'accurate' | 'approximate';
  
  // Overview
  totalUnits: number;
  availableUnits: number;
  projectSize?: number; // in acres
  projectHighlights: string[]; // max 5
  
  // Pricing
  priceFrom?: number;
  priceTo?: number;
  
  // Media
  images: string[];
  videos: string[];
  floorPlans: string[];
  brochures: string[];
  
  // Metadata
  rating?: number; // auto-calculated
  views: number;
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt?: Date;
  showHouseAddress: boolean;
  completionDate?: Date;
  
  // Relationships
  phases?: DevelopmentPhase[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### DevelopmentPhase Model (NEW)

```typescript
interface DevelopmentPhase {
  id: number;
  developmentId: number; // Foreign key to parent
  name: string; // e.g., "Phase 2", "Extension 57"
  phaseNumber: number;
  description?: string;
  
  // Spec Type
  specType: 'affordable' | 'gap' | 'luxury' | 'custom';
  customSpecType?: string;
  
  // Status
  status: 'planning' | 'pre-launch' | 'selling' | 'sold-out' | 'completed';
  
  // Units
  totalUnits: number;
  availableUnits: number;
  
  // Pricing
  priceFrom?: number;
  priceTo?: number;
  
  // Dates
  launchDate?: Date;
  completionDate?: Date;
  
  // Finishing Differences
  finishingDifferences?: {
    kitchen?: string[];
    bathrooms?: string[];
    flooring?: string[];
    electrical?: string[];
  };
  
  // Phase-specific highlights
  phaseHighlights?: string[];
  
  // Location override (optional)
  latitude?: string;
  longitude?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Wizard State Model

```typescript
interface DevelopmentWizardState {
  // Wizard Flow
  developmentType: 'master' | 'phase' | null;
  currentStep: number;
  
  // Master Development Fields
  developmentName: string;
  address: string;
  city: string;
  province: string;
  suburb?: string;
  postalCode?: string;
  latitude: string;
  longitude: string;
  gpsAccuracy?: 'accurate' | 'approximate';
  status: string;
  rating?: number;
  totalUnits: number;
  projectSize?: number;
  projectHighlights: string[];
  
  // Phase Fields
  parentDevelopmentId?: number;
  phaseName?: string;
  phaseNumber?: number;
  specType?: 'affordable' | 'gap' | 'luxury' | 'custom';
  customSpecType?: string;
  phaseStatus?: string;
  unitsInPhase?: number;
  finishingDifferences?: {
    kitchen?: string[];
    bathrooms?: string[];
    flooring?: string[];
    electrical?: string[];
  };
  phaseHighlights?: string[];
  phaseCompletionDate?: string;
  phaseDescription?: string;
  
  // ... existing fields
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Development type selection determines field visibility

*For any* wizard session, when a development type is selected, only the fields relevant to that type should be visible and required
**Validates: Requirements 1.2, 1.3**

### Property 2: Map pin drop populates address fields

*For any* valid GPS coordinates, when a pin is dropped on the map, the system should populate address fields through reverse geocoding
**Validates: Requirements 3.2, 3.3**

### Property 3: GPS accuracy reflects geocoding quality

*For any* reverse geocoding result, the GPS accuracy indicator should be "accurate" for precise results and "approximate" for less precise results
**Validates: Requirements 3.4, 3.5**

### Property 4: Project highlights are limited to 5

*For any* development, the number of project highlights should never exceed 5
**Validates: Requirements 4.3**

### Property 5: Phase inherits parent location by default

*For any* phase without explicit location override, the latitude and longitude should match the parent development
**Validates: Requirements 6.4**

### Property 6: Parent development updates on phase creation

*For any* new phase creation, the parent development's phase count and phase list should be automatically updated
**Validates: Requirements 6.3**

### Property 7: Required fields prevent progression

*For any* wizard step with required fields, the user should not be able to proceed to the next step until all required fields are valid
**Validates: Requirements 9.1, 9.4**

### Property 8: Auto-save preserves wizard state

*For any* wizard session with changes, the state should be persisted to storage within 3 seconds of the last change
**Validates: Requirements 8.1**

### Property 9: Resume draft restores exact state

*For any* saved draft, when resumed, all field values should match the saved state exactly
**Validates: Requirements 8.2**

### Property 10: Development name validation

*For any* development name input, the system should reject names with fewer than 5 characters
**Validates: Requirements 9.5**

## Error Handling

### Validation Errors

- Display inline errors immediately on blur
- Clear errors on successful correction
- Prevent form submission with validation errors
- Show field-specific guidance messages

### Network Errors

- Retry failed auto-save operations
- Display connection status indicator
- Queue changes for retry when offline
- Notify user of sync status

### Geocoding Errors

- Fall back to manual address entry
- Display error message with retry option
- Allow proceeding with approximate location
- Validate address format manually

## Testing Strategy

### Unit Tests

- Test development type selection logic
- Test field visibility based on type
- Test validation rules for each field
- Test auto-save debouncing
- Test draft restoration logic

### Property-Based Tests

**Framework:** fast-check (for TypeScript/JavaScript)

**Configuration:** Minimum 100 iterations per property

**Property 1 Test:** Development type selection determines field visibility
```typescript
// Feature: development-wizard-optimization, Property 1
fc.assert(
  fc.property(
    fc.constantFrom('master', 'phase'),
    (developmentType) => {
      const visibleFields = getVisibleFields(developmentType);
      if (developmentType === 'master') {
        return visibleFields.includes('projectSize') && 
               visibleFields.includes('projectHighlights');
      } else {
        return visibleFields.includes('parentDevelopmentId') && 
               visibleFields.includes('specType');
      }
    }
  ),
  { numRuns: 100 }
);
```

**Property 4 Test:** Project highlights are limited to 5
```typescript
// Feature: development-wizard-optimization, Property 4
fc.assert(
  fc.property(
    fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
    (highlights) => {
      const result = addProjectHighlights(highlights);
      return result.length <= 5;
    }
  ),
  { numRuns: 100 }
);
```

**Property 10 Test:** Development name validation
```typescript
// Feature: development-wizard-optimization, Property 10
fc.assert(
  fc.property(
    fc.string(),
    (name) => {
      const isValid = validateDevelopmentName(name);
      return (name.length >= 5) === isValid;
    }
  ),
  { numRuns: 100 }
);
```

### Integration Tests

- Test complete wizard flow for master development
- Test complete wizard flow for phase creation
- Test draft save and restore
- Test navigation between steps
- Test form submission

### E2E Tests

- Test user journey from type selection to submission
- Test map interaction and address population
- Test phase linking to parent development
- Test error recovery scenarios
