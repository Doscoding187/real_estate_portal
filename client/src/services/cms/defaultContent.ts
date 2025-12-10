/**
 * Default CMS Content
 * 
 * This file contains the default content for the Advertise With Us page.
 * This content is used as fallback and initial content before CMS is configured.
 */

import { AdvertisePageContent } from './types';

export const defaultContent: AdvertisePageContent = {
  hero: {
    headline: 'Reach Thousands of Verified Home Seekers',
    subheadline: 'Advertise your properties, developments, and services to high-intent buyers and renters across South Africa. AI-powered visibility, verified leads, and full dashboard control.',
    primaryCTA: {
      label: 'Get Started',
      href: '/register',
      variant: 'primary',
    },
    secondaryCTA: {
      label: 'Request a Demo',
      href: '/contact',
      variant: 'secondary',
    },
    billboard: {
      imageUrl: '/images/featured-development.jpg',
      alt: 'Featured luxury development in Sandton',
      developmentName: 'Sandton Heights',
      tagline: 'Luxury Living in the Heart of Johannesburg',
      ctaLabel: 'View Development',
      href: '/developments/sandton-heights',
    },
    trustSignals: [
      {
        type: 'text',
        content: 'Trusted by 500+ Property Professionals',
      },
      {
        type: 'text',
        content: '10,000+ Active Listings',
      },
      {
        type: 'text',
        content: '95% Lead Verification Rate',
      },
    ],
  },

  partnerTypes: [
    {
      id: 'agent',
      iconName: 'Home',
      title: 'Real Estate Agent',
      benefit: 'Showcase your listings to thousands of verified buyers and renters actively searching for properties.',
      href: '/advertise/agents',
      order: 1,
    },
    {
      id: 'developer',
      iconName: 'Building2',
      title: 'Property Developer',
      benefit: 'Promote your developments with immersive media, reach qualified buyers, and track leads in real-time.',
      href: '/advertise/developers',
      order: 2,
    },
    {
      id: 'bank',
      iconName: 'Landmark',
      title: 'Bank / Financial Institution',
      benefit: 'Connect with home buyers at the perfect moment and offer tailored financing solutions.',
      href: '/advertise/banks',
      order: 3,
    },
    {
      id: 'bond-originator',
      iconName: 'FileText',
      title: 'Bond Originator',
      benefit: 'Capture high-intent leads looking for home loans and grow your origination pipeline.',
      href: '/advertise/bond-originators',
      order: 4,
    },
    {
      id: 'service-provider',
      iconName: 'Wrench',
      title: 'Property Service Provider',
      benefit: 'Reach homeowners and property managers who need your services, from maintenance to renovations.',
      href: '/advertise/service-providers',
      order: 5,
    },
  ],

  valueProposition: [
    {
      id: 'high-intent',
      iconName: 'Target',
      headline: 'High-Intent Audience',
      description: 'Reach users actively searching for properties with clear purchase or rental intent, not casual browsers.',
      order: 1,
    },
    {
      id: 'ai-visibility',
      iconName: 'Sparkles',
      headline: 'AI-Driven Visibility',
      description: 'Our recommendation engine ensures your properties appear to the right buyers at the right time.',
      order: 2,
    },
    {
      id: 'verified-leads',
      iconName: 'ShieldCheck',
      headline: 'Verified Leads',
      description: 'Every inquiry is validated for authenticity, so you spend time on real opportunities, not spam.',
      order: 3,
    },
    {
      id: 'dashboard-control',
      iconName: 'LayoutDashboard',
      headline: 'Dashboard Control',
      description: 'Manage all your listings, track performance, and respond to leads from one powerful dashboard.',
      order: 4,
    },
  ],

  howItWorks: [
    {
      id: 'step-1',
      stepNumber: 1,
      iconName: 'UserPlus',
      title: 'Create Your Profile',
      description: 'Sign up and complete your partner profile with your business details and branding.',
    },
    {
      id: 'step-2',
      stepNumber: 2,
      iconName: 'Upload',
      title: 'Add Your Listings',
      description: 'Upload properties, developments, or services with rich media and detailed information.',
    },
    {
      id: 'step-3',
      stepNumber: 3,
      iconName: 'TrendingUp',
      title: 'Get Qualified Leads',
      description: 'Receive verified inquiries directly to your dashboard and start closing deals.',
    },
  ],

  features: [
    {
      id: 'listing-promotion',
      iconName: 'Megaphone',
      title: 'Listing Promotion',
      description: 'Showcase your properties with premium placement and enhanced visibility across the platform.',
      order: 1,
    },
    {
      id: 'explore-feed',
      iconName: 'Video',
      title: 'Explore Feed Ads',
      description: 'Reach buyers through short-form video content in our TikTok-style property discovery feed.',
      order: 2,
    },
    {
      id: 'boost-campaigns',
      iconName: 'Rocket',
      title: 'Boost Campaigns',
      description: 'Amplify specific listings with targeted boost campaigns for maximum exposure.',
      order: 3,
    },
    {
      id: 'lead-engine',
      iconName: 'Users',
      title: 'Lead Engine',
      description: 'Capture and manage leads with our intelligent lead scoring and routing system.',
      order: 4,
    },
    {
      id: 'team-collaboration',
      iconName: 'UsersRound',
      title: 'Team Collaboration',
      description: 'Invite team members, assign leads, and collaborate seamlessly within your organization.',
      order: 5,
    },
    {
      id: 'media-templates',
      iconName: 'Image',
      title: 'Media Templates',
      description: 'Create professional property marketing materials with our built-in design templates.',
      order: 6,
    },
  ],

  socialProof: {
    logos: [
      {
        id: 'logo-1',
        name: 'Developer Partner 1',
        imageUrl: '/images/partners/developer-1.png',
        alt: 'Developer Partner 1 Logo',
        order: 1,
      },
      {
        id: 'logo-2',
        name: 'Agency Partner 1',
        imageUrl: '/images/partners/agency-1.png',
        alt: 'Agency Partner 1 Logo',
        order: 2,
      },
      {
        id: 'logo-3',
        name: 'Bank Partner 1',
        imageUrl: '/images/partners/bank-1.png',
        alt: 'Bank Partner 1 Logo',
        order: 3,
      },
    ],
    metrics: [
      {
        id: 'metric-1',
        value: '50,000+',
        label: 'Verified Leads Generated',
        iconName: 'CheckCircle',
        order: 1,
      },
      {
        id: 'metric-2',
        value: '10,000+',
        label: 'Properties Promoted',
        iconName: 'Home',
        order: 2,
      },
      {
        id: 'metric-3',
        value: '4.8/5',
        label: 'Partner Satisfaction',
        iconName: 'Star',
        order: 3,
      },
      {
        id: 'metric-4',
        value: '500+',
        label: 'Active Partners',
        iconName: 'Users',
        order: 4,
      },
    ],
  },

  pricingPreview: [
    {
      id: 'agent-plans',
      category: 'Agent Plans',
      description: 'From R499/month - Perfect for individual agents and small teams',
      href: '/pricing/agents',
      order: 1,
    },
    {
      id: 'developer-plans',
      category: 'Developer Plans',
      description: 'From R2,999/month - Showcase developments with advanced features',
      href: '/pricing/developers',
      order: 2,
    },
    {
      id: 'bank-plans',
      category: 'Bank / Loan Provider Plans',
      description: 'Custom enterprise pricing - Connect with qualified home buyers',
      href: '/pricing/banks',
      order: 3,
    },
    {
      id: 'service-plans',
      category: 'Service Provider Plans',
      description: 'From R799/month - Reach homeowners and property managers',
      href: '/pricing/services',
      order: 4,
    },
  ],

  finalCTA: {
    headline: 'Ready to Reach More Buyers?',
    subtext: 'Join hundreds of property professionals already growing their business on our platform.',
    primaryCTA: {
      label: 'Start Advertising Now',
      href: '/register',
      variant: 'primary',
    },
    secondaryCTA: {
      label: 'Schedule a Demo',
      href: '/contact',
      variant: 'secondary',
    },
  },

  faqs: [
    {
      id: 'faq-1',
      question: 'How much does it cost to advertise on the platform?',
      answer: 'Pricing varies by partner type and plan tier. Agents can start from R499/month, developers from R2,999/month, and banks/service providers have custom enterprise plans. All plans include core features like listing promotion and lead management, with premium tiers offering advanced analytics and priority placement.',
      order: 1,
    },
    {
      id: 'faq-2',
      question: 'What types of advertising opportunities are available?',
      answer: 'We offer multiple advertising formats including traditional property listings, Explore feed video ads, boost campaigns for increased visibility, featured placements on location pages, and sponsored content in our discovery engine. Each format is designed to reach high-intent property seekers at different stages of their journey.',
      order: 2,
    },
    {
      id: 'faq-3',
      question: 'How do I get started with advertising?',
      answer: 'Getting started is simple: Create your partner profile, add your listings or content, and start receiving leads. Our onboarding team will guide you through the setup process, help optimize your profile, and provide training on our dashboard tools. Most partners are fully set up within 24-48 hours.',
      order: 3,
    },
    {
      id: 'faq-4',
      question: 'What makes your platform different from other property portals?',
      answer: 'We combine AI-driven visibility with verified lead quality. Our recommendation engine ensures your properties reach the right audience, while our verification process filters out low-quality inquiries. Plus, our Explore feed offers unique short-form video advertising that traditional portals don\'t provide.',
      order: 4,
    },
    {
      id: 'faq-5',
      question: 'How are leads verified and delivered?',
      answer: 'All leads go through our verification process which checks contact information, filters spam, and assesses intent signals. Verified leads are delivered instantly to your dashboard with full contact details, property interest, and affordability indicators. You can also set up email and SMS notifications for immediate follow-up.',
      order: 5,
    },
    {
      id: 'faq-6',
      question: 'Can I manage multiple properties or developments?',
      answer: 'Yes! Our platform is built for scale. Agents can manage unlimited listings, developers can showcase multiple developments with unit-level detail, and agencies can collaborate with team members. All plans include bulk upload tools, media management, and centralized lead tracking.',
      order: 6,
    },
    {
      id: 'faq-7',
      question: 'What kind of analytics and reporting do you provide?',
      answer: 'Our dashboard provides comprehensive analytics including views, engagement rates, lead conversion metrics, and ROI tracking. Premium plans include advanced insights like audience demographics, competitor benchmarking, and predictive analytics to optimize your advertising strategy.',
      order: 7,
    },
    {
      id: 'faq-8',
      question: 'Is there a contract or can I cancel anytime?',
      answer: 'We offer flexible month-to-month plans with no long-term contracts. You can upgrade, downgrade, or cancel anytime. For annual commitments, we provide significant discounts (up to 20% off). Enterprise partners can discuss custom terms with our sales team.',
      order: 8,
    },
  ],
};
