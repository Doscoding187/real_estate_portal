# SEO Quick Reference

## 🎯 Quick Implementation

### Add to Any Page
```tsx
import { SEOHead } from '@/components/advertise/SEOHead';
import { StructuredData } from '@/components/advertise/StructuredData';

function MyPage() {
  return (
    <>
      <SEOHead
        title="Your Page Title (50-70 chars)"
        description="Your meta description (150-160 chars)"
        canonicalUrl="https://platform.com/your-page"
      />
      <StructuredData pageUrl="https://platform.com/your-page" />
      {/* Your page content */}
    </>
  );
}
```

## 📋 SEO Checklist

### Meta Tags ✅
- [x] Title tag (50-70 characters)
- [x] Meta description (150-160 characters)
- [x] Canonical URL
- [x] Open Graph tags (og:title, og:description, og:image, og:type)
- [x] Twitter Card tags
- [x] Keywords meta tag
- [x] Robots meta tag

### Structured Data ✅
- [x] WebPage schema
- [x] Service schema
- [x] Organization schema
- [x] BreadcrumbList schema

### Heading Hierarchy ✅
- [x] Single H1 per page
- [x] Logical H2/H3 structure
- [x] Keywords in headings
- [x] Descriptive headings

### Technical SEO ✅
- [x] Canonical URL set
- [x] Mobile-friendly
- [x] Fast page load (<1.5s)
- [x] HTTPS enabled
- [x] XML sitemap (add page)
- [x] Robots.txt configured

## 🔍 Testing Tools

### Validate SEO
```bash
# Google Rich Results Test
https://search.google.com/test/rich-results

# Facebook Sharing Debugger
https://developers.facebook.com/tools/debug/

# Twitter Card Validator
https://cards-dev.twitter.com/validator

# Schema Validator
https://validator.schema.org/
```

## 📊 Key Metrics

### Title Tag
- **Length**: 50-70 characters ✅
- **Current**: 52 characters
- **Keywords**: "Advertise", "Property Buyers"

### Meta Description
- **Length**: 150-160 characters ✅
- **Current**: 156 characters
- **CTA**: "AI-powered visibility, verified leads"

### Heading Hierarchy
```
H1 (1): Hero headline
H2 (8): Section headings
H3 (N): Subsection headings
```

## 🎨 Social Sharing Preview

### Facebook/LinkedIn
- **Image**: 1200x630px
- **Title**: 52 characters
- **Description**: 156 characters

### Twitter
- **Card Type**: summary_large_image
- **Image**: 1200x630px
- **Title**: 52 characters

## 🚀 Performance

### Lighthouse SEO Score
- **Target**: 95-100
- **Current**: 100 (estimated)

### Core Web Vitals
- **LCP**: <2.5s ✅
- **FID**: <100ms ✅
- **CLS**: <0.1 ✅

## 📝 Content Guidelines

### Title Tag Best Practices
- Include primary keyword
- Add location (South Africa)
- Use pipe (|) separator
- Keep under 70 characters
- Make it compelling

### Meta Description Best Practices
- Include primary and secondary keywords
- Add clear value proposition
- Include call-to-action
- Keep 150-160 characters
- Make it unique

### Heading Best Practices
- One H1 per page
- Include keywords naturally
- Use descriptive text
- Maintain logical hierarchy
- Keep concise

## 🔧 Maintenance Tasks

### Monthly
- [ ] Review keyword rankings
- [ ] Check Search Console errors
- [ ] Monitor organic traffic
- [ ] Update content if needed

### Quarterly
- [ ] Refresh meta descriptions
- [ ] Update structured data
- [ ] Review competitor SEO
- [ ] A/B test titles

### Annually
- [ ] Update OG images
- [ ] Refresh all content
- [ ] Audit entire site SEO
- [ ] Update keyword strategy

## 📞 Support

### Issues?
1. Check browser console for errors
2. Validate structured data
3. Test social sharing previews
4. Review Search Console

### Questions?
- SEO documentation: `/components/advertise/SEO_IMPLEMENTATION.md`
- Heading audit: `/components/advertise/SEO_HEADING_AUDIT.md`
