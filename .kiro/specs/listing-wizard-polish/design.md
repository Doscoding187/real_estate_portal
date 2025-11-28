# Design Document: Listing Wizard & Prospect Dashboard Polish

## Overview

This design document outlines the technical approach for polishing **two separate wizards** and the Prospect Dashboard:

1. **Listing Wizard** - For individual property listings (houses, apartments, commercial properties)
2. **Development Wizard** - For property developments (estates, complexes, residential projects)
3. **Prospect Dashboard** - Gamified buyability calculator for property browsers

The improvements focus on enhancing user experience through better validation, error handling, animations, persistence, and accessibility while maintaining the existing architecture. Both wizards share common patterns but have distinct data models and steps.

## Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Client Layer (React)                           │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   Listing    │  │  Development     │  │  Prospect Dashboard  │  │
│  │   Wizard     │  │  Wizard          │  │  - 3 Step Forms      │  │
│  │ - 8 Steps    │  │  - 6 Steps       │  │  - Buyability Calc   │  │
│  │ - Properties │  │  - Developments  │  │  - Recommendations   │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│         │                    │                        │               │
│  ┌──────▼────────────────────▼────────────────────────▼──────────┐  │
│  │              Zustand State Management                          │  │
│  │  - useListingWizardStore (properties)                         │  │
│  │  - useDevelopmentWizard (developments)                        │  │
│  │  - Persist Middleware (localStorage)                          │  │
│  └──────┬─────────────────────────────────────────────────────────┘  │
│         │                                                             │
│  ┌──────▼─────────────────────────────────────────────────────────┐ │
│  │                    tRPC Client Layer                            │ │
│  │  - listing.create, listing.update                              │ │
│  │  - developer.createDevelopment, developer.updateDevelopment    │ │
│  │  - prospects.calculateBuyability                               │ │
│  │  - upload.presignedUrl                                         │ │
│  └──────┬─────────────────────────────────────────────────────────┘ │
└─────────┼──────────────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────────┐
│                        API Layer (tRPC)                             │
├─────────────────────────────────────────────────────────────────────┤
│  - listing.* (individual properties)                               │
│  - developer.* (developments & projects)                           │
│  - prospects.* (buyability & recommendations)                      │
│  - upload.* (media management)                                     │
└─────────┬──────────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────────┐
│                     Database Layer (MySQL)                          │
├─────────────────────────────────────────────────────────────────────┤
│  - listings, listing_media (individual properties)                 │
│  - developments, developers (property projects)                    │
│  - prospects, prospect_favorites                                   │
│  - recently_viewed, scheduled_viewings                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Validation System

#### ValidationEngine Component

```typescript
interface ValidationRule {
  field: string;
  validator: (value: any, context?: any) => ValidationResult;
  message: string;
  trigger?: 'blur' | 'change' | 'submit';
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface ValidationContext {
  action?: ListingAction;
  propertyType?: PropertyType;
  currentStep: number;
}

class ValidationEngine {
  private rules: Map<string, ValidationRule[]>;
  
  addRule(rule: ValidationRule): void;
  validate(field: string, value: any, context?: ValidationContext): ValidationResult;
  validateStep(step: number, data: any): ValidationResult[];
  validateAll(data: any): ValidationResult[];
}
```

**Validation Rules by Step:**

- **Step 1 (Action)**: Required field
- **Step 2 (Property Type)**: Required field
- **Step 3 (Basic Info)**: 
  - Title: min 10 chars, max 255 chars
  - Description: min 50 chars, max 5000 chars
- **Step 4 (Additional Info)**: Optional fields with format validation
- **Step 5 (Pricing)**: 
  - Dynamic based on action (sell/rent/auction)
  - Numeric validation, min/max ranges
- **Step 6 (Location)**: 
  - Address required
  - Coordinates required (lat/lng)
  - City, province required
- **Step 7 (Media)**: 
  - Min 1 image required
  - Max 30 images, 5 videos
  - File size limits (5MB images, 50MB videos)
  - Main media selection required

#### InlineError Component

```typescript
interface InlineErrorProps {
  error?: string;
  show: boolean;
  className?: string;
}

const InlineError: React.FC<InlineErrorProps> = ({ error, show, className }) => {
  return (
    <AnimatePresence>
      {show && error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={cn('text-red-600 text-sm mt-1 flex items-center gap-1', className)}
        >
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

### 2. Draft Management System

#### AutoSave Hook

```typescript
interface AutoSaveOptions {
  debounceMs?: number;
  storageKey: string;
  onSave?: (data: any) => void;
  onError?: (error: Error) => void;
}

const useAutoSave = <T extends object>(
  data: T,
  options: AutoSaveOptions
) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      try {
        localStorage.setItem(options.storageKey, JSON.stringify(data));
        setLastSaved(new Date());
        options.onSave?.(data);
      } catch (error) {
        options.onError?.(error as Error);
      } finally {
        setIsSaving(false);
      }
    }, options.debounceMs || 2000);
    
    return () => clearTimeout(timer);
  }, [data]);
  
  return { lastSaved, isSaving };
};
```

#### DraftManager Component

```typescript
interface DraftManagerProps {
  onResume: () => void;
  onStartFresh: () => void;
  draftData: {
    currentStep: number;
    action?: string;
    propertyType?: string;
    lastModified: Date;
  };
}

const DraftManager: React.FC<DraftManagerProps> = ({
  onResume,
  onStartFresh,
  draftData
}) => {
  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resume Draft Listing?</DialogTitle>
          <DialogDescription>
            You have an unfinished listing from {formatDistanceToNow(draftData.lastModified)} ago.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="font-medium">Draft Details</p>
          <p className="text-sm text-gray-600">
            Step {draftData.currentStep} of 8
            {draftData.propertyType && ` • ${draftData.propertyType}`}
            {draftData.action && ` • ${draftData.action}`}
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onStartFresh}>
            <Trash2 className="w-4 h-4 mr-2" />
            Start New
          </Button>
          <Button onClick={onResume}>
            <FileText className="w-4 h-4 mr-2" />
            Resume Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### 3. Enhanced Media Upload

#### MediaUploadZone Component

```typescript
interface MediaUploadZoneProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  existingMedia?: MediaFile[];
}

const MediaUploadZone: React.FC<MediaUploadZoneProps> = ({
  onUpload,
  maxFiles = 30,
  maxSizeMB = 5,
  acceptedTypes = ['image/*', 'video/*'],
  existingMedia = []
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const sizeMB = file.size / (1024 * 1024);
      return sizeMB <= maxSizeMB;
    });
    
    if (existingMedia.length + validFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }
    
    onUpload(validFiles);
  }, [existingMedia, maxFiles, maxSizeMB, onUpload]);
  
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-all',
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      )}
    >
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="text-lg font-medium mb-2">
        Drag & drop files here, or click to browse
      </p>
      <p className="text-sm text-gray-500">
        Max {maxFiles} files • {maxSizeMB}MB per file
      </p>
    </div>
  );
};
```

#### SortableMediaGrid Component

```typescript
interface SortableMediaGridProps {
  media: MediaFile[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  onSetPrimary: (index: number) => void;
  primaryIndex?: number;
}

const SortableMediaGrid: React.FC<SortableMediaGridProps> = ({
  media,
  onReorder,
  onRemove,
  onSetPrimary,
  primaryIndex
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={media.map((_, i) => i)}>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {media.map((item, index) => (
            <SortableMediaItem
              key={index}
              index={index}
              media={item}
              isPrimary={index === primaryIndex}
              onRemove={() => onRemove(index)}
              onSetPrimary={() => onSetPrimary(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
```

### 4. Prospect Dashboard Enhancements

#### BuyabilityCalculator Component

```typescript
interface BuyabilityResult {
  score: 'low' | 'medium' | 'high';
  affordabilityMin: number;
  affordabilityMax: number;
  monthlyPaymentCapacity: number;
  recommendations: string[];
}

const BuyabilityCalculator: React.FC = () => {
  const [formData, setFormData] = useState<ProspectFormData>({});
  const [result, setResult] = useState<BuyabilityResult | null>(null);
  
  const { data: buyability, isLoading } = trpc.prospects.calculateBuyability.useQuery(
    formData,
    { enabled: Object.keys(formData).length > 0 }
  );
  
  useEffect(() => {
    if (buyability) {
      setResult(buyability);
    }
  }, [buyability]);
  
  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              'p-4 rounded-lg',
              result.score === 'high' && 'bg-green-50 border-green-200',
              result.score === 'medium' && 'bg-yellow-50 border-yellow-200',
              result.score === 'low' && 'bg-red-50 border-red-200'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold">
                Buyability Score: {result.score.toUpperCase()}
              </span>
            </div>
            <p className="text-sm">
              Affordability Range: R{result.affordabilityMin.toLocaleString()} - 
              R{result.affordabilityMax.toLocaleString()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Form fields */}
    </div>
  );
};
```

#### CollapsibleDashboard Component

```typescript
interface CollapsibleDashboardProps {
  isOpen: boolean;
  onToggle: () => void;
  buyabilityScore?: 'low' | 'medium' | 'high';
}

const CollapsibleDashboard: React.FC<CollapsibleDashboardProps> = ({
  isOpen,
  onToggle,
  buyabilityScore
}) => {
  return (
    <>
      {/* Full Dashboard */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50"
          >
            {/* Dashboard content */}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating Button (when collapsed) */}
      <AnimatePresence>
        {!isOpen && buyabilityScore && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={onToggle}
            className={cn(
              'fixed right-4 bottom-4 p-4 rounded-full shadow-lg z-40',
              buyabilityScore === 'high' && 'bg-green-500',
              buyabilityScore === 'medium' && 'bg-yellow-500',
              buyabilityScore === 'low' && 'bg-red-500'
            )}
          >
            <Calculator className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};
```

### 5. Step Navigation Enhancement

#### ProgressIndicator Component

```typescript
interface Step {
  number: number;
  title: string;
  isComplete: boolean;
  isCurrent: boolean;
  isAccessible: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
  onStepClick: (stepNumber: number) => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  onStepClick
}) => {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => step.isAccessible && onStepClick(step.number)}
                disabled={!step.isAccessible}
                className={cn(
                  'flex flex-col items-center transition-all',
                  !step.isAccessible && 'cursor-not-allowed opacity-50'
                )}
              >
                <motion.div
                  whileHover={step.isAccessible ? { scale: 1.1 } : {}}
                  whileTap={step.isAccessible ? { scale: 0.95 } : {}}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
                    step.isComplete && 'bg-green-500 text-white',
                    step.isCurrent && 'bg-blue-600 text-white ring-4 ring-blue-100',
                    !step.isComplete && !step.isCurrent && 'bg-gray-200 text-gray-500'
                  )}
                >
                  {step.isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </motion.div>
                <span className={cn(
                  'text-xs mt-2 text-center max-w-[80px]',
                  step.isCurrent && 'font-semibold text-gray-900',
                  !step.isCurrent && 'text-gray-500'
                )}>
                  {step.title}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {!step.isAccessible && 'Complete previous steps first'}
            </TooltipContent>
          </Tooltip>
          
          {index < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-2',
              step.isComplete ? 'bg-green-500' : 'bg-gray-200'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
```

## Data Models

### Shared Wizard Patterns

Both wizards share common patterns:
- **Step-based navigation** with progress indicators
- **Draft persistence** using Zustand + localStorage
- **Media upload** with drag-and-drop and reordering
- **Validation** with inline error messages
- **Auto-save** with debouncing

### Listing Wizard State (Individual Properties)

```typescript
interface ListingWizardState {
  // Navigation
  currentStep: number;
  completedSteps: number[];
  
  // Form Data
  action?: ListingAction;
  propertyType?: PropertyType;
  title: string;
  description: string;
  pricing?: PricingFields;
  propertyDetails?: PropertyDetails;
  location?: LocationData;
  media: MediaFile[];
  badges: ListingBadge[];
  
  // UI State
  errors: ValidationError[];
  isValid: boolean;
  status: 'draft' | 'submitting' | 'submitted' | 'error';
  
  // Media
  mainMediaId?: number;
  displayMediaType?: 'image' | 'video';
  
  // Metadata
  lastSaved?: Date;
  draftId?: string;
}

interface MediaFile {
  id?: number;
  file: File | null;
  preview: string;
  type: 'image' | 'video' | 'floorplan' | 'pdf';
  progress: number;
  displayOrder: number;
  isPrimary: boolean;
  description?: string;
  uploadError?: string;
}

interface ValidationError {
  field: string;
  message: string;
  step?: number;
}
```

### Development Wizard State (Property Developments)

```typescript
interface DevelopmentWizardState {
  // Step 1: Basic Details
  developmentName: string;
  address: string;
  city: string;
  province: string;
  suburb?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  developerId?: number;
  status: 'pre-launch' | 'launching-soon' | 'now-selling' | 'sold-out';
  rating?: number;
  
  // Step 2: Unit Types
  unitTypes: UnitType[];
  
  // Step 3: Highlights
  description: string;
  amenities: string[];
  highlights: string[];
  completionDate?: string;
  totalUnits: number;
  
  // Step 4: Media
  media: MediaItem[];
  primaryImageIndex: number;
  
  // Step 5: Developer Info
  developerName: string;
  contactDetails: ContactDetails;
  isFeaturedDealer: boolean;
  companyLogo?: string;
  
  // Step 6: Preview
  // (read-only summary of all data)
  
  // Wizard State
  currentStep: number; // 0-5 (6 steps)
  isComplete: boolean;
  draftId?: number;
  
  // Metadata
  lastSaved?: Date;
}

interface UnitType {
  id: string;
  bedrooms: number;
  label: string; // e.g., "2 Bed Apartment"
  priceFrom: number;
  availableUnits: number;
}

interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  preferredContact?: 'email' | 'phone';
}
```

**Key Differences from Listing Wizard:**
- **Unit Types**: Developments have multiple unit configurations
- **Developer Info**: Links to developer profile
- **Status**: Pre-launch, launching soon, now selling, sold out
- **Completion Date**: Future date for under-construction projects
- **Total Units**: Overall project size

### Prospect Dashboard State

```typescript
interface ProspectState {
  sessionId: string;
  currentStep: number;
  
  // Form Data
  formData: ProspectFormData;
  
  // Calculated Results
  buyabilityScore?: 'low' | 'medium' | 'high';
  affordabilityMin?: number;
  affordabilityMax?: number;
  monthlyPaymentCapacity?: number;
  
  // Progress
  profileProgress: number;
  badges: string[];
  
  // Recommendations
  recommendations: Property[];
  favorites: Property[];
  recentlyViewed: Property[];
  
  // UI State
  isCollapsed: boolean;
  lastCalculated?: Date;
}

interface ProspectFormData {
  // Step 1: Income & Employment
  income?: string;
  incomeRange?: string;
  employmentStatus?: string;
  combinedIncome?: string;
  
  // Step 2: Expenses & Assets
  monthlyExpenses?: string;
  monthlyDebts?: string;
  dependents?: string;
  savingsDeposit?: string;
  
  // Step 3: Credit & Preferences
  email?: string;
  phone?: string;
  creditScore?: string;
  hasCreditConsent?: boolean;
  preferredPropertyType?: string;
  preferredLocation?: string;
  maxCommuteTime?: string;
}
```

## Error Handling

### Error Recovery Strategy

```typescript
interface ErrorRecoveryStrategy {
  type: 'network' | 'validation' | 'server' | 'upload';
  message: string;
  recoveryAction?: () => void;
  retryable: boolean;
}

const errorRecoveryStrategies: Record<string, ErrorRecoveryStrategy> = {
  NETWORK_ERROR: {
    type: 'network',
    message: 'Connection lost. Your draft has been saved. Please try again.',
    retryable: true,
    recoveryAction: () => {
      // Retry the last action
    }
  },
  VALIDATION_ERROR: {
    type: 'validation',
    message: 'Please fix the highlighted errors before continuing.',
    retryable: false
  },
  UPLOAD_ERROR: {
    type: 'upload',
    message: 'File upload failed. Click retry to try again.',
    retryable: true,
    recoveryAction: () => {
      // Retry upload
    }
  },
  SESSION_EXPIRED: {
    type: 'server',
    message: 'Your session has expired. Please log in again.',
    retryable: false,
    recoveryAction: () => {
      // Redirect to login
    }
  }
};
```

### Error Display Component

```typescript
interface ErrorAlertProps {
  error: ErrorRecoveryStrategy;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onRetry,
  onDismiss
}) => {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{error.message}</span>
        <div className="flex gap-2">
          {error.retryable && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
```

## Testing Strategy

### Unit Testing

**Components to Test:**
- ValidationEngine: Test all validation rules
- AutoSave hook: Test debouncing and storage
- MediaUploadZone: Test file validation and drag-drop
- BuyabilityCalculator: Test calculation logic
- ProgressIndicator: Test step navigation logic

**Test Framework:** Vitest + React Testing Library

```typescript
describe('ValidationEngine', () => {
  it('should validate title length', () => {
    const engine = new ValidationEngine();
    const result = engine.validate('title', 'Short', { currentStep: 3 });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Title must be at least 10 characters');
  });
  
  it('should validate pricing based on action', () => {
    const engine = new ValidationEngine();
    const result = engine.validate('askingPrice', null, { 
      action: 'sell',
      currentStep: 5 
    });
    expect(result.isValid).toBe(false);
  });
});
```

### Integration Testing

**Flows to Test:**
1. Complete listing creation flow (all 8 steps)
2. Draft save and resume flow
3. Media upload and reorder flow
4. Prospect dashboard calculation flow
5. Error recovery flows

### Property-Based Testing

**Properties to Test:**

**Property 1: Draft persistence round-trip**
*For any* valid wizard state, saving to localStorage and loading should produce an equivalent state
**Validates: Requirements 2.1, 2.4**

**Property 2: Validation consistency**
*For any* form data, running validation twice should produce the same result
**Validates: Requirements 1.1, 1.3**

**Property 3: Media reordering preserves count**
*For any* media array and valid reorder operation, the array length should remain unchanged
**Validates: Requirements 3.3**

**Property 4: Buyability calculation determinism**
*For any* prospect financial data, calculating buyability multiple times should produce the same score
**Validates: Requirements 4.2**

**Property 5: Step navigation bounds**
*For any* current step, attempting to navigate should never exceed valid step range (1-8)
**Validates: Requirements 5.1, 5.4**

## Performance Optimization

### Optimization Strategies

1. **Lazy Loading**
   - Load step components only when needed
   - Defer non-critical animations

2. **Image Optimization**
   - Client-side compression before upload
   - Generate thumbnails for preview
   - Use WebP format when supported

3. **Debouncing**
   - Auto-save: 2 second debounce
   - Validation: 300ms debounce
   - Search/filter: 500ms debounce

4. **Memoization**
   - Memoize expensive calculations (buyability)
   - Use React.memo for static components
   - Cache API responses with TanStack Query

5. **Code Splitting**
   - Split wizard steps into separate chunks
   - Lazy load media upload libraries

```typescript
// Lazy load heavy components
const MediaUploadStep = lazy(() => import('./steps/MediaUploadStep'));
const PreviewStep = lazy(() => import('./steps/PreviewStep'));

// Memoize expensive calculations
const buyabilityScore = useMemo(() => {
  return calculateBuyability(formData);
}, [formData.income, formData.expenses, formData.deposit]);

// Debounce auto-save
const debouncedSave = useDebouncedCallback(
  (data) => {
    localStorage.setItem('draft', JSON.stringify(data));
  },
  2000
);
```

## Accessibility

### WCAG 2.1 AA Compliance

**Keyboard Navigation:**
- Tab order follows visual flow
- Enter/Space activates buttons
- Escape closes dialogs
- Arrow keys navigate step indicators

**Screen Reader Support:**
- ARIA labels on all interactive elements
- ARIA live regions for dynamic content
- ARIA invalid for error states
- Semantic HTML structure

**Visual Accessibility:**
- Minimum 4.5:1 contrast ratio
- Focus indicators visible
- Error messages associated with fields
- No color-only indicators

```typescript
// Example accessible form field
<div className="space-y-2">
  <Label htmlFor="title" className="required">
    Property Title
  </Label>
  <Input
    id="title"
    value={title}
    onChange={handleChange}
    aria-invalid={!!errors.title}
    aria-describedby={errors.title ? 'title-error' : undefined}
  />
  {errors.title && (
    <p id="title-error" role="alert" className="text-red-600 text-sm">
      {errors.title}
    </p>
  )}
</div>
```

## Mobile Responsiveness

### Responsive Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md)
- **Desktop**: > 1024px (lg)

### Mobile-Specific Features

1. **Touch Gestures**
   - Swipe left/right for step navigation
   - Pull-to-refresh for data reload
   - Long-press for context menus

2. **Camera Integration**
   - Direct camera access for photos
   - Video recording for property tours

3. **Optimized Layouts**
   - Single-column forms
   - Larger touch targets (min 44x44px)
   - Bottom navigation for easy thumb access

```typescript
// Mobile-optimized step navigation
const MobileStepNav: React.FC = () => {
  const handlers = useSwipeable({
    onSwipedLeft: () => nextStep(),
    onSwipedRight: () => prevStep(),
    trackMouse: false
  });
  
  return (
    <div {...handlers} className="md:hidden">
      {/* Mobile step content */}
    </div>
  );
};
```

## Security Considerations

1. **File Upload Security**
   - Validate file types on client and server
   - Scan for malware before storage
   - Generate unique filenames to prevent overwrites

2. **Data Sanitization**
   - Sanitize all user inputs
   - Prevent XSS in rich text fields
   - Validate URLs before rendering

3. **Session Management**
   - Secure session IDs (UUID v4)
   - HttpOnly cookies for authentication
   - CSRF protection on mutations

## Deployment Strategy

### Rollout Plan

**Phase 1: Validation & Error Handling (Week 1)**
- Deploy enhanced validation system
- Add inline error messages
- Implement error recovery

**Phase 2: Draft Management (Week 2)**
- Deploy auto-save functionality
- Add draft resume dialog
- Test persistence across browsers

**Phase 3: Media Upload (Week 3)**
- Deploy drag-and-drop upload
- Add progress indicators
- Implement reordering

**Phase 4: UX Polish (Week 4)**
- Deploy animations and transitions
- Add mobile optimizations
- Implement accessibility features

### Monitoring

**Key Metrics:**
- Form completion rate
- Average time per step
- Error frequency by field
- Draft resume rate
- Upload success rate
- Mobile vs desktop usage

**Alerts:**
- Upload failure rate > 5%
- Validation error rate > 20%
- Page load time > 3 seconds
- API error rate > 1%
