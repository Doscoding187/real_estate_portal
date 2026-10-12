export interface RegistrationLegalDocument {
  version: string;
  path: string;
  sha256: string;
  content: string;
}
export interface RegistrationLegalRelease {
  bundleId: string;
  effectiveAt: string;
  terms: RegistrationLegalDocument;
  privacy: RegistrationLegalDocument;
}
