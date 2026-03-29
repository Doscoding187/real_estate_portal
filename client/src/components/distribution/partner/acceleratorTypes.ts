export const QUALIFICATION_DISCLAIMER_LINES = [
  'This is an indicative affordability estimate, not a credit approval.',
  'Final eligibility depends on credit profile, lender criteria, and verified documents.',
  'A credit check requires the client’s explicit consent.',
] as const;

export type AcceleratorFormValues = {
  subjectName: string;
  subjectPhone: string;
  grossIncomeMonthly: string;
  deductionsMonthly: string;
  depositAmount: string;
  province: string;
  city: string;
  suburb: string;
};

export type AcceleratorAssessment = {
  assessmentId: string;
  subjectName: string | null;
  subjectPhone: string | null;
  grossIncomeMonthly: number;
  deductionsMonthly: number;
  depositAmount: number;
  assumptions: {
    interestRateAnnual: number;
    termMonths: number;
    maxRepaymentRatio: number;
    calcVersion: string;
  };
  outputs: {
    maxMonthlyRepayment: number;
    indicativeLoanAmount: number;
    indicativePurchaseMin: number;
    indicativePurchaseMax: number;
    purchasePrice: number;
    confidenceLabel: string;
    confidenceLevel: 'standard' | 'low';
  };
  locationFilter: {
    province?: string | null;
    city?: string | null;
    suburb?: string | null;
  } | null;
  creditCheck: {
    consentGiven: boolean;
    requestedAt: string | null;
  };
  disclaimers: string[];
  createdAt: string;
};

export type AcceleratorMatchItem = {
  developmentId: number;
  developmentName: string;
  area: string;
  city: string | null;
  province: string | null;
  suburb: string | null;
  logoUrl: string | null;
  purchasePrice: number;
  bestFitRatio: number;
  developmentPriority: number;
  unitOptions: Array<{
    unitTypeId: string | null;
    unitName: string;
    bedrooms: number | null;
    priceFrom: number;
    priceTo: number;
    fitRatio: number;
  }>;
};

export type AcceleratorMatchSnapshot = {
  assessmentId: string;
  matchSnapshotId: string;
  createdAt: string;
  purchasePrice: number;
  matches: AcceleratorMatchItem[];
  createdNewSnapshot: boolean;
};
