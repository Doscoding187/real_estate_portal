# Prospect Buyability Foundation

## Purpose and MVP boundary

The first buyability capability is a self-service, indicative planning tool. It helps a buyer or tenant judge a price/rental range and decide what to do next. It does not assess creditworthiness, query a bureau, collect documents, select a lender, or make a credit decision. Existing agent/distribution affordability assessments and referral document workflows remain separate, higher-consent workflows.

## Minimum useful scenario

| Area | MVP decision |
| --- | --- |
| Inputs | Intent (buy/rent), province/target areas, purchase/rental timeline, first-time-buyer flag, employment type, gross monthly household income, recurring monthly debt, available deposit, and preferred monthly repayment/rental budget. Monthly expenses are optional and rounded. |
| Do not collect | ID number, credit score, credit report, bank statements, payslips, account/card details, employer name, exact co-applicant identity, dependants, medical/health data, or lender credentials. |
| Calculation | Versioned public assumptions: interest rate, term (default 20 years), affordability percentage/cap, transfer/purchase-cost schedule and rental buffer. Calculate usable monthly budget from declared income, debt and the lower of the configured cap or self-selected payment budget; amortise to an indicative loan; add deposit and subtract an estimated purchase-cost reserve to produce a cautious price range. Rent output is a separate monthly range, never a bond result. |
| Outputs | Indicative property-price/rental range; estimated monthly repayment; indicative deposit and transfer/purchase-cost guidance; deposit-readiness indicator; checklist of omitted inputs; assumption version/date; matching public properties/developments; next actions to save, enquire, request a viewing or request bond assistance. |
| Storage | A scenario is user-controlled and versioned under the canonical prospect identity. Store the minimum input fields and derived output/assumption version, not free-form financial evidence. Default retention: 90 days after last update; warn before expiry; delete raw inputs on user deletion request and retain only anonymised aggregates/audit evidence where lawful. |
| Updates | Recalculate on input change, a material assumption/version change, or user refresh. Historical scenario displays show their calculation date/version; do not silently rewrite a shared summary. |
| Permissions | Prospect can view, edit, delete and choose which scenario is active. Agents see nothing by default. With explicit per-recipient consent they see only scenario date, broad range/readiness band, target area and the prospect-approved contact preference—not income, debt, deposit or calculation detail. |
| Referral | “Request bond assistance” makes a separate consented request naming the recipient/category, data summary, purpose and expiry. Referral attribution references the same prospect/action event; it does not clone the person into a new identity. |

## Required wording

Every result and referral entry point states: “This is an indicative estimate based on information you provide and stated assumptions. It is not a credit decision, lending decision, guaranteed finance offer, or bond approval. A lender or authorised financial provider makes its own assessment.” The UI must not use “qualify”, “qualification”, “approval”, or a coloured score as a proxy for a lending outcome. Replace existing “likely qualify” presentation in the future prospect flow with “estimated range” and a clear limitation.

## Calculation transparency

Assumptions belong in versioned configuration, with source/effective date and an audit trail. Display the interest rate, term, affordability cap, deposit and cost treatment in plain language and provide a “change assumptions” affordance. Where a purchase cost cannot be estimated reliably, say so and show it as an estimate/placeholder rather than producing false precision. Matching uses the lower end of the cautious range by default and labels any price-over-range result.

## Relationship to existing implementation

`BondCalculator` and `PropertyQualificationDrawer` are useful UI/calculation evidence but currently browser-local. `DevelopmentQualificationPage` submits exact affordability inputs in `leads.affordabilityData`; that is not an acceptable storage model for this MVP. `affordability_assessments`, `referral_assessments` and `affordability_config` show reusable computation/configuration concepts but are currently agent/distribution-led and contain consent/document paths outside this scope. The Prospect MVP must use a dedicated, prospect-owned scenario model and share a derived summary only by consent.
