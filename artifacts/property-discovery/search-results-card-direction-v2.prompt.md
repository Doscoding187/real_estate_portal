# Search results card direction v2 prompt

Mode: built-in image generation, targeted edit.

Use case: `precise-object-edit`

Input images:

1. `search-results-card-direction-v1.png` was the edit target.
2. A public Zillow property-card pattern screenshot was used only as a semantic
   icon reference. Its layout, branding, marks, photos and typography were not
   to be copied.

The edit preserved the complete Property Listify page layout, branding, header,
filter rail, card dimensions, photos, palette, typography hierarchy, pricing,
titles, locations, verified identity footer, Save, Compare and `View property`.

Targeted changes:

- Internal area uses a thin-stroke home/building icon with a floor-plan or
  measurement cue.
- Erf/yard size uses a distinct thin-stroke parcel-boundary/plot icon.
- A compact highlights row appears immediately below the four core facts and
  above verified identity.
- Example highlights are `Study / office`, `Swimming pool`, `Solar backup`,
  `Private balcony`, `Natural light`, `Fibre ready`, `Garden` and
  `Pet friendly`.
- Bedrooms and bathrooms remain core facts and are not repeated as highlights.
- `View property` remains the only card-level progression action; no contact,
  WhatsApp or enquiry button is added.

Constraints included targeted edit only, no unrelated text or panels, no Zillow
or MLS marks, no watermark, accessible contrast and highlights remaining
secondary to price, title, location and core facts.
