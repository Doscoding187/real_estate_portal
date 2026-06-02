# DLE Field Ownership Contract

Every DLE slice must preserve field ownership.

Updating one wizard slice must not wipe unrelated slices.

## Ownership Rules

| Slice | Owns | Must Preserve |
|---|---|---|
| Location | Address, city, suburb, province, coordinates, place/location identity | Media, governance/finance, unit inventory |
| Media | Hero image, photos, videos, floor plans, brochures/documents | Location, governance/finance, unit inventory |
| Governance/Finance | Levies, rates, transfer-cost assumptions, estate/governance specs | Location, media, unit inventory |
| Unit Types | Unit catalogue, stock, sale/rent/auction pricing, unit media/specs | Location, media, governance/finance |
| Marketing Summary | Description, highlights, buyer-facing copy | Location, media, governance/finance, unit inventory |
| Review/Publish | Readiness, acknowledgements, publish intent | Canonical source data from all earlier slices |

## Required Guardrail

For every create, update, publish, draft, resume, or edit-hydration change, confirm whether the change preserves unrelated slices.

If a slice intentionally clears data, the payload must make that intent explicit. Omitted fields should preserve existing data where the current contract already expects preservation.

## User Trust Principle

Data loss in a development listing engine breaks trust. Uploading media should not wipe pricing. Editing levies should not wipe unit types. Updating unit inventory should not wipe the location or public copy.
