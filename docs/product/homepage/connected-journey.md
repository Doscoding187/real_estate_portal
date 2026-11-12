# Connected property journey (homepage section 7)

Component: `client/src/sections/home/HomeJourneySection.tsx` (test: `HomeJourneySection.test.tsx`)
Server: none. The section is fixed text.

## 1. Why this section exists

Explain, in one glance, how the site helps a visitor move from looking to acting: discover homes and areas, decide with more context, then connect with a person. It also sets up the professionals section directly below it (section 8). It makes no data claim, so it never needs an empty state.

## 2. What it shows

Small label "One connected property journey", heading "Make every property move with more context.", one intro line, and three numbered cards:

| Step | Card     | Text (as of 2026-11-12)                                                      |
| ---- | -------- | ---------------------------------------------------------------------------- |
| 01   | Discover | Search homes for sale and to rent, and local areas, from one starting point. |
| 02   | Decide   | Use property details and location context to build a clearer shortlist.      |
| 03   | Connect  | Find an agent when you need support.                                         |

## 3. States

One state only: static text. Three cards in a row from the small breakpoint upward, stacked on phones.

## 4. Rules

- **Say only what the site does today.** Each card must be true for a visitor right now. That is why Connect says "an agent" and not "agents, developers and service businesses" (changed 2026-11-10), and why Discover says "for sale and to rent" and does not mention developments or other journeys.
- When another journey opens (for example shared living or commercial), update the card text in the same pull request that opens it.
- Plain language, no internal terms. Numbers 01 to 03 use a dark enough grey to be readable (contrast fix, 2026-11-12).

## 5. Search engines

Plain headings and text; there are no links. Rendered in the browser only today, like the rest of the homepage.

## 6. Current implementation status (2026-11-12)

Built, and its test checks the wording. Nothing planned beyond keeping the text true.

## 7. History

- **2026-08-27 (`ac687b28d`):** added ("bridge consumer and professional journeys"), together with the professionals section.
- **2026-09-03 and 2026-10-13/14 (`f146699ad`, `b353d86f2`, `5df2c89bf`):** spacing, clarity and design-preservation fixes.
- **2026-11-10, PR #757 (`7d43a4156`):** soft-launch trim. Discover changed from "homes, developments and local areas" to "homes for sale and to rent, and local areas"; Connect changed from "agents, developers and service businesses" to "an agent", because only those were available.
- **2026-11-12 (`72430ca1e`):** step numbers darkened for contrast.
