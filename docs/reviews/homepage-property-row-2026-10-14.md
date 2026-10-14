# Homepage property row and save prompt

The Buy/Rent homepage row presents ordinary properties and development unit types through the same resale card. The original hero design and its two guidance cues are preserved.

## Row behaviour

- A full ten-card row normally contains six ordinary properties and up to four development unit types. Where ordinary stock is thin, eligible unit types can fill additional slots. The existing rotation across developments remains.
- Ordinary properties must have approved photo media before candidate pagination. Development units must have a photo in their own gallery and positive available stock, and their project must not be sold out. A general project cover cannot substitute for a unit photo. Render/floorplan-only unit media cannot qualify.
- Existing public publication, approval, publisher, transaction and geography authority remain in force. This is a homepage filter; other discovery surfaces retain their existing media/stock rules.
- Placeholder/missing photo cards are rejected on both server and client. A photo load error removes that card from the homepage rather than displaying a fallback image.
- Units use `SimpleHomeListingCard`, with the same frame, image ratio, price typography and compact facts as ordinary listings. Badges say For sale or To rent. Unit prices retain a truthful From prefix, and their links still open the development unit detail.
- Unit size maps into the shared size fact. Houses and townhouses show yard size when supplied, then parking when that fact is available. Apartments retain the existing size/bed/bath/parking order. Unknown facts are not invented.
- Unit parking is read from the canonical `unit_types.parking_bays` and `parking_type` fields. A mapping bug which matched townhouse as house was corrected. Missing numeric measurements remain unknown rather than becoming zero.

## Save interaction

An unauthenticated click on an ordinary property's heart opens a dialog instead of navigating. It clearly says the property has not been saved, explains the account shortlist benefit, and offers Sign in, Create an account and Keep browsing. Authentication uses the canonical `mode` and safe `next` URL contract so the visitor can return to the homepage. The property is not claimed to be saved automatically after authentication.

Escape, the close control and Keep browsing dismiss the prompt. Focus returns to the initiating heart. Existing authenticated ordinary-property save mutations are preserved.

The canonical favourites table currently references numeric ordinary-property IDs. Development unit types have their own identities, so this pass retains their detail links and does not offer a nonfunctional save button. Unit-type account saving remains a separate capability/data-contract decision; it must not revive retired prospect favourites or fabricate property records.

## Validation and practical limits

- 61 focused tests pass across feed composition, derived unit eligibility/mapping, public homepage query contracts, photo eligibility, card presentation, save behaviour and existing hero journeys. Database-dependent services are mocked; `SKIP_DB_INIT=1` prevents test database setup.
- The database-authority static gate passes, including 763 static tests, deterministic canonical inventory and lifecycle checks. Schema/migration authority is unchanged.
- TypeScript and the frontend build pass. Targeted ESLint reports zero errors with existing server warnings; formatting and diff checks pass. Vite retains its existing large-chunk warning.
- Live Chromium checks at 390px and 1440px verify missing-photo cards are omitted, a heart click does not redirect, the dialog has zero axe violations, and Escape restores focus.
- Browser-only response fixtures at 390px, 768px and 1440px confirm identical resale/unit card width and height, parking fallback and preserved unit detail links. These fixtures were not written to the database.
- The review frontend at `http://localhost:3010/` still uses the other thread's running backend through the read-only preview proxy. Client photo exclusion and the prompt are visible there. New server candidate selection and six/four mixing require integrating this branch into that backend; it was not restarted or modified.
- The task worktree's database is not provisioned. Authority status reports an exact disposable-worktree target and safe central configuration, with database readiness unavailable. No database was created, migrated, seeded or mutated, and no protected/remote target was accessed.

Local captures: `/tmp/listify-home-ux/save-prompt-390.png`, `save-prompt-1440.png` and `standardized-cards-ui-fixture.png` (the last is explicitly a UI fixture).

Branch: `feat/homepage-ux-review-20261013`.
