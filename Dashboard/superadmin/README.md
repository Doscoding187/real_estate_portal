# Property Developers Dashboard

A comprehensive dashboard for property developers to manage developments, leads, analytics, and marketing efforts.

## Features

### 1. Dashboard Overview

- KPI cards showing total developments, leads, units sold, marketing spend, engagement, and conversion rates
- Interactive charts for traffic, lead growth, and conversion rates
- Recent activity feed

### 2. Developments Management

- Create, read, update, and delete property developments
- Media upload functionality
- Development preview modals
- Feature/unfeature developments

### 3. Leads & Inquiries

- Lead inbox with filtering capabilities
- Lead detail view with communication history
- Lead status management
- Tagging system
- CRM integration

### 4. Analytics & Reports

- Interactive charts for traffic, conversions, and ad performance
- Filtering by date range and development
- Download report functionality (PDF export)
- Data visualization using Recharts library

### 5. Marketing Tools

- Featured listings management
- Ad campaign creation
- Social media boosting tools

## API Endpoints

### Analytics

- `GET /api/analytics/developments`
- `GET /api/analytics/traffic`
- `GET /api/analytics/conversions`

### Developments

- `GET /api/developments`
- `POST /api/developments`
- `PUT /api/developments/:id`
- `DELETE /api/developments/:id`

### Leads

- `GET /api/leads`
- `PUT /api/leads/:id/status`
- `POST /api/leads/:id/tags`
- `POST /api/leads/export`

## Technology Stack

- React with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- React Router for navigation
- Lucide React for icons

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```
