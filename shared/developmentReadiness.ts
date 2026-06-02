export type DevelopmentReadinessTransactionType = 'sale' | 'rent' | 'auction';

export type DevelopmentReadinessResult = {
  score: number;
  missing: Record<string, string[]>;
};

export type DevelopmentUnitCommercialReadinessCode =
  | 'ready'
  | 'missing_sale_price'
  | 'invalid_sale_price_range'
  | 'missing_monthly_rent'
  | 'invalid_monthly_rent_range'
  | 'missing_starting_bid'
  | 'invalid_reserve_price_range';

export type DevelopmentUnitCommercialReadiness = {
  isReady: boolean;
  transactionType: DevelopmentReadinessTransactionType;
  code: DevelopmentUnitCommercialReadinessCode;
  field: string | null;
  message: string | null;
};

export type DevelopmentUnitAuctionTimingReadinessCode =
  | 'ready'
  | 'missing_auction_start_date'
  | 'missing_auction_end_date'
  | 'invalid_auction_start_date'
  | 'invalid_auction_end_date'
  | 'invalid_auction_date_order'
  | 'auction_start_date_in_past';

export type DevelopmentUnitInventoryReadinessCode =
  | 'ready'
  | 'invalid_total_units'
  | 'invalid_available_units'
  | 'invalid_reserved_units'
  | 'invalid_inventory_counts';

export type DevelopmentUnitAuctionTimingReadiness = {
  isReady: boolean;
  code: DevelopmentUnitAuctionTimingReadinessCode;
  field: 'auctionStartDate' | 'auctionEndDate' | null;
  message: string | null;
};

export type DevelopmentUnitInventoryReadiness = {
  isReady: boolean;
  code: DevelopmentUnitInventoryReadinessCode;
  field: 'totalUnits' | 'availableUnits' | 'reservedUnits' | null;
  message: string | null;
};

export type DevelopmentUnitAuctionTimingOptions = {
  requireDates?: boolean;
  requireFutureStart?: boolean;
  nowMs?: number;
};

export type DevelopmentUnitPublishReadinessIssue = {
  code:
    | DevelopmentUnitCommercialReadinessCode
    | DevelopmentUnitAuctionTimingReadinessCode
    | DevelopmentUnitInventoryReadinessCode;
  field: string | null;
  message: string;
};

export type DevelopmentUnitPublishReadinessSummary = {
  isReady: boolean;
  issues: DevelopmentUnitPublishReadinessIssue[];
  fieldErrors: Record<string, string>;
  messages: string[];
};

export type DevelopmentUnitPublishReadinessOptions = DevelopmentUnitAuctionTimingOptions;

export type DevelopmentPublishBasicsReadinessCode =
  | 'ready'
  | 'missing_name'
  | 'missing_location_address'
  | 'missing_hero_image'
  | 'missing_description'
  | 'description_too_short'
  | 'missing_highlights'
  | 'missing_status'
  | 'missing_launch_date'
  | 'missing_completion_date'
  | 'missing_ownership_type'
  | 'missing_first_handover_date';

export type DevelopmentPublishBasicsReadinessIssue = {
  code: DevelopmentPublishBasicsReadinessCode;
  field:
    | 'name'
    | 'location.address'
    | 'media.heroImage'
    | 'description'
    | 'highlights'
    | 'status'
    | 'launchDate'
    | 'completionDate'
    | 'ownershipTypes'
    | 'expectedFirstHandoverDate'
    | null;
  fieldMessage: string;
  message: string;
};

export type DevelopmentPublishBasicsReadinessSummary = {
  isReady: boolean;
  issues: DevelopmentPublishBasicsReadinessIssue[];
  fieldErrors: Record<string, string>;
  messages: string[];
};

export type DevelopmentPublishBasicsReadinessOptions = {
  minDescriptionLength?: number;
  minHighlights?: number;
  requireStatusDates?: boolean;
};

export type DevelopmentPublishReadinessIssue =
  | DevelopmentPublishBasicsReadinessIssue
  | DevelopmentUnitPublishReadinessIssue
  | {
      code: 'missing_classification' | 'missing_unit_types';
      field: 'classification.type' | 'unitTypes';
      fieldMessage: string;
      message: string;
    };

export type DevelopmentPublishReadinessSummary = {
  isReady: boolean;
  issues: DevelopmentPublishReadinessIssue[];
  fieldErrors: Record<string, string>;
  messages: string[];
  basics: DevelopmentPublishBasicsReadinessSummary;
  units: DevelopmentUnitPublishReadinessSummary | null;
};

export type DevelopmentPublishReadinessOptions = DevelopmentPublishBasicsReadinessOptions &
  DevelopmentUnitPublishReadinessOptions & {
    classification?: any;
    requireClassification?: boolean;
    requireUnitTypes?: boolean;
    transactionType?: unknown;
  };

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function toValidDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNonNegativeNumber(value: unknown): number | null {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function countArrayLikeJson(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value !== 'string') return 0;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch (_error) {
    return 0;
  }
}

function normalizeArrayLike(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value ? [value] : [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  return [trimmed];
}

function hasMediaValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasMediaValue);
  if (!value || typeof value !== 'object') return false;

  const media = value as Record<string, unknown>;
  return [
    media.url,
    media.imageUrl,
    media.thumbnailUrl,
    media.processedUrl,
    media.originalUrl,
    media.fileUrl,
    media.key,
  ].some(hasMediaValue);
}

function hasDevelopmentHeroImage(dev: any): boolean {
  const media = dev?.media ?? dev?.developmentData?.media;
  const images = dev?.images ?? dev?.developmentData?.images;

  return (
    hasMediaValue(dev?.heroImage) ||
    hasMediaValue(media?.heroImage) ||
    hasMediaValue(media?.photos) ||
    hasMediaValue(images)
  );
}

export function normalizeDevelopmentReadinessTransactionType(
  value: unknown,
): DevelopmentReadinessTransactionType {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (['rent', 'for_rent', 'to_rent', 'rental', 'rent_to_buy'].includes(normalized)) {
    return 'rent';
  }
  if (['auction', 'auctions', 'on_auction'].includes(normalized)) return 'auction';
  return 'sale';
}

export function getDevelopmentReadinessPricing(dev: any) {
  const transactionType = normalizeDevelopmentReadinessTransactionType(dev?.transactionType);

  if (transactionType === 'rent') {
    const rentFrom = toPositiveNumber(dev?.monthlyRentFrom ?? dev?.monthlyRent);
    const rentTo = toPositiveNumber(dev?.monthlyRentTo);
    const hasInvalidRange = rentFrom !== null && rentTo !== null && rentTo < rentFrom;

    return {
      transactionType,
      value: hasInvalidRange ? null : rentFrom,
      missingLabel: hasInvalidRange
        ? 'Monthly Rent To must be greater than or equal to Monthly Rent From'
        : 'Monthly Rent From (Units)',
    };
  }

  if (transactionType === 'auction') {
    return {
      transactionType,
      value: toPositiveNumber(dev?.startingBidFrom ?? dev?.startingBid),
      missingLabel: 'Starting Bid (Units)',
    };
  }

  return {
    transactionType,
    value: toPositiveNumber(dev?.priceFrom ?? dev?.basePriceFrom),
    missingLabel: 'Price From (Units)',
  };
}

export function getDevelopmentUnitCommercialReadiness(
  unit: any,
  transactionTypeValue: unknown,
): DevelopmentUnitCommercialReadiness {
  const transactionType = normalizeDevelopmentReadinessTransactionType(transactionTypeValue);

  if (transactionType === 'rent') {
    const rentFrom = toPositiveNumber(unit?.monthlyRentFrom ?? unit?.monthlyRent);
    const rentTo = toPositiveNumber(unit?.monthlyRentTo);

    if (rentFrom === null) {
      return {
        isReady: false,
        transactionType,
        code: 'missing_monthly_rent',
        field: 'monthlyRentFrom',
        message: 'Monthly Rent From (Units)',
      };
    }

    if (rentTo !== null && rentTo < rentFrom) {
      return {
        isReady: false,
        transactionType,
        code: 'invalid_monthly_rent_range',
        field: 'monthlyRentTo',
        message: 'Monthly Rent To must be greater than or equal to Monthly Rent From',
      };
    }
  } else if (transactionType === 'auction') {
    const startingBid = toPositiveNumber(unit?.startingBid ?? unit?.startingBidFrom);
    const reservePrice = toPositiveNumber(unit?.reservePrice ?? unit?.reservePriceFrom);

    if (startingBid === null) {
      return {
        isReady: false,
        transactionType,
        code: 'missing_starting_bid',
        field: 'startingBid',
        message: 'Starting Bid (Units)',
      };
    }

    if (reservePrice !== null && reservePrice < startingBid) {
      return {
        isReady: false,
        transactionType,
        code: 'invalid_reserve_price_range',
        field: 'reservePrice',
        message: 'Reserve Price must be greater than or equal to Starting Bid',
      };
    }
  } else {
    const priceFrom = toPositiveNumber(unit?.basePriceFrom ?? unit?.priceFrom);
    const priceTo = toPositiveNumber(unit?.basePriceTo ?? unit?.priceTo);

    if (priceFrom === null) {
      return {
        isReady: false,
        transactionType,
        code: 'missing_sale_price',
        field: 'basePriceFrom',
        message: 'Price From (Units)',
      };
    }

    if (priceTo !== null && priceTo < priceFrom) {
      return {
        isReady: false,
        transactionType,
        code: 'invalid_sale_price_range',
        field: 'basePriceTo',
        message: 'Price To must be greater than or equal to Price From',
      };
    }
  }

  return {
    isReady: true,
    transactionType,
    code: 'ready',
    field: null,
    message: null,
  };
}

export function getDevelopmentUnitAuctionTimingReadiness(
  unit: any,
  options: DevelopmentUnitAuctionTimingOptions = {},
): DevelopmentUnitAuctionTimingReadiness {
  const {
    requireDates = true,
    requireFutureStart = true,
    nowMs = Date.now(),
  } = options;
  const hasStartValue =
    unit?.auctionStartDate !== null &&
    unit?.auctionStartDate !== undefined &&
    unit?.auctionStartDate !== '';
  const hasEndValue =
    unit?.auctionEndDate !== null &&
    unit?.auctionEndDate !== undefined &&
    unit?.auctionEndDate !== '';

  if (requireDates && !hasStartValue) {
    return {
      isReady: false,
      code: 'missing_auction_start_date',
      field: 'auctionStartDate',
      message: 'Auction Start Date',
    };
  }

  if (requireDates && !hasEndValue) {
    return {
      isReady: false,
      code: 'missing_auction_end_date',
      field: 'auctionEndDate',
      message: 'Auction End Date',
    };
  }

  const startDate = toValidDate(unit?.auctionStartDate);
  const endDate = toValidDate(unit?.auctionEndDate);

  if (hasStartValue && !startDate) {
    return {
      isReady: false,
      code: 'invalid_auction_start_date',
      field: 'auctionStartDate',
      message: 'Auction start date is invalid',
    };
  }

  if (hasEndValue && !endDate) {
    return {
      isReady: false,
      code: 'invalid_auction_end_date',
      field: 'auctionEndDate',
      message: 'Auction end date is invalid',
    };
  }

  if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
    return {
      isReady: false,
      code: 'invalid_auction_date_order',
      field: 'auctionEndDate',
      message: 'Auction end date must be after the start date',
    };
  }

  if (requireFutureStart && startDate && startDate.getTime() < nowMs) {
    return {
      isReady: false,
      code: 'auction_start_date_in_past',
      field: 'auctionStartDate',
      message: 'Auction start date must be in the future',
    };
  }

  return {
    isReady: true,
    code: 'ready',
    field: null,
    message: null,
  };
}

export function getDevelopmentUnitInventoryReadiness(
  unit: any,
): DevelopmentUnitInventoryReadiness {
  const total = toNonNegativeNumber(unit?.totalUnits);
  const available = toNonNegativeNumber(unit?.availableUnits);
  const reserved = toNonNegativeNumber(unit?.reservedUnits);

  if (total === null) {
    return {
      isReady: false,
      code: 'invalid_total_units',
      field: 'totalUnits',
      message: 'Total units must be zero or greater',
    };
  }

  if (available === null) {
    return {
      isReady: false,
      code: 'invalid_available_units',
      field: 'availableUnits',
      message: 'Available units must be zero or greater',
    };
  }

  if (reserved === null) {
    return {
      isReady: false,
      code: 'invalid_reserved_units',
      field: 'reservedUnits',
      message: 'Reserved units must be zero or greater',
    };
  }

  if (available + reserved > total) {
    return {
      isReady: false,
      code: 'invalid_inventory_counts',
      field: 'reservedUnits',
      message: 'Each unit type must satisfy available + reserved <= total units',
    };
  }

  return {
    isReady: true,
    code: 'ready',
    field: null,
    message: null,
  };
}

function addFieldError(
  fieldErrors: Record<string, string>,
  messages: Set<string>,
  field: string,
  message: string,
) {
  fieldErrors[field] = message;
  messages.add(message);
}

export function getDevelopmentUnitPublishReadinessIssues(
  unit: any,
  transactionTypeValue: unknown,
  options: DevelopmentUnitPublishReadinessOptions = {},
): DevelopmentUnitPublishReadinessIssue[] {
  const transactionType = normalizeDevelopmentReadinessTransactionType(transactionTypeValue);
  const issues: DevelopmentUnitPublishReadinessIssue[] = [];
  const inventoryReadiness = getDevelopmentUnitInventoryReadiness(unit);
  const commercialReadiness = getDevelopmentUnitCommercialReadiness(unit, transactionType);

  if (!inventoryReadiness.isReady) {
    issues.push({
      code: inventoryReadiness.code,
      field: inventoryReadiness.field,
      message: inventoryReadiness.message ?? 'Unit type inventory is invalid',
    });
  }

  if (!commercialReadiness.isReady) {
    issues.push({
      code: commercialReadiness.code,
      field: commercialReadiness.field,
      message: commercialReadiness.message ?? 'Unit type commercial terms are invalid',
    });
  }

  if (transactionType === 'auction') {
    const timingReadiness = getDevelopmentUnitAuctionTimingReadiness(unit, {
      requireDates: true,
      requireFutureStart: true,
      ...options,
    });

    if (!timingReadiness.isReady) {
      issues.push({
        code: timingReadiness.code,
        field: timingReadiness.field,
        message: timingReadiness.message ?? 'Auction timing is invalid',
      });
    }
  }

  return issues;
}

export function getDevelopmentUnitPublishReadinessSummary(
  units: any[],
  transactionTypeValue: unknown,
  options: DevelopmentUnitPublishReadinessOptions = {},
): DevelopmentUnitPublishReadinessSummary {
  const transactionType = normalizeDevelopmentReadinessTransactionType(transactionTypeValue);
  const issues = units.flatMap(unit =>
    getDevelopmentUnitPublishReadinessIssues(unit, transactionType, options),
  );
  const fieldErrors: Record<string, string> = {};
  const messages = new Set<string>();
  const hasIssue = (code: DevelopmentUnitPublishReadinessIssue['code']) =>
    issues.some(issue => issue.code === code);

  if (hasIssue('invalid_total_units')) {
    addFieldError(
      fieldErrors,
      messages,
      'unitTypes.totalUnits',
      'Total units must be zero or greater',
    );
  }
  if (hasIssue('invalid_available_units')) {
    addFieldError(
      fieldErrors,
      messages,
      'unitTypes.availableUnits',
      'Available units must be zero or greater',
    );
  }
  if (hasIssue('invalid_reserved_units')) {
    addFieldError(
      fieldErrors,
      messages,
      'unitTypes.reservedUnits',
      'Reserved units must be zero or greater',
    );
  }
  if (hasIssue('invalid_inventory_counts')) {
    addFieldError(
      fieldErrors,
      messages,
      'unitTypes.reservedUnits',
      'Each unit type must satisfy available + reserved <= total units',
    );
  }

  if (transactionType === 'rent') {
    if (hasIssue('missing_monthly_rent')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.monthlyRentFrom',
        'All unit types must include monthly rent',
      );
    }
    if (hasIssue('invalid_monthly_rent_range')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.monthlyRentTo',
        'Monthly rent upper range must be greater than or equal to monthly rent from',
      );
    }
  } else if (transactionType === 'auction') {
    if (hasIssue('missing_starting_bid')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.startingBid',
        'All auction unit types must include a starting bid',
      );
    }
    if (hasIssue('invalid_reserve_price_range')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.reservePrice',
        'Auction reserve price must be greater than or equal to starting bid',
      );
    }
    if (hasIssue('missing_auction_start_date') || hasIssue('invalid_auction_start_date')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.auctionStartDate',
        'All auction unit types must include a valid auction start date',
      );
    }
    if (hasIssue('auction_start_date_in_past')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.auctionStartDate',
        'Auction start date must be in the future',
      );
    }
    if (hasIssue('missing_auction_end_date') || hasIssue('invalid_auction_end_date')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.auctionEndDate',
        'All auction unit types must include a valid auction end date',
      );
    }
    if (hasIssue('invalid_auction_date_order')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.auctionEndDate',
        'Auction end date must be after the start date',
      );
    }
  } else {
    if (hasIssue('missing_sale_price')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.priceFrom',
        'All unit types must include a base price',
      );
    }
    if (hasIssue('invalid_sale_price_range')) {
      addFieldError(
        fieldErrors,
        messages,
        'unitTypes.priceTo',
        'Price upper range must be greater than or equal to base price',
      );
    }
  }

  return {
    isReady: issues.length === 0,
    issues,
    fieldErrors,
    messages: Array.from(messages),
  };
}

export function getDevelopmentPublishBasicsReadiness(
  dev: any,
  options: DevelopmentPublishBasicsReadinessOptions = {},
): DevelopmentPublishBasicsReadinessSummary {
  const { minDescriptionLength = 50, minHighlights = 3, requireStatusDates = true } = options;
  const issues: DevelopmentPublishBasicsReadinessIssue[] = [];
  const name = String(dev?.name ?? dev?.developmentData?.name ?? '').trim();
  const address = String(
    dev?.location?.address ??
      dev?.developmentData?.location?.address ??
      dev?.address ??
      dev?.developmentData?.address ??
      '',
  ).trim();
  const description = String(dev?.description ?? dev?.developmentData?.description ?? '').trim();
  const highlights = normalizeArrayLike(dev?.highlights ?? dev?.developmentData?.highlights);
  const status = String(dev?.status ?? dev?.developmentData?.status ?? '').trim();
  const ownershipTypes = normalizeArrayLike(
    dev?.ownershipTypes ?? dev?.developmentData?.ownershipTypes ?? dev?.ownershipType ?? dev?.developmentData?.ownershipType,
  );
  const launchDate = String(dev?.launchDate ?? dev?.developmentData?.launchDate ?? '').trim();
  const completionDate = String(
    dev?.completionDate ?? dev?.developmentData?.completionDate ?? '',
  ).trim();
  const handoverDuringConstruction = Boolean(
    dev?.handoverDuringConstruction ?? dev?.developmentData?.handoverDuringConstruction,
  );
  const expectedFirstHandoverDate = String(
    dev?.expectedFirstHandoverDate ?? dev?.developmentData?.expectedFirstHandoverDate ?? '',
  ).trim();

  if (!name) {
    issues.push({
      code: 'missing_name',
      field: 'name',
      fieldMessage: 'Development Name is required',
      message: 'Development Name is required',
    });
  }

  if (!address) {
    issues.push({
      code: 'missing_location_address',
      field: 'location.address',
      fieldMessage: 'Location Address is required',
      message: 'Location Address is required',
    });
  }

  if (!hasDevelopmentHeroImage(dev)) {
    issues.push({
      code: 'missing_hero_image',
      field: 'media.heroImage',
      fieldMessage: 'At least one photo (Hero Image) is required',
      message: 'At least 1 image is required',
    });
  }

  if (description.length === 0) {
    issues.push({
      code: 'missing_description',
      field: 'description',
      fieldMessage: 'Description is required before publishing',
      message: 'Description is required',
    });
  } else if (description.length < minDescriptionLength) {
    issues.push({
      code: 'description_too_short',
      field: 'description',
      fieldMessage: `Description must be at least ${minDescriptionLength} characters`,
      message: `Description must be at least ${minDescriptionLength} characters`,
    });
  }

  if (highlights.length < minHighlights) {
    issues.push({
      code: 'missing_highlights',
      field: 'highlights',
      fieldMessage: `Add at least ${minHighlights} highlights`,
      message: `Add at least ${minHighlights} highlights`,
    });
  }

  if (!status) {
    issues.push({
      code: 'missing_status',
      field: 'status',
      fieldMessage: 'Development status is required',
      message: 'Development status is required',
    });
  }

  if (requireStatusDates && (status === 'launching-soon' || status === 'selling')) {
    if (!launchDate) {
      issues.push({
        code: 'missing_launch_date',
        field: 'launchDate',
        fieldMessage: 'Launch date is required for this status',
        message: 'Launch date is required for this status',
      });
    }
    if (!completionDate) {
      issues.push({
        code: 'missing_completion_date',
        field: 'completionDate',
        fieldMessage: 'Expected completion date is required for this status',
        message: 'Expected completion date is required for this status',
      });
    }
  }

  if (ownershipTypes.length === 0) {
    issues.push({
      code: 'missing_ownership_type',
      field: 'ownershipTypes',
      fieldMessage: 'Select at least one ownership type',
      message: 'Select at least one ownership type',
    });
  }

  if (handoverDuringConstruction && !expectedFirstHandoverDate) {
    issues.push({
      code: 'missing_first_handover_date',
      field: 'expectedFirstHandoverDate',
      fieldMessage: 'Expected first handover date is required when handovers occur during construction',
      message: 'Expected first handover date is required when handovers occur during construction',
    });
  }

  const fieldErrors: Record<string, string> = {};
  const messages = new Set<string>();

  issues.forEach(issue => {
    if (issue.field) fieldErrors[issue.field] = issue.fieldMessage;
    messages.add(issue.message);
  });

  return {
    isReady: issues.length === 0,
    issues,
    fieldErrors,
    messages: Array.from(messages),
  };
}

function getCanonicalPublishUnits(dev: any): any[] {
  if (Array.isArray(dev?.stepData?.unit_types?.unitTypes)) {
    return dev.stepData.unit_types.unitTypes;
  }
  return Array.isArray(dev?.unitTypes) ? dev.unitTypes : [];
}

function getClassificationType(dev: any, explicitClassification: any): string {
  const classification =
    explicitClassification ?? dev?.classification ?? dev?.developmentData?.classification;
  return String(
    classification?.type ??
      classification?.category ??
      dev?.classificationType ??
      dev?.developmentData?.classificationType ??
      '',
  ).trim();
}

export function getDevelopmentPublishReadinessSummary(
  dev: any,
  options: DevelopmentPublishReadinessOptions = {},
): DevelopmentPublishReadinessSummary {
  const {
    classification,
    requireClassification = true,
    requireUnitTypes = true,
    transactionType: transactionTypeOverride,
    ...readinessOptions
  } = options;
  const basics = getDevelopmentPublishBasicsReadiness(dev, readinessOptions);
  const classificationType = getClassificationType(dev, classification);
  const units = getCanonicalPublishUnits(dev);
  const issues: DevelopmentPublishReadinessIssue[] = [...basics.issues];
  const fieldErrors: Record<string, string> = { ...basics.fieldErrors };
  const messages = new Set<string>(basics.messages);
  let unitSummary: DevelopmentUnitPublishReadinessSummary | null = null;

  if (requireClassification && !classificationType) {
    const issue: DevelopmentPublishReadinessIssue = {
      code: 'missing_classification',
      field: 'classification.type',
      fieldMessage: 'Classification Type is required',
      message: 'Classification Type is required',
    };
    issues.push(issue);
    addFieldError(fieldErrors, messages, issue.field, issue.fieldMessage);
  }

  if (requireUnitTypes && classificationType !== 'land') {
    if (units.length === 0) {
      const issue: DevelopmentPublishReadinessIssue = {
        code: 'missing_unit_types',
        field: 'unitTypes',
        fieldMessage: 'At least one unit type is required',
        message: 'Add at least one unit type',
      };
      issues.push(issue);
      addFieldError(fieldErrors, messages, issue.field, issue.fieldMessage);
    } else {
      const transactionType =
        transactionTypeOverride ??
        dev?.transactionType ??
        dev?.developmentData?.transactionType ??
        'for_sale';
      unitSummary = getDevelopmentUnitPublishReadinessSummary(
        units,
        transactionType,
        readinessOptions,
      );
      issues.push(...unitSummary.issues);
      Object.assign(fieldErrors, unitSummary.fieldErrors);
      unitSummary.messages.forEach(message => messages.add(message));
    }
  }

  return {
    isReady: issues.length === 0,
    issues,
    fieldErrors,
    messages: Array.from(messages),
    basics,
    units: unitSummary,
  };
}

export function calculateDevelopmentReadiness(dev: any): DevelopmentReadinessResult {
  const missing: Record<string, string[]> = {
    basic: [],
    location: [],
    media: [],
    amenities: [],
    specs: [],
  };
  let score = 0;

  if (dev?.name && dev?.description && dev.description.length > 50) {
    score += 20;
  } else {
    if (!dev?.name) missing.basic.push('Name');
    if (!dev?.description || dev.description.length <= 50) {
      missing.basic.push('Description (min 50 chars)');
    }
  }

  if (dev?.address && dev?.latitude && dev?.longitude) {
    score += 20;
  } else {
    if (!dev?.address) missing.location.push('Address');
    if (!dev?.latitude || !dev?.longitude) missing.location.push('Map Location');
  }

  const imageCount = countArrayLikeJson(dev?.images);
  if (imageCount >= 1) {
    score += 20;
  } else {
    missing.media.push('Main Image');
  }

  const amenityCount = countArrayLikeJson(dev?.amenities);
  if (amenityCount >= 3) {
    score += 20;
  } else {
    missing.amenities.push(`Select at least 3 amenities (Current: ${amenityCount})`);
  }

  const pricing = getDevelopmentReadinessPricing(dev);
  if (pricing.value !== null) {
    score += 20;
  } else {
    missing.specs.push(pricing.missingLabel);
  }

  return { score, missing };
}
