# PricingPreviewSection

`PricingPreviewSection` is the public commercial product preview used by
`/advertise`.

It does not contain product prices, plan benefits, promotions or checkout
choices. It reads the typed `useCommercialCatalog` boundary, which calls the
read-only `billing.commercialCatalog` procedure.

The component handles:

- loading without rendering a previous price;
- safe error and empty-catalog states;
- canonical minor-unit currency formatting;
- server-provided benefits and entitlement limits;
- manual-EFT, request-invoice, contact-sales, trial and unavailable actions;
- current tax metadata when the authority provides it.

Marketing narrative may be supplied through the `title` and `subtitle` props,
but it must not override commercial facts returned by the catalog.

```tsx
import { PricingPreviewSection } from '@/components/advertise/PricingPreviewSection';

<PricingPreviewSection />
```

The component intentionally does not implement checkout, promotions, payment
providers, sponsored search or campaign placement. Those actions remain owned
by their approved commercial workflows.
