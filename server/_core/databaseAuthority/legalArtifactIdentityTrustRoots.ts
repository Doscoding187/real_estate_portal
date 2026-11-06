/**
 * No legal artifact signing key has been approved for production yet. Keep this
 * set empty until Edward reviews and pins a public key in a dedicated change.
 * Edward generates and holds the private key on his own machine; it never
 * enters the repository, image, Container Apps job, logs, or chat.
 */
export const LEGAL_ARTIFACT_IDENTITY_TRUSTED_PUBLIC_KEYS: Readonly<Record<string, string>> =
  Object.freeze({});
