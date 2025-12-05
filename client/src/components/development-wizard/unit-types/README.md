# Unit Types & Configurations - Developer Listing Wizard

## Overview

The Unit Types step allows developers to create comprehensive unit configurations with a clean, tab-based interface. Each unit type can have its own specifications, media, pricing, and optional upgrades while inheriting base specifications from the master development.

## Architecture

### Component Structure

```
UnitTypesStepEnhanced (Main Step)
├── UnitTypeCard (Display Component)
└── UnitTypeModal (4-Tab Modal)
    ├── BasicInfoTab
    ├── SpecificationsTab
    ├── MediaTab
    └── ExtrasTab
```

## Features

### 1. Unit Type Cards
- **Visual Display**: Clean card layout showing key unit information
- **Quick Actions**: Edit, Duplicate, Delete buttons
- **Summary View**: Bedrooms, bathrooms, size, price, availability at a glance

### 2. Four-Tab Modal System

#### Tab 1: Basic Info
**Purpose**: Capture essential unit details with minimal inputs

**Fields**:
- Unit Type Name (required)
- Bedrooms & Bathrooms (required)
- Floor Size & Yard Size (optional)
- Price Range (min required, max optional)
- Parking Type
- Available Units (required)
- Completion Date (optional)
- Deposit Required (optional)
- Internal Notes (optional, hidden from buyers)

#### Tab 2: Specifications
**Purpose**: Handle standard specs, overrides, and custom specifications

**Sections**:
1. **Inherited Master Specifications** (Read-only display)
   - Shows specs from master development
   - Kitchen, Countertops, Flooring, Bathroom, Geyser, Electricity, Security

2. **Unit-Specific Overrides** (Toggle-based)
   - Each spec has a checkbox to enable override
   - Only overridden fields are stored in database
   - Maintains clean data model through inheritance

3. **Custom Specifications** (Repeatable list)
   - Add unlimited custom field/value pairs
   - Examples: "Smart Home Automation" → "Optional"
   - Handles unique developer requirements

#### Tab 3: Media
**Purpose**: Unit-type-specific media management

**Categories**:
- Floor Plans (images & PDFs)
- Interior Images
- Exterior Images
- 3D Renderings
- Virtual Tour Link (URL input)

**Features**:
- Drag & drop upload
- Set primary image per unit type
- Reorder media
- Category-based organization

#### Tab 4: Optional Extras / Upgrade Packs
**Purpose**: Define optional upgrades and add-ons

**Fields per Upgrade**:
- Upgrade Name (required)
- Description
- Price (optional)

**Examples**:
- Solar Upgrade + R18,000
- Premium Kitchen Pack + R12,000
- Double Carport + R30,000
- Patio Tiling Option + R4,500

## Data Model

### Database Schema

```sql
CREATE TABLE unit_types (
  id INT PRIMARY KEY,
  development_id INT,
  label VARCHAR(255),
  
  -- Basic Config
  ownership_type ENUM(...),
  structural_type ENUM(...),
  bedrooms INT,
  bathrooms DECIMAL(3,1),
  
  -- Pricing
  price_from DECIMAL(15,2),
  price_to DECIMAL(15,2),
  
  -- Overrides (only stores differences)
  spec_overrides JSON,
  kitchen_finish VARCHAR(255),
  countertop_material VARCHAR(255),
  
  -- Custom Specs
  custom_specs JSON,
  
  -- Upgrade Packs
  upgrade_packs JSON,
  
  -- Media
  unit_media JSON
);
```

### Inheritance Model

**Final Unit Specs = Master Specs + Overrides + Custom Specs**

This prevents duplication and makes updates efficient:
- Master specs update → all units inherit automatically
- Only store differences at unit level
- Custom specs handle unique requirements

## UX Principles

1. **Progressive Disclosure**: Complexity hidden behind tabs
2. **Defaults First**: Show inherited specs, hide overrides until needed
3. **Reusability**: Duplicate unit type feature for quick setup
4. **Visual Hierarchy**: Cards → Modal → Tabs keeps UI clean
5. **Minimal Required Fields**: Only essential fields marked as required

## Usage Example

```typescript
import { UnitTypesStepEnhanced } from './steps/UnitTypesStepEnhanced';

// In wizard flow
<UnitTypesStepEnhanced />
```

## State Management

Uses Zustand store from `useDevelopmentWizard`:
- `unitTypes`: Array of unit configurations
- `addUnitType()`: Add new unit
- `updateUnitType()`: Update existing unit
- `removeUnitType()`: Delete unit

## Validation

**Required Fields**:
- Unit Type Name
- Bedrooms
- Bathrooms
- Price From
- Available Units

**Optional Fields**:
- All specification overrides
- Custom specifications
- Media uploads
- Upgrade packs

## API Integration

### Save Unit Type
```typescript
POST /api/developer/developments/:id/unit-types
{
  label: "2 Bedroom Apartment",
  bedrooms: 2,
  bathrooms: 2,
  priceFrom: 1500000,
  priceTo: 1800000,
  availableUnits: 12,
  specOverrides: {
    kitchen: true,
    flooring: true
  },
  kitchenFinish: "Premium",
  flooringType: "Laminate",
  customSpecs: [
    { name: "Smart Home", value: "Optional" }
  ],
  upgradePacks: [
    {
      id: "upgrade-1",
      name: "Solar Upgrade",
      description: "5kW system",
      price: 18000
    }
  ]
}
```

## Benefits

1. **Clean Data Model**: Inheritance prevents duplication
2. **Scalable**: Handles any number of unit types
3. **Flexible**: Custom specs solve unique requirements
4. **User-Friendly**: Tab-based interface reduces cognitive load
5. **Complete**: Covers all aspects (specs, media, pricing, upgrades)

## Future Enhancements

- Bulk import from CSV/Excel
- Unit type templates library
- AI-powered spec suggestions
- Comparison view for multiple unit types
- Advanced media gallery with 360° views
