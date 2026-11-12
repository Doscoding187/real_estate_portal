# For property professionals (homepage section 8)

Component: `client/src/sections/home/ProfessionalEntrySection.tsx` (test: `ProfessionalEntrySection.test.tsx`)
Switch: `COMMERCIAL_ACTIVATION_STATE.enabled` in `shared/commercialActivation`. While it is off (today), the section shows the "preparation" wording.

## 1. Why this section exists

The homepage serves visitors looking for a home. This section is where the people who supply the homes (agents, agencies, developers) find their way in, so the site can grow its listings.

## 2. What it shows

Heading "List and grow with Property Listify." and the line "Agents can set up now. Agencies and developers can see what is coming. Publishing opens soon." Then **three cards**, each a real link:

| Card       | What you get                                                              | What is true today                                                   | Link                         |
| ---------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------- |
| Agents     | A public profile, your listings and your property enquiries in one place. | Set up your profile and prepare listings now. Publishing opens soon. | `/advertise/sell/agents`     |
| Agencies   | One home for your agency, your team and your listings.                    | Agency accounts open soon. See how it will work and get in touch.    | `/advertise/sell/agencies`   |
| Developers | A place to present your developments and receive enquiries.               | Developer accounts open soon. See how it will work and get in touch. | `/advertise/sell/developers` |

Agents can set up today. Agency and developer accounts are **not open yet**: their cards link to pages that say so and give a contact route.

**Owner decision, 2026-11-12:** one "List with us" entry; each role lands on a page that says what that role can do today; **no role is hidden**.

## 3. States

One state per switch position. With activation off: the preparation wording above. With activation on: heading "Grow your property business with Property Listify.", "Choose your role to see what is included and how to get started.", and card text "See what is included and how to get started." with "See agent / agency / developer options". The cards stack on phones and sit in three columns from the medium breakpoint.

## 4. Rules

- **Never promise what is not open.** The "today" line on each card must match what the target page lets that role do. Change the text and the page together.
- **No role hidden** (owner, 2026-11-12), even when it cannot sign up yet; the page it lands on explains this and offers a contact route.
- Every card is a real link (`<a href>`).
- Plain language: no "preparation", "commercial activation" or "private inventory" on screen.
- _Proposal:_ service businesses (the fourth card in the original design) return as a card only when that path exists.

## 5. Search engines

Each card is a plain link to its role page, so crawlers can follow all three.

## 6. Current implementation status (2026-11-12)

| Rule                                                       | Status                          |
| ---------------------------------------------------------- | ------------------------------- |
| Three cards with plain-language wording and contact routes | Built (`72430ca1e`, 2026-11-12) |
| Wording switches with the commercial activation setting    | Built                           |
| Agency and developer sign-up                               | Not open                        |
| Service businesses card                                    | Not shown                       |

## 7. History

- **2026-08-23 (`114169a1f`):** agent acquisition and offer work that the first version built on.
- **2026-08-27 (`ac687b28d`):** the section was introduced with **four cards: Agents, Agencies, Developers, Service businesses** (service businesses linked to `/advertise/services`), plus an "Explore all professional solutions" link.
- **2026-09-15 (`234ca6e4f`):** public entry aligned with the preparation state.
- **2026-11-10, PR #757 (`7d43a4156`, soft-launch trim):** cut to **Agents only** (one card, and the "all solutions" link removed), because the other roles were not open. This hid roles from visitors; the 2026-11-12 owner decision (section 2) is that no role is hidden.
- **2026-11-12 (`72430ca1e`):** three cards (Agents, Agencies, Developers), plain wording, contact route on the agency and developer pages. Service businesses stay out.
