# Design Document

## Overview

This design implements a comprehensive 5-step Developer Listing Wizard that enables property developers to create detailed development listings with multiple unit types, spec variations, and complete project information. The system uses progressive disclosure, specification inheritance, and a clean tab-based interface to manage complexity while maintaining simplicity.

The wizard follows industry-standard patterns used by major property platforms (Property24, Zillow New Homes, BuilderTrend) with clear separation between:
- Development-level information (shared across all units)
- Unit type defaults (templates for variations)
- Spec variations (specific configurations with pricing)

## Architecture

### 5-Step Wizard Flow

```
Step 1: Development Details
├── Basic Information (name, status, completion date, description)
├── Location (pin-drop map with reverse geocoding)
├── Development Amenities (shared facilities)
└── Development Highlights (up to 5 key selling points)

Step 2: Unit Types & Configurations
├── Unit Type Cards (display all configured types)
└── Unit Type Modal (3-tab interface)
    ├── Tab A: Base Configuration
    │   ├── Unit Type Name, Bedrooms, Bathrooms
    │   ├── Parking, Size, Price Range
    │   ├── Base Features (defaults for all specs)
    │   ├── Base Finishes
    │   └── Base Media
    ├── Tab B: Specs & Variations
    │   ├── Spec List (Standard, GAP, Premium, etc.)
    │   └── Spec Card (expandable)
    │       ├── Spec Name, Price, Description
    │       ├── Bedrooms/Bathrooms/Size overrides
    │       ├── Feature Overrides (add/remove/replace)
    │       ├── Spec-Specific Media
    │       └── Spec-Specific Documents
    └── Tab C: Media
        ├── Photos
        ├── Floor Plans
        ├── Videos
        └── PDFs

Step 3: Development Features & Specifications
└── Estate-Level Features (infrastructure, security, utilities)

Step 4: Documents
└── Document Uploads (brochures, plans, pricing sheets, rules)

Step 5: Review & Publish
├── Development Summary
├── Unit Types Summary (with all specs)
├── Features Summary
├── Documents Summary
└── Actions (Save as Draft / Publish)
```

### Component Structure

```
DevelopmentWizard (Main Container)
├── WizardProgress (5-step indicator)
├── Step1: DevelopmentDetailsStep
│   ├── BasicInformationSection
│   ├── LocationSection (with LocationMapPicker)
│   ├── DevelopmentAmenitiesSection
│   └── DevelopmentHighlightsSection
├── Step2: UnitTypesStep
│   ├── UnitTypeCard[] (display grid)
│   ├── EmptyState (when no types)
│   └── UnitTypeModal
│       ├── TabNavigation
│       ├── BaseConfigurationTab
│       │   ├── BasicInfoSection
│       │   ├── BaseFeaturesSection
│       │   ├── BaseFinishesSection
│       │   └── BaseMediaSection
│       ├── SpecsVariationsTab
│       │   ├── SpecCard[] (expandable cards)
│       │   └── SpecModal
│       │       ├── SpecBasicInfo
│       │       ├── FeatureOverrides
│       │       ├── SpecMedia
│       │       └── SpecDocuments
│       └── MediaTab
│           ├── PhotosUpload
│           ├── FloorPlansUpload
│           ├── VideosUpload
│           └── PDFsUpload
├── Step3: DevelopmentFeaturesStep
│   └── FeatureSelector (multi-select)
├── Step4: DocumentsStep
│   └── DocumentUploader (categorized)
└── Step5: ReviewPublishStep
    ├── DevelopmentSummary
    ├── UnitTypesSummary
    ├── FeaturesSummary
    ├── DocumentsSummary
    └── PublishActions
```

### Data Flow & State Management

```
Zustand Store (useDevelopmentWizard)
├── currentStep: number
├── developmentData: {
│   name, status, completionDate, description,
│   location: { lat, lng, address, gpsAccuracy },
│   amenities: string[],
│   highlights: string[]
│ }
├── unitTypes: UnitType[] {
│   id, name, bedrooms, bathrooms, parking, size, priceRange,
│   baseFeatures: {},
│   baseFinishes: {},
│   baseMedia: [],
│   specs: SpecVariation[] {
│     id, name, price, description,
│     overrides: {},
│     media: [],
│     documents: []
│   }
│ }
├── developmentFeatures: string[]
├── documents: Document[]
└── actions: {
    setDevelopmentData(),
    addUnitType(), updateUnitType(), deleteUnitType(),
    addSpec(), updateSpec(), deleteSpec(),
    setFeatures(), addDocument(), removeDocument()
  }
```

## Components and Interfaces

### Step 1: DevelopmentDetailsStep

**Purpose:** Capture all development-level information

**Sections:**

1. **Basic Information**
   - Development Name (text, min 5 chars, required)
   - Development Status (multi-select badges)
   - Expected Completion Date (date picker, optional)
   - Developer Name (read-only, auto-filled)
   - Rating (read-only, system-calculated)
   - Project Description (rich text editor)

2. **Location**
   - Interactive Map with Pin Drop (primary input)
   - GPS Accuracy Indicator (accurate/approximate)
   - Auto-populated Address Fields (province, city, suburb)
   - Manual Override Toggle
   - "No official street yet" checkbox

3. **Development Amenities**
   - Multi-select checkboxes or badges
   - Options: Swimming Pool, Clubhouse, Jogging Trails, Parks, Braai Areas, Security Features, Fibre Ready
   - Visual grouping by category

4. **Development Highlights**
   - Tag input with max 5 entries
   - Counter display "X/5"
   - Add/Remove functionality
   - Example suggestions

### Step 2: UnitTypesStep

**Purpose:** Manage unit types with base configurations and spec variations

**Main View:**
- Grid of UnitTypeCard components
- Empty state with "Add Your First Unit Type" CTA
- Summary statistics (total types, total units, price range)

**UnitTypeCard Component:**

Displays:
- Unit type name
- Bedrooms, bathrooms, size
- Price range
- Number of specs
- Quick actions: Edit, Duplicate, Delete

**UnitTypeModal Component (3-Tab Interface):**

**Tab A: Base Configuration**

*Purpose:* Define defaults that apply to all specs within this unit type

Sections:
1. Basic Info
   - Unit Type Name (required)
   - Bedrooms & Bathrooms (required)
   - Parking Allocation (dropdown)
   - Unit Size & Yard Size (optional)
   - Base Price Range (min required, max optional)

2. Base Features (Defaults for all specs)
   - Built-in Wardrobes (yes/no)
   - Tiled Flooring (yes/no)
   - Granite Counters (yes/no)
   - Prepaid Electricity (yes/no)
   - Balcony (yes/no)
   - Pet-Friendly (yes/no)

3. Base Finishes
   - Paint & Internal Walls (text)
   - Flooring Types (text)
   - Kitchen Standard Features (text)
   - Bathroom Standard Features (text)

4. Base Media
   - Unit Type Gallery (images)
   - Floor Plans (images/PDFs)
   - Renders/Videos (optional)

**Tab B: Specs & Variations**

*Purpose:* Create multiple pricing/finish variations within the unit type

Display:
- List of spec cards (Standard Spec, GAP Spec, Premium Spec, etc.)
- "Add New Spec" button
- Each spec card shows: name, price, key differences

Spec Card (Expandable):
- Spec Name (required)
- Price (required)
- Bedrooms/Bathrooms override (optional)
- Size override (optional)
- Spec Description (text)
- Feature Overrides
  - Toggle-based system
  - Add new features
  - Remove inherited features
  - Replace inherited features
- Spec-Specific Media
  - Photos, Floor Plans, Videos, PDFs
  - Overrides unit type base media
- Spec-Specific Documents
  - PDF uploads

**Tab C: Media**

*Purpose:* Organize media by category for the unit type

Categories:
- Photos (images only)
- Floor Plans (images & PDFs)
- Videos (video files or URLs)
- PDFs (documents)

Features:
- Drag & drop upload
- Set primary image
- Reorder media
- Remove media
- Category-based organization

### Step 3: DevelopmentFeaturesStep

**Purpose:** Specify estate-level infrastructure and features

**Interface:**
- Multi-select checkboxes or badge selector
- Options grouped by category:
  - Security: Perimeter Wall, Controlled Access, Electric Fence, CCTV
  - Construction: Brick & Mortar, Paved Roads
  - Utilities: Fibre Ready, Prepaid Electricity, Solar Installations
  - Lifestyle: Pet-Friendly Estate

### Step 4: DocumentsStep

**Purpose:** Upload supporting documents

**Interface:**
- Document upload zones by type:
  - Brochure PDF
  - Site Development Plan
  - Pricing Sheet
  - Estate Rules
  - Engineering Pack
  - Additional Forms
- Each upload shows: filename, size, upload date
- Remove/Replace functionality
- Development-wide vs Unit-specific toggle

### Step 5: ReviewPublishStep

**Purpose:** Review all information before publishing

**Sections:**

1. **Development Summary**
   - Name, Location, Status
   - Amenities list
   - Highlights list

2. **Unit Types Summary**
   - For each unit type:
     - Core info (beds, baths, size, price range)
     - All specs with price differences
     - Media count
     - Feature differences between specs

3. **Development Features Summary**
   - Estate-level features list

4. **Documents Summary**
   - All uploaded documents with names and types

**Actions:**
- "Save as Draft" button (stores without publishing)
- "Publish" button (validates and makes public)

## Data Models

### Development Model

```typescript
interface Development {
  id: number;
  developerId: number;
  
  // Basic Information
  name: string;
  slug: string;
  status: 'now-selling' | 'launching-soon' | 'under-construction' | 'ready-to-move' | 'sold-out' | 'phase-completed' | 'new-phase-launching';
  completionDate?: Date;
  description: string;
  rating?: number; // auto-calculated
  
  // Location
  address: string;
  city: string;
  province: string;
  suburb?: string;
  postalCode?: string;
  latitude: string;
  longitude: string;
  gpsAccuracy: 'accurate' | 'approximate';
  
  // Amenities & Highlights
  amenities: string[]; // ['Swimming Pool', 'Clubhouse', ...]
  highlights: string[]; // max 5
  
  // Features (Estate-Level)
  features: string[]; // ['Perimeter Wall', 'Fibre Ready', ...]
  
  // Metadata
  views: number;
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt?: Date;
  
  // Relationships
  unitTypes?: UnitType[];
  documents?: Document[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### UnitType Model (with Inheritance)

```typescript
interface UnitType {
  id: string;
  developmentId: number;
  
  // Base Configuration
  name: string; // "2 Bedroom Apartment", "60m² Simplex"
  bedrooms: number;
  bathrooms: number;
  parking: 'none' | '1' | '2' | 'carport' | 'garage';
  unitSize?: number; // m²
  yardSize?: number; // m²
  basePriceFrom: number;
  basePriceTo?: number;
  
  // Base Features (Defaults for all specs)
  baseFeatures: {
    builtInWardrobes: boolean;
    tiledFlooring: boolean;
    graniteCounters: boolean;
    prepaidElectricity: boolean;
    balcony: boolean;
    petFriendly: boolean;
  };
  
  // Base Finishes
  baseFinishes: {
    paintAndWalls?: string;
    flooringTypes?: string;
    kitchenFeatures?: string;
    bathroomFeatures?: string;
  };
  
  // Base Media (inherited by all specs)
  baseMedia: {
    gallery: MediaItem[];
    floorPlans: MediaItem[];
    renders: MediaItem[];
  };
  
  // Spec Variations
  specs: SpecVariation[];
  
  // Metadata
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### SpecVariation Model

```typescript
interface SpecVariation {
  id: string;
  unitTypeId: string;
  
  // Basic Info
  name: string; // "Standard Spec", "GAP Spec", "Premium Spec"
  price: number;
  description: string;
  
  // Overrides (optional - only store if different from base)
  bedroomsOverride?: number;
  bathroomsOverride?: number;
  sizeOverride?: number;
  
  // Feature Overrides
  featureOverrides?: {
    add?: string[]; // New features not in base
    remove?: string[]; // Base features to exclude
    replace?: Record<string, string>; // Base feature replacements
  };
  
  // Spec-Specific Media (overrides base media)
  media?: {
    photos: MediaItem[];
    floorPlans: MediaItem[];
    videos: MediaItem[];
    pdfs: MediaItem[];
  };
  
  // Spec-Specific Documents
  documents?: Document[];
  
  // Metadata
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### MediaItem Model

```typescript
interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'pdf' | 'video';
  category: 'photo' | 'floorplan' | 'render' | 'document';
  isPrimary: boolean;
  displayOrder: number;
  uploadedAt: Date;
}
```

### Document Model

```typescript
interface Document {
  id: string;
  developmentId: number;
  unitTypeId?: string; // optional - for unit-specific docs
  
  name: string;
  type: 'brochure' | 'site-plan' | 'pricing-sheet' | 'estate-rules' | 'engineering-pack' | 'other';
  url: string;
  fileSize: number;
  mimeType: string;
  
  uploadedAt: Date;
}
```

### Wizard State Model

```typescript
interface DevelopmentWizardState {
  // Wizard Flow
  currentStep: number; // 1-5
  
  // Step 1: Development Details
  developmentData: {
    name: string;
    status: string;
    completionDate?: string;
    description: string;
    developerName: string; // read-only
    rating?: number; // read-only
    
    location: {
      latitude: string;
      longitude: string;
      address: string;
      city: string;
      province: string;
      suburb?: string;
      postalCode?: string;
      gpsAccuracy?: 'accurate' | 'approximate';
      noOfficialStreet: boolean;
    };
    
    amenities: string[];
    highlights: string[]; // max 5
  };
  
  // Step 2: Unit Types
  unitTypes: UnitType[];
  
  // Step 3: Development Features
  developmentFeatures: string[];
  
  // Step 4: Documents
  documents: Document[];
  
  // Actions
  setCurrentStep: (step: number) => void;
  setDevelopmentData: (data: Partial<DevelopmentWizardState['developmentData']>) => void;
  addUnitType: (unitType: UnitType) => void;
  updateUnitType: (id: string, updates: Partial<UnitType>) => void;
  deleteUnitType: (id: string) => void;
  addSpec: (unitTypeId: string, spec: SpecVariation) => void;
  updateSpec: (unitTypeId: string, specId: string, updates: Partial<SpecVariation>) => void;
  deleteSpec: (unitTypeId: string, specId: string) => void;
  setDevelopmentFeatures: (features: string[]) => void;
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
}
```

## Database Schema

### developments table

```sql
CREATE TABLE developments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  developer_id INT NOT NULL,
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  status ENUM('now-selling', 'launching-soon', 'under-construction', 'ready-to-move', 'sold-out', 'phase-completed', 'new-phase-launching') NOT NULL,
  completion_date DATE,
  description TEXT,
  rating DECIMAL(3,2),
  
  -- Location
  address VARCHAR(500),
  city VARCHAR(100),
  province VARCHAR(100),
  suburb VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  gps_accuracy ENUM('accurate', 'approximate') DEFAULT 'approximate',
  
  -- Amenities & Highlights (JSON)
  amenities JSON,
  highlights JSON,
  
  -- Features (JSON)
  features JSON,
  
  -- Metadata
  views INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (developer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_developer_id (developer_id),
  INDEX idx_status (status),
  INDEX idx_location (latitude, longitude),
  INDEX idx_published (is_published, published_at)
);
```

### unit_types table

```sql
CREATE TABLE unit_types (
  id VARCHAR(36) PRIMARY KEY,
  development_id INT NOT NULL,
  
  -- Base Configuration
  name VARCHAR(255) NOT NULL,
  bedrooms INT NOT NULL,
  bathrooms DECIMAL(3,1) NOT NULL,
  parking ENUM('none', '1', '2', 'carport', 'garage'),
  unit_size INT,
  yard_size INT,
  base_price_from DECIMAL(15,2) NOT NULL,
  base_price_to DECIMAL(15,2),
  
  -- Base Features (JSON)
  base_features JSON,
  
  -- Base Finishes (JSON)
  base_finishes JSON,
  
  -- Base Media (JSON)
  base_media JSON,
  
  -- Metadata
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  INDEX idx_development_id (development_id),
  INDEX idx_price_range (base_price_from, base_price_to),
  INDEX idx_bedrooms_bathrooms (bedrooms, bathrooms)
);
```

### spec_variations table

```sql
CREATE TABLE spec_variations (
  id VARCHAR(36) PRIMARY KEY,
  unit_type_id VARCHAR(36) NOT NULL,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  description TEXT,
  
  -- Overrides (JSON)
  overrides JSON,
  
  -- Feature Overrides (JSON)
  feature_overrides JSON,
  
  -- Spec-Specific Media (JSON)
  media JSON,
  
  -- Metadata
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE CASCADE,
  INDEX idx_unit_type_id (unit_type_id),
  INDEX idx_price (price)
);
```

### documents table

```sql
CREATE TABLE development_documents (
  id VARCHAR(36) PRIMARY KEY,
  development_id INT NOT NULL,
  unit_type_id VARCHAR(36),
  
  name VARCHAR(255) NOT NULL,
  type ENUM('brochure', 'site-plan', 'pricing-sheet', 'estate-rules', 'engineering-pack', 'other') NOT NULL,
  url VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE CASCADE,
  INDEX idx_development_id (development_id),
  INDEX idx_unit_type_id (unit_type_id),
  INDEX idx_type (type)
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Development name validation

*For any* development name input, the system should reject names with fewer than 5 characters
**Validates: Requirements 1.3**

### Property 2: Highlights limit enforcement

*For any* development, the number of highlights should never exceed 5
**Validates: Requirements 4.3**

### Property 3: GPS accuracy reflects geocoding quality

*For any* reverse geocoding result, the GPS accuracy indicator should be "accurate" for precise results and "approximate" for less precise results
**Validates: Requirements 2.4, 2.5**

### Property 4: Specification inheritance

*For any* spec variation without overrides, the final features should equal the unit type base features
**Validates: Requirements 8.1, 8.4**

### Property 5: Override storage efficiency

*For any* spec variation with overrides, only the overridden fields should be stored in the database, not the inherited values
**Validates: Requirements 8.3**

### Property 6: Unit type duplication creates independent copy

*For any* unit type that is duplicated, the copy should have a unique ID and "(Copy)" appended to the name
**Validates: Requirements 5.5**

### Property 7: Primary image uniqueness

*For any* unit type or spec, at most one media item should be marked as primary
**Validates: Requirements 9.4**

### Property 8: Required fields validation

*For any* wizard step with required fields, the user should not be able to proceed until all required fields are valid
**Validates: Requirements 15.1, 15.4**

### Property 9: Draft restoration preserves state

*For any* saved draft, when resumed, all field values should match the saved state exactly
**Validates: Requirements 14.2**

### Property 10: Feature propagation on base update

*For any* unit type base feature update, all specs without overrides for that feature should reflect the new value
**Validates: Requirements 8.2**

## Error Handling

### Validation Errors

- Display inline errors immediately on blur
- Clear errors on successful correction
- Prevent form submission with validation errors
- Show field-specific guidance messages
- Mark required fields with red asterisk

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

### File Upload Errors

- Validate file types before upload
- Check file size limits
- Display upload progress
- Handle upload failures gracefully
- Allow retry on failure

## Testing Strategy

### Unit Tests

- Test development name validation
- Test highlights limit enforcement
- Test specification inheritance logic
- Test override storage
- Test duplication functionality
- Test primary image selection
- Test auto-save debouncing
- Test draft restoration

### Property-Based Tests

**Framework:** fast-check (for TypeScript/JavaScript)

**Configuration:** Minimum 100 iterations per property

**Property 1 Test:** Development name validation
```typescript
// Feature: development-wizard-optimization, Property 1
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

**Property 2 Test:** Highlights limit enforcement
```typescript
// Feature: development-wizard-optimization, Property 2
fc.assert(
  fc.property(
    fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
    (highlights) => {
      const result = addHighlights(highlights);
      return result.length <= 5;
    }
  ),
  { numRuns: 100 }
);
```

**Property 4 Test:** Specification inheritance
```typescript
// Feature: development-wizard-optimization, Property 4
fc.assert(
  fc.property(
    fc.record({
      baseFeatures: fc.object(),
      overrides: fc.constant({})
    }),
    ({ baseFeatures, overrides }) => {
      const finalFeatures = computeFinalFeatures(baseFeatures, overrides);
      return JSON.stringify(finalFeatures) === JSON.stringify(baseFeatures);
    }
  ),
  { numRuns: 100 }
);
```

### Integration Tests

- Test complete wizard flow from start to publish
- Test unit type creation with specs
- Test specification inheritance
- Test draft save and restore
- Test navigation between steps
- Test form submission

### E2E Tests

- Test user journey from login to published listing
- Test map interaction and address population
- Test unit type and spec management
- Test media upload and organization
- Test error recovery scenarios

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Load unit type details only when modal opens
   - Lazy load media thumbnails
   - Paginate spec lists for large unit types

2. **Debouncing**
   - Debounce auto-save (3 seconds)
   - Debounce search/filter operations
   - Debounce geocoding requests

3. **Caching**
   - Cache geocoding results
   - Cache uploaded media URLs
   - Cache computed inheritance results

4. **Data Structure Efficiency**
   - Store only overrides, not full feature sets
   - Use JSON columns for flexible data
   - Index frequently queried fields

5. **UI Responsiveness**
   - Use optimistic updates
   - Show loading states
   - Implement skeleton screens
   - Use virtual scrolling for large lists

## Accessibility

- Keyboard navigation support
- ARIA labels for all interactive elements
- Focus management in modals
- Screen reader announcements for dynamic content
- Color contrast compliance (WCAG AA)
- Error messages associated with form fields

## Mobile Responsiveness

- Responsive grid layouts
- Touch-friendly tap targets (min 44x44px)
- Mobile-optimized map interface
- Collapsible sections on small screens
- Bottom sheet modals on mobile
- Swipe gestures for navigation
