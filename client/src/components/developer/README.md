# Developer Dashboard (UI Skeleton)

This folder contains the modular UI for the Property Developer Dashboard. It follows the product spec in `components/developer_dashboard_spec.txt` and is wired into the page `src/pages/PropertyDeveloperDashboard.tsx`.

Sections:

- Dashboard: `Overview.tsx` (stats, charts placeholders, recent listings)
- Developments: `DevelopmentsList.tsx`
- Units: `UnitsManager.tsx`
- Leads: `LeadsManager.tsx`
- Team: `TeamManagement.tsx`
- Documents & Media: `DocumentsMedia.tsx`
- Marketing: `MarketingCampaigns.tsx`
- Integrations: `IntegrationsPanel.tsx`
- Billing: `BillingPanel.tsx`
- Support: `SupportCenter.tsx`

Navigation:

- Sidebar component: `DeveloperSidebar.tsx` using the shared `ui/sidebar` primitives.

Data wiring (next steps):

- Replace placeholders with TRPC queries/mutations.
- Hook Developments/Units/Leads tables to backend endpoints.
- Add file upload and permissions to Documents & Media.
- Connect Campaigns to your marketing service and billing provider.

Notes:

- Keep components presentation-focused; move data fetching to the page or a dedicated hook per section.
- Use existing UI primitives under `components/ui` for consistency.
