export const ENV = {
  appId: process.env.VITE_APP_ID ?? '',
  cookieSecret: process.env.JWT_SECRET ?? '',
  appUrl: process.env.VITE_APP_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? '',
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? '',
  ownerId: process.env.OWNER_OPEN_ID ?? '',
  isProduction: process.env.NODE_ENV === 'production',
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? '',
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? '',
  // Stripe configuration
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  // Google Maps configuration
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
  googleGeocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY ?? '',
  googleStreetViewApiKey: process.env.GOOGLE_STREET_VIEW_API_KEY ?? '',
  // AWS S3 + CloudFront configuration
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  s3BucketName: process.env.S3_BUCKET_NAME ?? '',
  cloudFrontUrl: process.env.CLOUDFRONT_URL ?? '',
  maxImageSizeMb: parseInt(process.env.MAX_IMAGE_SIZE_MB ?? '10'),
  // Email configuration
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
};
