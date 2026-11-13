# List with Property Listify (homepage section 8)

Component: `client/src/sections/home/ListWithUsSection.tsx` (test: `ListWithUsSection.test.tsx`)
Replaces `ProfessionalEntrySection` (removed). The `COMMERCIAL_ACTIVATION_STATE` switch is no longer read here: the copy is written for today and must be edited by hand when accounts open.

## 1. Why this section exists

The homepage serves people looking for a home. This dark band is where the people who supply homes (agents, agencies, developers) and owners find their way in, so the site can grow its listings.

## 2. What it shows

Heading "List with Property Listify", one line ("Put your properties, your profile and your developments where buyers and renters search."), and a single "See all options" link to `/advertise`. Then four role cards (Agents, Agencies, Developers, Service businesses; a button on each; four across from 1024px, two by two below, stacked on phones), and a fifth, visually distinct strip for owners. Agents can act today, so their button is primary and carries a "Set up today" chip; the other three have a quieter outlined button and an "Opening soon" chip.

| Card                 | What you get                                                                                            | What is true today                                                                 | Button                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Agents               | A public profile, your listings and your enquiries in one place.                                        | Create your account and set up your profile now. Publishing opens soon.            | Set up your agent profile -> `/advertise/sell/agents` |
| Agencies             | One home for your agency, your team and your listings.                                                  | Agency accounts are not open yet. See how it will work and get in touch.           | See agency details -> `/advertise/sell/agencies`      |
| Developers           | A place to present your developments and receive enquiries.                                             | Developer accounts are not open yet. See how it will work and get in touch.        | See developer details -> `/advertise/sell/developers` |
| Service businesses   | A service profile in the property services directory, with requests from people who need you.           | Service provider accounts are not open yet. See how it will work and get in touch. | See service details -> `/advertise/services`          |
| Owners (light strip) | "Selling or letting your own property?" Owners do not list on their own yet. An agent lists it for you. | n/a                                                                                | Find an agent -> `/agents`                            |

## 3. Rules

- **Never promise what is not open.** Each "today" line must match what the target page lets that role do. Change text and page together.
- No role hidden, even when it cannot sign up yet; its page explains and gives a contact route.
- Owners: private owner listing does not exist (`/listings/create` is for agent and agency roles). If it is built, change the owner card.
- Real links only; 44px buttons; white text on dark with AA contrast; no "preparation" or "activation" on screen.
- One h2.

## 4. Owner feedback, 2026-11-13

Include service providers (home and property service businesses); spacing and design lift: dark band with soft glow, clearer card borders, primary/secondary button weight, owners strip kept as a deliberate amber band.

## Owner feedback, 2026-11-12

"There is no section about listing with us" and "what if they want to list their property with us?" Added the owner card and the "List with Property Listify" heading, and made every role card carry a clear button.

## 5. History

- Earlier: "For property professionals" with "List and grow with Property Listify." and whole-card links; switched on `COMMERCIAL_ACTIVATION_STATE`.
- Owner decision, 2026-11-12: one "List with us" entry; no role hidden.
- 2026-11-12: rebuilt as above.
