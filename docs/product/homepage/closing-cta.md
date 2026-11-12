# Closing call to action (homepage section 9)

Component: `client/src/sections/home/CTASection.tsx` (test: `CTASection.test.tsx`)
Used by `HomeDesktopView.tsx` and `HomeMobileView.tsx`; the page passes the "browse" action.

## 1. Why this section exists

The last thing on the page. A visitor who has scrolled to the end should have two clear next steps: start looking, or put their own property on the site.

## 2. What it shows

Blue panel with the label "Start your search", heading "Ready to find your next home?", one line ("Explore homes for sale, compare the details that matter, and contact the people responsible for the property.") and two buttons:

| Button                | Goes to                                | Kind      |
| --------------------- | -------------------------------------- | --------- |
| Browse homes for sale | the page's browse action (home search) | button    |
| List with us          | `/advertise`                           | real link |

**Owner decision, 2026-11-12:** "List with us" lives here and not in the hero. It was added to the hero earlier that day (`dc71cd08c`) and moved at the owner's request because it looked awkward there. _Proposal:_ the hero then keeps one clear job, search.

## 3. States

One state. The buttons sit side by side from the small breakpoint and stack full width on phones.

## 4. Rules

- Exactly two actions, the primary one being Browse. Do not add a third without the owner.
- "List with us" is a real link, not only a button, so crawlers and people can follow it.
- Text on the blue panel is white (contrast fix, 2026-11-12).
- No data claims: nothing here depends on the database.

## 5. Search engines

"List with us" is an `<a href="/advertise">`. "Browse homes for sale" is a button.

## 6. Current implementation status (2026-11-12)

Built, with a test for both actions.

## 7. History

- **2026-03 and 2026-04:** spacing and mobile alignment fixes (`052669c1a`, `c0370d4e6`, `93f5325bb`, `d001ceb09`).
- **2026-06-25 (`b1168399f`):** "restore optimized homepage".
- **2026-08-17 (`54a3129f8`):** buy journey convergence touched the section.
- **2026-11-12 (`72430ca1e`):** contrast fixes.
- **2026-11-12 (`f80d25153`):** "List with us" added next to Browse, moved here from the hero at the owner's request.
