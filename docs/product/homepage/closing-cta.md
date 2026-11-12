# Closing call to action (homepage section 9)

Component: `client/src/sections/home/CTASection.tsx` (test: `CTASection.test.tsx`)
Used by `HomeDesktopView.tsx` and `HomeMobileView.tsx`; the page may pass an in-app "browse" action (optional).

## 1. Why this section exists

The last thing on the page. A visitor who has scrolled to the end should have a clear next step whichever side they are on: looking for a home, or having a property to list.

## 2. What it shows

One h2 "Ready when you are." above a split panel with two equal doors. Side by side from the medium breakpoint, stacked on phones.

| Door                     | Text                                                                                            | Primary                                       | Secondary                            |
| ------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| Looking for a home?      | Search homes for sale and to rent, then contact the agent directly.                             | Browse homes for sale -> `/property-for-sale` | Homes to rent -> `/property-to-rent` |
| Have a property to list? | Agents, agencies and developers can see how to list. Owners can find an agent to list for them. | List with us -> `/advertise`                  | Find an agent -> `/agents`           |

## 3. Rules

- Two doors, equal weight. Do not add a third without the owner.
- Every destination is a real `<a href>`. Browse may call the page's `onBrowse` on a plain click.
- Left door is light with dark text, right door is dark with white text; both meet AA contrast. Buttons are at least 44px high.
- No data claims; nothing depends on the database. Statements must be true today (owners cannot list themselves yet).

## 4. Owner feedback, 2026-11-12

The old closing panel spoke only to buyers ("Ready to find your next home?") and ignored people who want to list. Rebuilt with two doors.

## 5. History

- Earlier: one blue panel, "Start your search", two buttons (Browse, List with us).
- Owner decision, 2026-11-12: "List with us" lives here and not in the hero (moved from `dc71cd08c`).
- 2026-11-12: split into two doors.
