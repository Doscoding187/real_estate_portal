# Place package, Search Area step and rehearsal

**One-page decision draft · 2026-10-31.** No data or code was applied. Keep the Place and Search Area artifacts separate, with separate digests.

## Freeze the Places package once

Use the existing governed Places adapter and existing Place IDs. Freeze only reviewed source-evidence decisions, preferred names/types, factual parent/child relationships, canonical URL projection, source references and attribution. Remove the 103 Google Maps URL aliases across the nine packages (17 in Gauteng); retain OSM evidence and show “© OpenStreetMap contributors” where OSM-derived data appears.

The 62-row sheet is review material: none is currently publication-eligible in the committed projection, and approval/map/date fields are blank. It does not change eligibility. Do not add Place IDs, unreviewed names/edges, Google Maps data, buyer-market memberships, listing roll-ups, Land activation, or new eligibility changes. Migration 0115’s 2,556-row correction and 48 reviewed type corrections belong to the older rehearsal lineage; do not repeat or reinterpret them here. Pin the exact source/package versions and digest.

## Load Search Areas after Places

The existing Places adapter does not load `search_area` or `search_area_member`. After the frozen Places load, a separate reviewed operation must read the founder-edited eight-area sheet, resolve exact existing Place IDs, and plan/apply/verify membership in those existing tables. Give the member file its own version and digest. Read back the expected set and stop on any missing, extra, duplicate or non-admitted ID. No loader was built in this docs review; this step is outside RC #716.

Keep route anchors distinct from members. Sandton’s guide uses Place `pl-place-01-dee61758ef3bda7cd1a258ad` at `/gauteng/city-of-johannesburg/sandton`; its own listings display as “Sandton Central.” Centurion uses `pl-place-01-1a30ae4d635ef747d6c987df`; after the approved name change, keep Lyttelton as an alias and add a permanent 308 redirect to `/gauteng/centurion`. Search Area membership does not combine member listings or counts.

## Rehearsal count

Run **one complete disposable end-to-end rehearsal** with the final Place package followed by the separate Search Area seed and exact read-back. If the earlier Place-only rehearsal passed, this is one additional run. The checked runbook calls its planned restore the fourth rehearsal but omits Search Areas, and I could not verify an earlier successful run; historic count remains unknown. Leave production and TiDB untouched.
