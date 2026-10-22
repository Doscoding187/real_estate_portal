# Local visual journeys

Run a populated Property Listify on your own computer to inspect the customer and operator screens. The app uses its real authentication, invoice, acceptance, payment-review, listing and enquiry paths against the worktree's isolated database. It sends email to a private local inbox and displays fictitious banking instructions.

## Open the running demo

- Product: <http://localhost:3009>
- Journey start page, demo sign-in details, screenshots and captured email: <http://localhost:5180>
- Backend: <http://localhost:5000>

The start page's **Show local demo passwords** panel reads only the existing machine-local demo and reviewer credentials. Use a separate browser profile or private window for the finance operator. These credentials and captured messages must stay local.

| Account | Starting point |
| --- | --- |
| `local-agent@listify.local` | Fresh independent agent, no invoice or paid term seeded. Finish setup, request an invoice, then select **I’ve paid**. |
| `payment-agent@listify.local` | Invoice and payment notice under review after the local rehearsal; access remains locked. |
| `journey-agent@listify.local` | Independent agent used for the recorded walkthrough. Its actual local progress is retained. |
| `referrer@listify.local` | Local Distribution partner identity. Open `/distribution/partner/overview` to review empty and paused states; no programs, referrals, or buyer details are seeded. |
| `home-preview-agent@listify.local` | Agency-associated agent with published sample homes and fixture access. |
| `home-preview-agency@listify.local` | Sample agency and inventory. |
| `home-preview-developer@listify.local` | Sample developer organisation, development and unit. |
| `ple-reviewer@listify.local` | Finance/operator. Open `/admin/subscriptions`, then **Payment Verification**. |

Inspect the public homepage and `/property/996101`. Create a property from the Agent dashboard. Public enquiries use the real local routing and appear in the representative's workspace. Registration emails and billing messages appear in the local inbox; local verification links are clickable there.

For a payment rehearsal, use the invoice's exact reference and its amount in **cents** (`49900` for Agent Launch Access). Record a reconciliation note explicitly saying **LOCAL DEMO synthetic bank match — no real money received**. A notice alone does not activate access. The same verification, full-settlement, duplicate and fixed 90-day rules apply. Do not transfer real money to the displayed fictitious account.

## Prepare another clean task worktree

Use a task-owned feature branch/worktree. Read the Database Authority entry and inspect `pnpm db:authority:status` before any database operation. The preview commands reject shared, remote, production and unowned targets; they require the exact worktree database on `127.0.0.1:3307`.

```bash
pnpm db:authority:service:start
pnpm db:authority:service:wait
pnpm db:worktree:create
pnpm db:migrate:plan
```

Apply the reviewed migration plan using its actual accepted old head and expected new head. Never substitute a production URL or assume a fresh database when one already exists. Then prepare the existing canonical data adapters and the narrow journey fixture:

```bash
pnpm db:schema:congruency
pnpm db:reference:prepare
pnpm db:foundation:prepare
pnpm db:places:prepare -- --territory=za-gp
pnpm db:scenario:prepare
pnpm db:homepage-preview:prepare
pnpm db:ple-reviewer:prepare
pnpm db:local-journey:prepare
pnpm db:homepage-preview:verify
pnpm db:local-journey:verify
pnpm local:journeys
```

`pnpm local:journeys` starts the loopback frontend, backend and local inbox. Stop it with Ctrl+C; the database, local uploads and inbox remain available on restart. Do not run worktree disposal against a demo you want to keep. Occupied ports cause startup failure; do not kill an unrelated application's server.

Preparing the journey fixture again verifies its identity and synthetic copy, preserving invoices, notices, access terms and authoring progress. It does not reset accounts or approve payments. The populated homepage fixture includes clearly labelled sample subscriptions; these are presentation data, not evidence of a bank payment.

The dedicated legal fixture is labelled **LOCAL DEMONSTRATION ONLY** and has synthetic approval metadata. It displays the prepared no-attachment Terms and existing Privacy copy to exercise the real acceptance controls. It does not approve that prepared Terms version, install a public release or alter the historical founder approval records.

Captured messages and screenshots stay in the ignored `.private/local-journey/` directory (directory mode `0700`, mail file `0600`). The inbox checks its Host and browser request context and provides no cross-origin API. The runtime does not use hosted provider credentials; local media use the existing local storage adapter.

## Recorded verification, 13 October 2026

- Fresh canonical database established through migration `0114_user_legal_acceptances.sql`; schema congruent and application readiness ready.
- Homepage fixture prepared and verified: sale/rental properties, agency/agent/developer workspaces and development/unit.
- Signed-in independent agent requested its own invoice, accepted the displayed purchase, and submitted a notice with no attachment. The operator queue showed the correct invoice/reference, claimed date, payer and pending state.
- Browser finance review rejected a wrong bank reference. A matching synthetic local review fully settled the invoice and activated exactly one 90-day term. Canonical readback retained the operator, invoice, amount, timestamp, reconciliation note and approval event.
- Repeated fixture preparation retained the exercised invoice/term and left the fresh agent without an invoice or term. A third account then requested its own invoice and submitted a no-file notice through the real UI; it remains under review.
- Local captured email distinguished invoice issued, pending notice and access activation. Public detail loaded local listing images. A sample public enquiry was saved and displayed in the approved representative’s lead pipeline.
- Source checks: 763 Database Authority cases, 16 billing/runtime cases and 21 client cases passed; application typecheck passed; changed-source lint had zero errors (existing warnings remain).

These are local demo results. Production installation, hosted customer acceptance, provider delivery and the remaining hosted verification have not been completed by this work. The next visual review is the agent's property creation → moderation → publication → enquiry workflow using this retained demo.
