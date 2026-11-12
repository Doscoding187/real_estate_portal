# Why Property Listify (homepage section 7)

Component: `client/src/sections/home/WhyPropertyListifySection.tsx` (test: `WhyPropertyListifySection.test.tsx`)
Replaces the earlier "One connected property journey" section (`HomeJourneySection`, removed).

## 1. Why this section exists

A visitor, an agent, an agency or a developer should understand what Property Listify does for them from the page alone. The old section talked about "discovery, decision-making and the people around a property move" and told nobody what they could do.

## 2. Who it speaks to

Five audiences, chosen with a real tablist (segmented pills; horizontal scroll on phones; arrow, Home and End keys):

| Tab                | One-line value                                                      | Primary link                                                                  |
| ------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Buying or renting  | Search homes for sale and to rent, then contact the agent directly. | `/property-for-sale` (secondary `/property-to-rent`)                          |
| Selling or letting | Owners do not list on their own yet; an agent lists the property.   | `/agents`                                                                     |
| Agents             | Public profile, listings and enquiries in one place; set up today.  | `/advertise/sell/agents`                                                      |
| Agencies           | One home for agency, team and listings. Accounts not open yet.      | `/advertise/sell/agencies` (secondary `/contact?area=agency_operations`)      |
| Developers         | Present developments and receive enquiries. Accounts not open yet.  | `/advertise/sell/developers` (secondary `/contact?area=developer_operations`) |

Each panel: one headline, one summary sentence, a "What you can do today" line, three benefit tiles with icons, one primary link. Desktop: text on the left, tiles on the right. Phone: stacked.

## 3. Rules

- **True today only.** Buyers and agents can sign up; agency and developer accounts and paid publishing are not open; owners cannot list themselves (`/listings/create` needs an agent or agency role). Every "today" line must match that. When an account type opens, update the panel and this file in the same PR.
- No numbers, testimonials, logos, prices or claims we cannot prove.
- Plain South African English. No "canonical", "activation" or "preparation" on screen (tests check this).
- Links are real `<a href>`. Tab buttons are 44px high.
- One h2 in the section.

## 4. Owner feedback, 2026-11-12

"I do not see what they do." The journey section did not explain the value. Nothing sold the platform to agents, agencies or developers, and sellers were not addressed. This section, the "List with us" band and the closing call to action were rebuilt together.

## 5. History

- Earlier: three-step "Discover, Decide, Connect" cards.
- 2026-11-12: replaced by the audience switch above.
