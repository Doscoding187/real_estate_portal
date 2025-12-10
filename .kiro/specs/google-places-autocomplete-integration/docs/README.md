# Google Places Autocomplete Integration - Documentation

## Overview

Welcome to the documentation for the Google Places Autocomplete Integration in Property Listify. This documentation provides comprehensive guides for setup, development, and troubleshooting.

## Quick Navigation

### 🚀 Getting Started

**New to the integration?** Start here:

1. **[Google Places API Setup](./GOOGLE_PLACES_API_SETUP.md)**
   - Set up Google Cloud project
   - Configure API keys
   - Enable required APIs
   - Configure environment variables

2. **[Developer Guide](./DEVELOPER_GUIDE.md)**
   - Quick start examples
   - Component usage
   - Integration patterns

### 📚 Reference Documentation

**Need detailed information?** Check these:

3. **[API Documentation](./API_DOCUMENTATION.md)**
   - Service method reference
   - REST API endpoints
   - Request/response formats
   - Error handling

4. **[Database Schema](./DATABASE_SCHEMA.md)**
   - Table definitions
   - Relationships
   - Indexes
   - Query examples

5. **[Location Page Architecture](./LOCATION_PAGE_ARCHITECTURE.md)**
   - System architecture
   - Rendering strategy
   - Component structure
   - Performance optimization

### 🔧 Troubleshooting

**Having issues?** Find solutions here:

6. **[Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)**
   - Common issues and solutions
   - Debugging tools
   - Error message reference

---

## Documentation Files

### 1. Google Places API Setup and Configuration
**File:** [GOOGLE_PLACES_API_SETUP.md](./GOOGLE_PLACES_API_SETUP.md)

**When to use:**
- Setting up the integration for the first time
- Configuring API keys
- Managing billing and quotas
- Troubleshooting API access issues

**Key topics:**
- Google Cloud Console setup
- API key restrictions
- Environment variables
- Cost optimization
- Testing procedures

---

### 2. Developer Guide
**File:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

**When to use:**
- Implementing location autocomplete in your forms
- Integrating with listing/development creation
- Understanding component props and behavior
- Learning best practices

**Key topics:**
- LocationAutocomplete component API
- Usage examples (basic to advanced)
- Form integration
- Map preview
- Manual entry fallback
- Integration patterns

---

### 3. Location Page Architecture
**File:** [LOCATION_PAGE_ARCHITECTURE.md](./LOCATION_PAGE_ARCHITECTURE.md)

**When to use:**
- Understanding the location pages system
- Implementing new location page features
- Optimizing page performance
- Improving SEO

**Key topics:**
- Hybrid SSR/ISR model
- Data flow
- Component structure
- Caching strategy
- SEO optimization
- Performance tuning

---

### 4. API Documentation
**File:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**When to use:**
- Calling location services from your code
- Understanding service methods
- Making REST API requests
- Handling errors

**Key topics:**
- Google Places Service methods
- Location Pages Service methods
- Location Analytics Service methods
- REST API endpoints
- Error codes and handling
- Rate limiting

---

### 5. Database Schema
**File:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

**When to use:**
- Understanding the data model
- Writing database queries
- Creating migrations
- Optimizing database performance

**Key topics:**
- Table definitions
- Relationships and foreign keys
- Indexes
- Migration scripts
- Query examples
- Performance optimization

---

### 6. Troubleshooting Guide
**File:** [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)

**When to use:**
- Debugging issues
- Resolving errors
- Improving performance
- Understanding error messages

**Key topics:**
- Autocomplete issues
- API errors
- Location page issues
- Performance problems
- Database issues
- SEO issues
- Debugging tools

---

## Common Use Cases

### Use Case 1: First-Time Setup

**Goal:** Set up Google Places integration from scratch

**Steps:**
1. Read [Google Places API Setup](./GOOGLE_PLACES_API_SETUP.md)
2. Follow setup checklist
3. Test with [Developer Guide](./DEVELOPER_GUIDE.md) examples
4. Verify with [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)

---

### Use Case 2: Implementing Autocomplete in a Form

**Goal:** Add location autocomplete to a listing creation form

**Steps:**
1. Review [Developer Guide](./DEVELOPER_GUIDE.md) - Quick Start section
2. Copy basic usage example
3. Customize props for your needs
4. Test with different inputs
5. Handle errors using [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)

**Example:**
```typescript
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';

function ListingForm() {
  const [location, setLocation] = useState(null);

  return (
    <LocationAutocomplete
      value={location?.formattedAddress || ''}
      onChange={(locationData) => {
        setLocation(locationData);
        // Auto-populate form fields
        setValue('latitude', locationData.coordinates.lat);
        setValue('longitude', locationData.coordinates.lng);
        setValue('province', locationData.province);
        setValue('city', locationData.city);
        setValue('suburb', locationData.suburb);
      }}
      placeholder="Search for property location"
      required
    />
  );
}
```

---

### Use Case 3: Creating a Location Page

**Goal:** Understand how location pages work

**Steps:**
1. Read [Location Page Architecture](./LOCATION_PAGE_ARCHITECTURE.md)
2. Review [Database Schema](./DATABASE_SCHEMA.md) for data structure
3. Check [API Documentation](./API_DOCUMENTATION.md) for service methods
4. Implement using SSR/ISR patterns

---

### Use Case 4: Debugging API Issues

**Goal:** Fix "API key not valid" error

**Steps:**
1. Go to [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)
2. Find "API Errors" section
3. Follow solutions for "API key not valid"
4. Verify fix with test request
5. Check [Google Places API Setup](./GOOGLE_PLACES_API_SETUP.md) for configuration

---

### Use Case 5: Optimizing Performance

**Goal:** Reduce page load times

**Steps:**
1. Read [Location Page Architecture](./LOCATION_PAGE_ARCHITECTURE.md) - Performance section
2. Check [Database Schema](./DATABASE_SCHEMA.md) for index optimization
3. Review [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) - Performance Issues
4. Implement caching strategies
5. Monitor with debugging tools

---

## Quick Reference

### Environment Variables

```bash
# Required
GOOGLE_PLACES_API_KEY=your_api_key_here

# Optional
GOOGLE_PLACES_COUNTRY_RESTRICTION=ZA
AUTOCOMPLETE_DEBOUNCE_MS=300
AUTOCOMPLETE_CACHE_TTL_SECONDS=300
```

### Key Components

- **LocationAutocomplete** - Main autocomplete component
- **MapPreview** - Map preview on selection
- **LocationSchema** - Structured data for SEO
- **HeroLocation** - Location page hero section

### Key Services

- **googlePlacesService** - Google Places API wrapper
- **locationPagesService** - Location CRUD operations
- **locationAnalyticsService** - Market statistics
- **globalSearchService** - Unified search

### Key Tables

- **locations** - Hierarchical location data
- **location_searches** - Search tracking
- **recent_searches** - User search history
- **listings** - Properties (with location_id)
- **developments** - Projects (with location_id)

---

## Support

### Getting Help

If you can't find what you need in the documentation:

1. **Check the Troubleshooting Guide first**
   - Most common issues are covered there

2. **Search the documentation**
   - Use Ctrl+F to search within files
   - Check the table of contents

3. **Review code examples**
   - All documentation includes working examples
   - Copy and adapt to your needs

4. **Contact the team**
   - Provide error messages
   - Include steps to reproduce
   - Share relevant code snippets

### Reporting Issues

When reporting documentation issues:

- Specify which document
- Describe what's unclear or incorrect
- Suggest improvements
- Include examples if possible

---

## Contributing

### Updating Documentation

When making code changes that affect documentation:

1. Update relevant documentation files
2. Add new examples if needed
3. Update troubleshooting guide with new issues
4. Test all code examples
5. Validate SQL queries
6. Update cross-references

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add table of contents
- Cross-reference related topics
- Keep formatting consistent
- Test all examples

---

## Version History

### Current Version: 1.0.0

**Initial Release:**
- Complete documentation for all features
- 6 comprehensive guides
- 40+ troubleshooting solutions
- 50+ code examples
- 20+ SQL query examples

---

## License

This documentation is part of the Property Listify platform and is subject to the same license terms.

---

## Feedback

We welcome feedback on this documentation:

- What's helpful?
- What's missing?
- What's confusing?
- What examples would you like to see?

Please share your feedback with the development team.
