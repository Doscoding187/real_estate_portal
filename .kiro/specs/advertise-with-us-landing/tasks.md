# Implementation Plan

- [x] 1. Set up project structure and design system





  - Create directory structure for advertise landing page components
  - Set up soft-UI design tokens in Tailwind config
  - Create shared animation utilities using Framer Motion
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 1.1 Create soft-UI design tokens


  - Implement color palette with gradients (primary, secondary, neutral)
  - Define shadow system (soft, softHover, softLarge)
  - Define border radius tokens (soft, softLarge, softXL)
  - Define transition timing functions
  - _Requirements: 11.1, 11.2_

- [x] 1.2 Write property test for design token consistency


  - **Property 1: Design token structure**
  - **Validates: Requirements 11.1**

- [x] 1.3 Create animation utility functions


  - Implement fadeUp animation variant
  - Implement softLift animation variant
  - Implement staggerContainer animation variant
  - Create scroll-triggered animation hook
  - _Requirements: 11.1, 11.2, 11.5_

- [x] 1.4 Write property test for animation timing



  - **Property 20: Animation duration**
  - **Validates: Requirements 11.5**

- [x] 2. Implement Hero Section







  - Create HeroSection component with TypeScript interfaces
  - Implement headline and subheadline with gradient text
  - Create CTA button group with primary and secondary variants
  - Build animated preview carousel
  - Add trust bar with partner logos
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.1 Create HeroSection component structure


  - Define HeroSectionProps interface
  - Implement responsive layout (mobile, tablet, desktop)
  - Add gradient background with soft-UI styling
  - _Requirements: 1.1, 10.2, 10.3, 10.4_

- [x] 2.2 Implement CTA button group


  - Create primary CTA with gradient background
  - Create secondary CTA with outline style
  - Add hover animations with soft lift effect
  - Implement click tracking for analytics
  - _Requirements: 1.2, 8.4, 11.2_

- [x] 2.3 Write property test for CTA navigation


  - **Property 13: Primary CTA navigation**
  - **Validates: Requirements 8.4**

- [x] 2.4 Build animated preview carousel (DEPRECATED - replaced with static banner)
  - Implement auto-rotating carousel (5s intervals)
  - Add preview slides for Explore feed, property cards, developer showcase
  - Implement smooth fade transitions between slides
  - Add pause on hover functionality
  - _Requirements: 1.3, 11.1_

- [x] 2.5 Implement static billboard banner for hero section
  - Created BillboardBanner component with static, clickable design
  - Entire banner acts as link to development landing page
  - Hover effects: lift animation, glow ring, image zoom
  - Gradient overlay for text readability
  - Featured badge indicator
  - Smooth spring animations with Framer Motion
  - Full accessibility (ARIA labels, keyboard support)
  - Updated HeroSection to use BillboardBanner instead of PreviewCarousel
  - Updated AdvertiseHeroDemo page to showcase static banner
  - Updated requirements.md and design.md to reflect static banner approach
  - **Note**: PreviewCarousel component preserved for potential use in middle sections
  - _Requirements: 1.3, 1.4, 11.1, 11.2, 11.4, 10.5_

- [x] 2.6 Write property test for hero load performance
  - **Property 1: Hero section load performance**
  - **Validates: Requirements 1.1, 10.1**
  - Comprehensive property-based tests for hero section performance
  - Tests render time (< 200ms), critical content visibility, layout stability
  - Tests semantic HTML structure, gradient backgrounds, responsive classes
  - Tests with varying configurations (slides, trust signals, content length)
  - All 8 test properties passing with 50-100 iterations each

- [x] 3. Implement Partner Selection Section





  - Create PartnerTypeCard component
  - Implement five partner type cards (Agent, Developer, Bank, Bond Originator, Service Provider)
  - Add staggered fade-up animations
  - Implement hover and click interactions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Create PartnerTypeCard component


  - Define PartnerTypeCardProps interface
  - Implement card layout with icon, title, benefit, CTA
  - Add soft-UI card styling with rounded corners and shadows
  - _Requirements: 2.2_

- [x] 3.2 Write property test for partner card completeness


  - **Property 2: Partner card completeness**
  - **Validates: Requirements 2.2**

- [x] 3.3 Implement partner card interactions


  - Add hover lift animation with shadow expansion
  - Implement click navigation to sub-landing pages
  - Add touch feedback for mobile
  - Track partner type selection in analytics
  - _Requirements: 2.3, 2.4_

- [x] 3.4 Write property test for partner card navigation


  - **Property 3: Partner card navigation**
  - **Validates: Requirements 2.3**

- [x] 3.5 Write property test for partner card hover


  - **Property 4: Partner card hover interaction**
  - **Validates: Requirements 2.4**

- [x] 3.6 Implement staggered animations


  - Add Intersection Observer for scroll detection
  - Implement staggered fade-up with 100ms delay per card
  - Ensure animations respect prefers-reduced-motion
  - _Requirements: 2.1, 11.1, 11.4_

- [ ] 4. Implement Value Proposition Section




  - Create FeatureBlock component
  - Implement four feature blocks (High-Intent Audience, AI-Driven Visibility, Verified Leads, Dashboard Control)
  - Add scroll-triggered fade-up animations
  - Ensure consistent spacing and alignment
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.1 Create FeatureBlock component


  - Define FeatureBlockProps interface
  - Implement layout with soft-UI icon, headline, description
  - Add responsive grid layout
  - _Requirements: 3.3_

- [x] 4.2 Write property test for feature block structure


  - **Property 6: Feature block structure**
  - **Validates: Requirements 3.3**



- [x] 4.3 Implement feature block animations

  - Add fade-up animation when entering viewport
  - Implement icon pulse animation on hover

  - _Requirements: 3.2, 11.1_

- [x] 4.4 Write property test for feature block animation

  - **Property 5: Feature block animation**
  - **Validates: Requirements 3.2**

- [x] 4.5 Ensure spacing consistency


  - Implement consistent gap spacing in grid
  - Test alignment across all breakpoints
  - _Requirements: 3.4_


- [x] 4.6 Write property test for spacing consistency

  - **Property 7: Feature block spacing consistency**
  - **Validates: Requirements 3.4**

- [x] 5. Implement How It Works Section ✅






  - Create ProcessStep component
  - Implement three sequential steps (Create Profile, Add Listings, Get Leads)
  - Add numbered indicators and connecting lines
  - Implement CTA button below steps
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.1 Create ProcessStep component


  - Define ProcessStepProps interface
  - Implement step layout with number badge, icon, title, description
  - Add gradient background to number badge
  - _Requirements: 4.2_

- [x] 5.2 Write property test for process step structure


  - **Property 8: Process step structure**
  - **Validates: Requirements 4.2**


- [x] 5.3 Implement sequential reveal animation
  - Add staggered animation for steps
  - Implement connecting lines between steps (desktop only)
  - _Requirements: 4.1, 11.1_


- [x] 5.4 Add CTA button
  - Create "Start Advertising Now" button
  - Implement click tracking
  - _Requirements: 4.3_

- [x] 6. Implement Features Grid Section




  - Create FeatureTile component
  - Implement six feature tiles (Listing Promotion, Explore Feed Ads, Boost Campaigns, Lead Engine, Team Collaboration, Media Templates)
  - Add soft-UI card styling
  - Implement hover lift animations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6.1 Create FeatureTile component


  - Define FeatureTileProps interface
  - Implement tile layout with icon, title, description
  - Add soft-UI card styling with border-radius and box-shadow
  - _Requirements: 5.2_


- [x] 6.2 Write property test for feature tile styling

  - **Property 9: Feature tile styling**
  - **Validates: Requirements 5.2**


- [x] 6.3 Implement feature tile interactions

  - Add hover lift animation
  - Implement icon color transition on hover
  - _Requirements: 5.3, 11.2_


- [x] 6.4 Write property test for feature tile hover

  - **Property 10: Feature tile hover interaction**
  - **Validates: Requirements 5.3**

- [x] 6.5 Implement responsive grid


  - Create responsive grid layout (3 columns desktop, 2 columns tablet, 1 column mobile)
  - Ensure touch-optimized spacing on mobile
  - _Requirements: 5.5_

- [x] 7. Implement Social Proof Section





  - Create MetricCard component
  - Display partner logos (developers, agencies, financial institutions)
  - Implement four key metrics (Verified Leads, Properties Promoted, Partner Satisfaction, Active Partners)
  - Add count-up animation for metrics
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7.1 Create MetricCard component


  - Define MetricCardProps interface
  - Implement layout with large number, label, optional icon
  - Add responsive styling
  - _Requirements: 6.3_


- [x] 7.2 Write property test for metric structure

  - **Property 11: Metric structure**
  - **Validates: Requirements 6.3**


- [x] 7.3 Implement count-up animation

  - Add count-up animation when metric enters viewport
  - Use easing function for smooth counting
  - _Requirements: 6.2, 11.1_


- [x] 7.4 Display partner logos

  - Create logo grid or carousel
  - Implement responsive layout
  - Add placeholder logos with disclaimer
  - _Requirements: 6.1, 6.4, 6.5_

- [x] 8. Implement Pricing Preview Section





  - Create PricingCard component
  - Implement four pricing category cards (Agent Plans, Developer Plans, Bank/Loan Provider Plans, Service Provider Plans)
  - Add minimalist card styling
  - Implement navigation to full pricing page
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [x] 8.1 Create PricingCard component

  - Define PricingCardProps interface
  - Implement minimalist card layout
  - Add hover border glow effect
  - _Requirements: 7.2_


- [x] 8.2 Implement pricing card navigation

  - Add click handler to navigate to full pricing page
  - Track pricing card clicks in analytics
  - _Requirements: 7.3_

- [x] 8.3 Write property test for pricing card navigation


  - **Property 12: Pricing card navigation**
  - **Validates: Requirements 7.3**


- [x] 8.4 Add "View Full Pricing" CTA

  - Create CTA button below pricing cards
  - Implement click tracking
  - _Requirements: 7.4_

- [x] 9. Implement Final CTA Section





  - Create clean, minimal CTA section
  - Display compelling headline and subtext
  - Implement primary and secondary CTA buttons
  - Add mobile sticky CTA
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9.1 Create final CTA section layout


  - Implement clean, minimal design
  - Add headline and subtext
  - Create CTA button group
  - _Requirements: 8.1, 8.2_


- [x] 9.2 Create MobileStickyCTA component

  - Define MobileStickyCTAProps interface
  - Implement sticky positioning with safe area insets
  - Add slide-up animation when scrolling past hero
  - Implement dismissible functionality
  - _Requirements: 8.3_


- [x] 9.3 Implement CTA tracking

  - Track all CTA clicks with location metadata
  - Track scroll depth to measure engagement
  - _Requirements: 8.4, 8.5_

- [x] 10. Implement FAQ Section





  - Create FAQAccordionItem component
  - Implement 6-10 FAQ items
  - Add smooth expand/collapse animations
  - Ensure keyboard accessibility
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10.1 Create FAQAccordionItem component


  - Define FAQAccordionItemProps interface
  - Implement accordion layout with question and answer
  - Add expand/collapse animation
  - _Requirements: 9.1, 9.2_


- [x] 10.2 Write property test for FAQ accordion behavior

  - **Property 14: FAQ accordion behavior**
  - **Validates: Requirements 9.2**

- [x] 10.3 Implement keyboard accessibility

  - Support Enter/Space to toggle accordion
  - Add proper ARIA attributes
  - Ensure focus management
  - _Requirements: 9.5_


- [x] 10.4 Add FAQ content
  - Create 6-10 FAQ items addressing common concerns
  - Organize questions by importance
  - Ensure clear, concise language
  - _Requirements: 9.3, 9.4_

- [x] 11. Implement responsive layouts



  - Test and refine mobile layouts (< 768px)
  - Test and refine tablet layouts (768px - 1024px)
  - Test and refine desktop layouts (> 1024px)
  - Ensure consistent experience across devices
  - _Requirements: 10.1, 10.2, 10.3, 10.4_


- [x] 11.1 Implement mobile responsive layouts

  - Stack all sections vertically
  - Use single-column layouts
  - Optimize touch targets
  - Test on iOS and Android devices
  - _Requirements: 10.2_



- [x] 11.2 Implement tablet responsive layouts

  - Use two-column grids where appropriate
  - Adjust spacing for tablet viewports
  - Test on iPad and Android tablets
  - _Requirements: 10.3_




- [x] 11.3 Implement desktop responsive layouts

  - Use full-width grids with max 1440px container
  - Optimize spacing for large screens
  - Test on various desktop resolutions
  - _Requirements: 10.4_

- [x] 12. Implement performance optimizations





  - Optimize images (WebP with JPEG fallback)
  - Implement lazy loading for below-the-fold content
  - Add code splitting for non-critical sections
  - Inline critical CSS
  - _Requirements: 10.1, 10.5_

- [x] 12.1 Optimize images


  - Convert images to WebP format
  - Implement responsive images with srcset
  - Add blur-up placeholder technique
  - Lazy load images below the fold
  - _Requirements: 10.1_


- [x] 12.2 Implement code splitting

  - Lazy load FAQ section
  - Lazy load pricing preview section
  - Lazy load social proof logos
  - _Requirements: 10.1_


- [x] 12.3 Optimize CSS delivery

  - Inline critical CSS for above-the-fold content
  - Defer non-critical CSS
  - Add resource hints (preconnect, dns-prefetch, preload)
  - _Requirements: 10.1_


- [x] 12.4 Write property test for page load performance

  - **Property 15: Page load performance**
  - **Validates: Requirements 10.1**

- [x] 13. Implement accessibility features





  - Add ARIA labels and roles
  - Implement keyboard navigation
  - Add focus indicators
  - Ensure screen reader compatibility
  - _Requirements: 10.5_

- [x] 13.1 Add ARIA attributes


  - Add aria-label to all interactive elements
  - Add aria-describedby where appropriate
  - Add role attributes to sections
  - _Requirements: 10.5_


- [x] 13.2 Implement keyboard navigation

  - Ensure all interactive elements are keyboard accessible
  - Add skip links to main content sections
  - Implement roving tabindex for card grids
  - Support arrow key navigation in FAQ accordion
  - _Requirements: 10.5_


- [x] 13.3 Add focus indicators

  - Implement visible focus indicators (3px outline)
  - Ensure focus indicators meet WCAG AA contrast requirements
  - Test focus management throughout page
  - _Requirements: 10.5_


- [x] 13.4 Test screen reader compatibility

  - Test with NVDA (Windows)
  - Test with JAWS (Windows)
  - Test with VoiceOver (macOS/iOS)
  - _Requirements: 10.5_

- [x] 14. Implement animation system





  - Create scroll-triggered animation hook
  - Implement reduced motion support
  - Optimize animation performance
  - Test animations across devices
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_


- [x] 14.1 Create useScrollAnimation hook

  - Implement Intersection Observer for scroll detection
  - Add threshold and rootMargin configuration
  - Return isVisible state for triggering animations
  - _Requirements: 11.1_




- [x] 14.2 Implement reduced motion support





  - Detect prefers-reduced-motion media query
  - Disable or reduce animations when enabled
  - Test with reduced motion enabled
  - _Requirements: 11.4_


- [x] 14.3 Optimize animation performance

  - Use transform and opacity for animations (GPU-accelerated)
  - Avoid animating layout properties
  - Test frame rate (maintain 60fps)
  - Detect low-end devices and reduce animations
  - _Requirements: 11.2, 11.5_


- [x] 14.4 Write property test for viewport animation

  - **Property 18: Viewport animation**
  - **Validates: Requirements 11.1**




- [x] 14.5 Write property test for interactive element hover







  - **Property 19: Interactive element hover**
  - **Validates: Requirements 11.2**

- [x] 15. Implement navigation integration





  - Add "Advertise With Us" link to main navigation
  - Highlight active navigation item
  - Implement breadcrumb navigation
  - Ensure consistent header and footer
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 15.1 Add navigation link


  - Add "Advertise With Us" to main navigation menu
  - Implement click handler to navigate to landing page
  - _Requirements: 12.1_


- [x] 15.2 Implement active state


  - Highlight "Advertise With Us" when on landing page
  - Use consistent styling with other active nav items
  - _Requirements: 12.3_




- [x] 15.3 Add breadcrumb navigation
  - Implement breadcrumb component
  - Show "Home > Advertise With Us" path
  - Add structured data for breadcrumbs
  - _Requirements: 12.5_

- [x] 16. Implement SEO optimization



  - Add meta tags (title, description, Open Graph)
  - Implement structured data (Schema.org)
  - Optimize heading hierarchy
  - Add canonical URL

  - _Requirements: 10.5_

- [x] 16.1 Add meta tags

  - Add title tag (50-70 characters)
  - Add meta description (150-160 characters)
  - Add Open Graph tags (og:title, og:description, og:image, og:type)
  - Add Twitter Card tags
  - _Requirements: 10.5_


- [x] 16.2 Implement structured data

  - Add Schema.org WebPage markup
  - Add Service markup for advertising platform
  - Add Organization markup
  - Add BreadcrumbList markup
  - _Requirements: 10.5_



- [x] 16.3 Optimize heading hierarchy

  - Ensure single H1 per page
  - Use proper heading levels (H2, H3, etc.)
  - Include keywords in headings
  - _Requirements: 10.5_



- [x] 17. Implement analytics tracking



  - Track page views
  - Track CTA clicks with location metadata
  - Track partner type selection
  - Track scroll depth
  - Track FAQ interactions
  - _Requirements: 8.4, 8.5_


- [x] 17.1 Implement event tracking

  - Create trackEvent utility function
  - Track CTA clicks with label and location
  - Track partner type clicks
  - Track scroll depth at 25%, 50%, 75%, 100%
  - Track FAQ expand/collapse
  - _Requirements: 8.4, 8.5_

- [x] 17.2 Add analytics metadata


  - Include device type in all events
  - Include session ID in all events
  - Include referrer when available
  - Add user ID when authenticated
  - _Requirements: 8.4_



- [x] 18. Implement error handling



  - Add loading states for all sections
  - Handle content loading failures
  - Implement fallback content
  - Add error boundaries
  - _Requirements: 10.1_


- [x] 18.1 Create loading states

  - Add skeleton loaders for hero section
  - Add loading indicators for delayed sections
  - Implement progressive loading
  - _Requirements: 10.1_


- [x] 18.2 Handle loading failures

  - Show error message with retry button for partner types
  - Show placeholder values for metrics
  - Hide FAQ section if loading fails
  - Show generic CTA if pricing data fails
  - _Requirements: 10.1_


- [x] 18.3 Add error boundaries

  - Wrap each major section in error boundary
  - Show fallback UI on component errors
  - Log errors to monitoring service
  - _Requirements: 10.1_




- [x] 19. Implement CMS integration


  - Connect to CMS for content management
  - Make all text content editable
  - Enable partner type card management
  - Enable FAQ management
  - Enable metric updates
  - _Requirements: 1.1, 2.1, 6.2, 9.1_


- [x] 19.1 Set up CMS connection

  - Configure CMS API client
  - Create content models for page sections
  - Implement content fetching
  - _Requirements: 1.1_


- [x] 19.2 Implement content validation

  - Validate headline length (50-70 characters)
  - Validate subheadline length (100-150 characters)
  - Validate feature descriptions (80-120 characters)
  - Validate FAQ answers (150-300 characters)
  - _Requirements: 1.1, 3.3, 9.3_

- [x] 20. Checkpoint - Run Lighthouse audits




  - Ensure all tests pass, ask the user if questions arise.
  - **Status**: Ready to run - comprehensive guide created at TASK_20_LIGHTHOUSE_AUDIT_GUIDE.md

- [x] 20.1 Run Lighthouse performance audit

  - **Property 16: Lighthouse performance score**
  - **Validates: Requirements 10.5**



- [x] 20.2 Run Lighthouse accessibility audit
  - **Property 17: Lighthouse accessibility score**
  - **Validates: Requirements 10.5**

- [x] 20.3 Fix any issues found


  - Address performance issues
  - Fix accessibility violations
  - Optimize images and assets
  - _Requirements: 10.5_

- [x] 21. Cross-browser testing





  - Test on Chrome (latest 2 versions)
  - Test on Firefox (latest 2 versions)
  - Test on Safari (latest 2 versions)
  - Test on Edge (latest 2 versions)
  - Test on Mobile Safari (iOS 14+)
  - Test on Chrome Mobile (Android 10+)
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 21.1 Test desktop browsers

  - Test visual rendering on Chrome
  - Test visual rendering on Firefox
  - Test visual rendering on Safari
  - Test visual rendering on Edge
  - Test animations and interactions
  - _Requirements: 10.4_


- [x] 21.2 Test mobile browsers

  - Test on iOS Safari (iPhone)
  - Test on Chrome Mobile (Android)
  - Test touch interactions
  - Test mobile sticky CTA
  - _Requirements: 10.2_




- [x] 21.3 Write unit tests for cross-browser compatibility




  - Test CSS Grid/Flexbox support
  - Test Intersection Observer API support
  - Test animation compatibility
  - _Requirements: 10.1_




- [x] 22. Visual regression testing
  - Capture baseline screenshots
  - Test desktop viewport (1440px)
  - Test tablet viewport (768px)
  - Test mobile viewport (375px)
  - Test hover states

  - Test animation states
  - _Requirements: 10.2, 10.3, 10.4_

- [x] 22.1 Set up visual regression testing

  - Configure Percy or Chromatic
  - Create test scenarios for all viewports
  - Capture baseline screenshots
  - _Requirements: 10.2, 10.3, 10.4_


- [x] 22.2 Test interaction states

  - Capture hover states for all interactive elements
  - Capture animation states
  - Capture loading states
  - Capture error states
  - _Requirements: 11.2_


- [x] 23. Final Checkpoint - Deployment preparation





  - Ensure all tests pass, ask the user if questions arise.

- [x] 23.1 Run final checklist

  - Verify all CTAs navigate correctly
  - Verify analytics tracking
  - Test with screen reader
  - Test keyboard navigation
  - Verify SEO meta tags
  - Test loading states
  - Test error states
  - Verify responsive layouts
  - Test animation performance
  - Verify image optimization
  - Test with reduced motion enabled
  - Verify WCAG AA compliance
  - _Requirements: 10.5, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5_


- [x] 23.2 Create deployment documentation

  - Document environment variables
  - Document CMS configuration
  - Document analytics setup
  - Create deployment checklist
  - _Requirements: 10.5_
