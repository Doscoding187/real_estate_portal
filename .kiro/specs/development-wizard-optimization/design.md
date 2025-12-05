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
├── UnitTypesStepEnhanced (NEW - Optimized)
│   ├── UnitTypeCard (Display Component)
│   └── UnitTypeModal (4-Tab Modal)
│       ├── BasicInfoTab
│       ├── SpecificationsTab
│       │   ├── InheritedSpecsSection
│       │   ├── OverridesSection
│       │   └── CustomSpecsSection
│       ├── MediaTab
│       │   ├── FloorPlansUpload
│       │   ├── InteriorImagesUpload
│       │   ├── ExteriorImagesUpload
│       │   ├── RenderingsUpload
│       │   └── VirtualTourInput
│       └── ExtrasTab
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

### UnitTypesStepEnhanced Component (NEW - Optimized)

**Purpose:** Comprehensive unit type management with 4-tab modal interface

**Main View:**
- Card-based display of configured unit types
- Quick actions: Add, Edit, Duplicate, Delete
- Empty state with call-to-action
- Summary statistics (total types, units, price range)

**UnitTypeCard Component:**

Displays unit type summary:
- Unit type name
- Bedrooms, bathrooms, floor size
- Price range
- Available units
- Quick action buttons (Edit, Duplicate, Delete)

**UnitTypeModal Component (4-Tab Interface):**

**Tab 1: Basic Info**
- Unit Type Name (required)
- Bedrooms & Bathrooms (required)
- Floor Size & Yard Size (optional)
- Price Range (min required, max optional)
- Parking Options (None/1/2/Carport/Garage)
- Available Units (required)
- Completion Date (optional)
- Deposit Required (optional)
- Internal Notes (optional, hidden from buyers)

**Tab 2: Specifications**

*Section A: Inherited Master Specifications (Read-only)*
- Kitchen Type, Countertops, Flooring
- Bathroom Finish, Geyser, Electricity, Security
- Displayed with "Inherited from Development Settings" label

*Section B: Unit-Specific Overrides (Toggle-based)*
- Each spec has "Use Master Spec?" toggle
- When OFF, field becomes editable
- Override fields: Kitchen Finish, Countertop Material, Flooring Type, Bathroom Fixtures, Wall Finish, Energy Efficiency
- Only overridden fields stored in database

*Section C: Custom Specifications (Unlimited)*
- Repeatable Field Name / Value pairs
- Add/Remove functionality
- Examples: "Smart Home Automation" → "Optional"

**Tab 3: Media**

Categories with separate upload zones:
- Floor Plans (images & PDFs)
- Interior Images
- Exterior Images
- 3D Renderings
- Virtual Tour Link (URL input)

Features:
- Drag & drop upload
- Set primary image per unit type
- Remove media
- Category-based organization

**Tab 4: Optional Extras / Upgrade Packs**

Repeatable upgrade list:
- Upgrade Name (required)
- Description
- Price (optional)
- Add/Remove functionality
- Total value calculation
- Example upgrades display

**Inheritance Model:**

```
Final Unit Specs = Master Specs + Overrides + Custom Specs
```

This prevents duplication and makes updates efficient:
- Master specs update → all units inherit automatically
- Only store differences at unit level
- Custom specs handle unique requirements

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

### UnitType Model (NEW - Enhanced)

```typescript
interface UnitType {
  id: string;
  developmentId: number;
  
  // Basic Configuration
  label: string; // e.g., "2 Bedroom Apartment", "60m² Simplex"
  ownershipType: 'full-title' | 'sectional-title' | 'leasehold' | 'life-rights';
  structuralType: 'apartment' | 'freestanding-house' | 'simplex' | 'duplex' | 'penthouse' | 'plot-and-plan' | 'townhouse' | 'studio';
  bedrooms: number;
  bathrooms: number;
  floors?: 'single-storey' | 'double-storey' | 'triplex';
  
  // Sizes
  unitSize?: number; // in m²
  yardSize?: number; // in m² (for freestanding properties)
  
  // Pricing
  priceFrom: number;
  priceTo?: number;
  
  // Parking & Availability
  parking?: 'none' | '1' | '2' | 'carport' | 'garage';
  availableUnits: number;
  completionDate?: string;
  depositRequired?: number;
  internalNotes?: string; // Hidden from buyers
  
  // Media & Description
  configDescription?: string;
  virtualTourLink?: string;
  unitMedia?: Array<{
    id: string;
    url: string;
    type: 'image' | 'pdf';
    category: 'floorplan' | 'interior' | 'exterior' | 'rendering';
    isPrimary: boolean;
  }>;
  
  // Specification Overrides (Inheritance Model)
  specOverrides?: Record<string, boolean>; // Which specs are overridden
  kitchenFinish?: string;
  countertopMaterial?: string;
  flooringType?: string;
  bathroomFixtures?: string;
  wallFinish?: string;
  energyEfficiency?: string;
  
  // Custom Specifications
  customSpecs?: Array<{
    name: string;
    value: string;
  }>;
  
  // Upgrade Packs
  upgradePacks?: Array<{
    id: string;
    name: string;
    description: string;
    price?: number;
  }>;
  
  // Metadata
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Database Schema for UnitType:**

```sql
CREATE TABLE unit_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  development_id INT NOT NULL,
  label VARCHAR(255) NOT NULL,
  
  -- Basic Configuration
  ownership_type ENUM('full-title', 'sectional-title', 'leasehold', 'life-rights'),
  structural_type ENUM('apartment', 'freestanding-house', 'simplex', 'duplex', 'penthouse', 'plot-and-plan', 'townhouse', 'studio'),
  bedrooms INT NOT NULL,
  bathrooms DECIMAL(3,1) NOT NULL,
  floors ENUM('single-storey', 'double-storey', 'triplex'),
  
  -- Sizes & Pricing
  unit_size INT,
  yard_size INT,
  price_from DECIMAL(15,2) NOT NULL,
  price_to DECIMAL(15,2),
  
  -- Parking & Availability
  parking ENUM('none', '1', '2', 'carport', 'garage'),
  available_units INT NOT NULL,
  completion_date DATE,
  deposit_required DECIMAL(15,2),
  internal_notes TEXT,
  
  -- Media & Description
  config_description TEXT,
  virtual_tour_link VARCHAR(500),
  
  -- Specification Overrides (JSON)
  spec_overrides JSON,
  kitchen_finish VARCHAR(255),
  countertop_material VARCHAR(255),
  flooring_type VARCHAR(255),
  bathroom_fixtures VARCHAR(255),
  wall_finish VARCHAR(255),
  energy_efficiency VARCHAR(255),
  
  -- Custom Specs & Upgrades (JSON)
  custom_specs JSON,
  upgrade_packs JSON,
  unit_media JSON,
  
  -- Metadata
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  INDEX idx_development_id (development_id),
  INDEX idx_price_range (price_from, price_to),
  INDEX idx_bedrooms_bathrooms (bedrooms, bathrooms)
);
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

### Property 11: Unit type specification inheritance

*For any* unit type without specification overrides, the final specifications should equal the master development specifications
**Validates: Requirements 6C.5**

### Property 12: Specification override storage

*For any* unit type with specification overrides, only the overridden fields should be stored in the database, not the inherited values
**Validates: Requirements 6C.4**

### Property 13: Unit type required fields validation

*For any* unit type, the system should require unit type name, bedrooms, bathrooms, minimum price, and available units before allowing save
**Validates: Requirements 6B.1**

### Property 14: Unit media category organization

*For any* uploaded media item, it should be assigned to exactly one category (floorplan, interior, exterior, or rendering)
**Validates: Requirements 6E.1**

### Property 15: Primary image uniqueness per unit type

*For any* unit type, at most one media item should be marked as primary
**Validates: Requirements 6E.4**

### Property 16: Upgrade pack total calculation

*For any* unit type with upgrade packs, the total optional value should equal the sum of all upgrade pack prices
**Validates: Requirements 6F.4**

### Property 17: Unit type duplication creates independent copy

*For any* unit type that is duplicated, the copy should have a unique ID and "(Copy)" appended to the name
**Validates: Requirements 6A.5**

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
