# Real Estate Portal - Complete Documentation

**Author:** Manus AI  
**Date:** October 23, 2025  
**Version:** 1.0

---

## Executive Summary

The **Real Estate Portal** is a comprehensive, full-stack web application designed to facilitate property discovery, search, and management. Inspired by leading platforms such as SquareYards and 99acres, this portal provides users with an intuitive interface to browse property listings, apply advanced search filters, view detailed property information, and manage their favorite properties. The system incorporates modern web technologies including React, TypeScript, tRPC, and MySQL to deliver a robust and scalable solution.

This document provides a complete overview of the project architecture, features, setup instructions, API documentation, and usage guidelines. The portal is designed for both property seekers and property owners, offering seamless authentication, responsive design, and real-time data synchronization.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Frontend Components](#frontend-components)
8. [Setup Instructions](#setup-instructions)
9. [Usage Guide](#usage-guide)
10. [Future Enhancements](#future-enhancements)

---

## Project Overview

The Real Estate Portal serves as a centralized platform where users can discover properties across multiple cities in India. The application supports two primary listing types: properties for sale and properties for rent. Users can filter properties based on various criteria including location, property type, price range, number of bedrooms, and area size.

### Key Objectives

The primary objectives of this project are to provide a user-friendly interface for property search, enable authenticated users to save their favorite listings for future reference, and offer detailed property information including images, amenities, and location details. The platform emphasizes performance, security, and scalability to accommodate growing user bases and expanding property inventories.

### Target Audience

The portal targets three main user groups: property seekers looking to buy or rent residential or commercial properties, property owners and agents who wish to list their properties, and real estate investors seeking market insights and investment opportunities.

---

## Features

### Core Features

The Real Estate Portal includes several core features designed to enhance user experience and streamline property discovery. The **Property Search** functionality allows users to search for properties using multiple filters including city, property type (apartment, house, villa, plot, commercial), listing type (sale or rent), price range, number of bedrooms, and area size. The search interface is designed to be intuitive and responsive across all devices.

The **Property Listings** feature displays comprehensive property information in card format, showing key details such as property title, location, price, bedrooms, bathrooms, area, and property type. Each listing card includes a primary image and a favorite button for quick access. Featured properties are highlighted with special badges to draw user attention.

**Property Detail Pages** provide in-depth information about individual properties, including full descriptions, image galleries, amenity lists, property specifications, view counts, and listing dates. Users can access contact information, share properties via social media, and save properties to their favorites from the detail page.

### User Authentication

The portal implements **Manus OAuth** for secure user authentication. Users can log in using their existing accounts, and the system maintains session state across page navigations. Authenticated users gain access to additional features such as saving favorite properties and managing their personal property lists.

### Favorites Management

Authenticated users can save properties to their favorites list for easy access later. The favorites feature includes the ability to add properties to favorites from both listing cards and detail pages, view all saved properties in a dedicated favorites page, and remove properties from favorites with a single click. The system uses optimistic updates to provide instant feedback when managing favorites.

### Responsive Design

The entire application is built with mobile-first principles, ensuring optimal viewing and interaction experiences across devices ranging from smartphones to desktop computers. The layout adapts seamlessly to different screen sizes, and touch-friendly interfaces are implemented for mobile users.

---

## Technology Stack

### Frontend Technologies

The frontend is built using **React 19** with **TypeScript** for type safety and improved developer experience. **Wouter** is used for client-side routing, providing a lightweight alternative to React Router. **Tailwind CSS 4** powers the styling system, offering utility-first CSS with custom design tokens. The component library leverages **shadcn/ui** for pre-built, accessible UI components. **tRPC** enables end-to-end type-safe API calls between the frontend and backend.

### Backend Technologies

The backend utilizes **Express 4** as the web server framework, handling HTTP requests and serving the application. **tRPC 11** provides the API layer with full TypeScript type safety from server to client. **Drizzle ORM** manages database interactions with type-safe queries and migrations. **MySQL/TiDB** serves as the relational database for storing users, properties, images, and favorites.

### Development Tools

The development environment includes **Vite** for fast development builds and hot module replacement, **TypeScript** for static type checking across the entire codebase, **pnpm** as the package manager for efficient dependency management, and **ESLint** for code quality and consistency enforcement.

---

## System Architecture

### Application Structure

The Real Estate Portal follows a monorepo structure with clear separation between client and server code. The project is organized into several key directories that maintain distinct responsibilities.

The **client** directory contains all frontend code including React components, pages, hooks, contexts, and styling. The **server** directory houses backend logic including tRPC routers, database query helpers, and core infrastructure code. The **drizzle** directory manages database schemas and migration files. The **shared** directory contains constants and types used by both frontend and backend.

### Data Flow

The application implements a unidirectional data flow pattern. User interactions in the frontend trigger tRPC queries or mutations, which are sent to the backend API. The backend processes these requests using database query helpers, retrieves or modifies data in the MySQL database, and returns typed responses to the frontend. The frontend then updates the UI based on the received data, utilizing React's state management and tRPC's caching mechanisms.

### Authentication Flow

User authentication follows the OAuth 2.0 protocol through Manus OAuth. When users initiate login, they are redirected to the Manus OAuth portal where they authenticate using their credentials. Upon successful authentication, the OAuth callback endpoint receives the user information and creates or updates the user record in the database. A session cookie is set with JWT token, and subsequent requests include this cookie for authentication. The backend validates the session on each protected route and injects user information into the tRPC context.

---

## Database Schema

### Tables Overview

The database consists of four primary tables that manage users, properties, property images, and user favorites. Each table is designed with appropriate relationships and constraints to maintain data integrity.

| Table Name | Purpose | Key Relationships |
|------------|---------|-------------------|
| users | Stores user account information | Referenced by properties and favorites |
| properties | Contains all property listings | References users, referenced by propertyImages and favorites |
| propertyImages | Stores multiple images per property | References properties |
| favorites | Manages user's saved properties | References users and properties |

### Users Table

The users table maintains authentication and profile information for all registered users. Key fields include a unique identifier (id), Manus OAuth identifier (openId), user's display name, email address, login method, role (user or admin), account creation timestamp, last update timestamp, and last sign-in timestamp.

### Properties Table

The properties table is the core of the application, storing comprehensive information about each property listing. This table includes fields for property identification, descriptive information (title, description), property classification (propertyType, listingType), pricing information, physical specifications (bedrooms, bathrooms, area), location details (address, city, state, zipCode, latitude, longitude), amenities stored as JSON array, construction year, availability status, featured flag for highlighting, view counter, owner reference, and timestamp fields for creation and updates.

### PropertyImages Table

Each property can have multiple associated images stored in the propertyImages table. This table includes an image identifier, reference to the parent property, image URL path, primary image flag to identify the main display image, display order for image gallery sorting, and creation timestamp.

### Favorites Table

The favorites table creates a many-to-many relationship between users and properties, allowing users to save multiple properties and properties to be favorited by multiple users. Fields include a unique identifier, user reference, property reference, and timestamp of when the favorite was added.

---

## API Documentation

### tRPC Routers

The application exposes several tRPC routers that provide type-safe API endpoints for various functionalities.

#### Properties Router

The properties router handles all property-related operations.

**search** - Searches for properties based on multiple filter criteria. Accepts parameters including city (string), state (string), propertyType (enum), listingType (enum), price range (minPrice, maxPrice), bedroom range (minBedrooms, maxBedrooms), area range (minArea, maxArea), status (enum), pagination (limit, offset). Returns an array of property objects matching the search criteria.

**featured** - Retrieves featured properties for homepage display. Accepts a limit parameter (default 6) and returns an array of featured property objects with status "available".

**getById** - Fetches detailed information for a specific property. Accepts a property ID parameter, increments the view counter automatically, and returns an object containing property details and associated images array.

**getImages** - Retrieves all images for a specific property. Accepts a property ID parameter and returns an array of image objects ordered by display order.

#### Favorites Router

The favorites router manages user's saved properties and requires authentication.

**list** - Retrieves all properties saved by the authenticated user. Requires user authentication and returns an array of favorite objects including property details.

**add** - Adds a property to user's favorites. Accepts a property ID parameter, requires authentication, and returns a success confirmation.

**remove** - Removes a property from user's favorites. Accepts a property ID parameter, requires authentication, and returns a success confirmation.

**check** - Checks if a property is in user's favorites. Accepts a property ID parameter, requires authentication, and returns a boolean indicating favorite status.

#### Auth Router

The auth router handles authentication operations.

**me** - Returns the currently authenticated user's information or null if not authenticated. This is a public procedure accessible without authentication.

**logout** - Logs out the current user by clearing the session cookie. Returns a success confirmation.

---

## Frontend Components

### Page Components

The application consists of four primary page components that handle different user flows.

**Home Page** serves as the landing page featuring a hero section with prominent search bar, featured properties showcase, informational sections highlighting platform benefits, and call-to-action sections encouraging user engagement. The page is designed to immediately capture user attention and guide them toward property search.

**Properties Page** displays searchable and filterable property listings with an advanced search bar at the top, grid layout of property cards, pagination controls for navigating large result sets, and empty state messaging when no properties match the search criteria.

**Property Detail Page** provides comprehensive information about individual properties including a large image gallery, detailed property specifications, amenity listings, location information, pricing and contact options, and related action buttons for favoriting and sharing.

**Favorites Page** shows authenticated users their saved properties in a dedicated view with a grid layout similar to the properties page, quick access to remove favorites, and empty state prompting users to browse properties when no favorites exist.

### Reusable Components

Several reusable components are used throughout the application to maintain consistency and reduce code duplication.

**Navbar** provides site-wide navigation with logo and branding, navigation links to main pages, authentication status display, user account dropdown menu for authenticated users, and mobile-responsive hamburger menu for smaller screens.

**SearchBar** offers flexible search functionality with two modes: compact mode for secondary pages and full mode for the homepage. It includes input fields for city/location search, dropdown filters for property type and listing type, price range selectors, bedroom count filters, and a prominent search button.

**PropertyCard** displays property information in a consistent card format showing property image with hover effects, featured badge for highlighted properties, favorite button with heart icon, property title and location, key specifications (bedrooms, bathrooms, area), price display with formatted currency, and property type badge.

---

## Setup Instructions

### Prerequisites

Before setting up the Real Estate Portal, ensure you have the following software installed on your system: Node.js version 18 or higher, pnpm package manager, and access to a MySQL or TiDB database instance.

### Installation Steps

To set up the project locally, begin by cloning the repository or extracting the project files to your desired directory. Navigate to the project root directory in your terminal.

Install all project dependencies by running the command `pnpm install`. This will install both frontend and backend dependencies as specified in the package.json file.

Configure environment variables by ensuring all required variables are set. The key variables include DATABASE_URL for the MySQL connection string, JWT_SECRET for session cookie signing, VITE_APP_ID for Manus OAuth application ID, and various OAuth-related URLs. These are typically pre-configured in the Manus platform environment.

Initialize the database schema by running `pnpm db:push`. This command generates and applies database migrations based on the schema defined in drizzle/schema.ts.

Populate the database with sample data by executing `DATABASE_URL="$DATABASE_URL" npx tsx seed-data.ts`. This script inserts 12 sample properties with images into the database.

Start the development server using `pnpm dev`. The application will be available at the configured port (typically 3000), and you can access it through your web browser.

### Verification

After completing the setup, verify that the application is running correctly by accessing the homepage and confirming that featured properties are displayed. Test the search functionality by applying various filters, navigate to individual property detail pages to ensure images and information load correctly, and if authenticated, test the favorites functionality by adding and removing properties.

---

## Usage Guide

### For Property Seekers

Property seekers can begin their journey on the homepage where they can use the search bar to filter properties by location, type, and price. The search results page displays all matching properties in an easy-to-browse grid format.

Clicking on any property card navigates to the detailed property page where users can view comprehensive information including multiple images, full descriptions, amenity lists, and property specifications. Users can save interesting properties to their favorites by clicking the heart icon, which requires logging in if not already authenticated.

The favorites page provides quick access to all saved properties, allowing users to compare options and make informed decisions. Users can remove properties from favorites at any time.

### For Developers

Developers working on this project should familiarize themselves with the tRPC workflow for adding new features. To add a new API endpoint, define the procedure in server/routers.ts with appropriate input validation using Zod schemas. Create corresponding database query helpers in server/db.ts to handle data operations. The frontend can then consume the new endpoint using tRPC hooks such as useQuery or useMutation.

When modifying the database schema, update the table definitions in drizzle/schema.ts and run `pnpm db:push` to apply changes. Always test schema changes thoroughly before deploying to production.

For UI development, leverage the existing shadcn/ui components and Tailwind utility classes to maintain design consistency. Follow the established patterns in existing components for state management and data fetching.

---

## Future Enhancements

### Planned Features

Several enhancements are planned for future releases to expand the portal's capabilities and improve user experience.

**Advanced Search** will introduce map-based property search allowing users to visually explore properties in specific areas, saved search preferences that users can revisit, and price trend analytics showing market insights over time.

**Property Management** features will enable property owners to list their own properties through a self-service interface, upload and manage multiple property images, and track property views and inquiries.

**Communication Features** will facilitate direct messaging between buyers and sellers, scheduled property viewing appointments, and email notifications for new listings matching saved searches.

**Enhanced User Profiles** will allow users to maintain detailed profiles with preferences, view their property browsing history, and receive personalized property recommendations based on their activity.

**Mobile Application** development is planned to provide native iOS and Android apps with push notifications, offline property viewing, and optimized mobile performance.

### Technical Improvements

Technical enhancements on the roadmap include implementing server-side rendering for improved SEO and initial load performance, adding comprehensive unit and integration testing, setting up continuous integration and deployment pipelines, implementing advanced caching strategies for frequently accessed data, and adding monitoring and analytics to track application performance and user behavior.

---

## Conclusion

The Real Estate Portal represents a complete, production-ready solution for property discovery and management. Built with modern technologies and best practices, the platform provides a solid foundation for scaling to accommodate thousands of properties and users. The modular architecture, type-safe APIs, and comprehensive documentation ensure that the system can be easily maintained and extended by development teams.

This documentation serves as a complete reference for understanding, deploying, and enhancing the Real Estate Portal. For additional support or questions, please refer to the inline code comments and the project's README file.

---

**Document Version:** 1.0  
**Last Updated:** October 23, 2025  
**Maintained by:** Manus AI

