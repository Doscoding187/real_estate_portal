# Founder answers ledger — 17 October 2026

Transcribed founder answers to the [packet 47 briefs](../47-founder-decision-briefs-2026-10-17.md),
recorded in packet 49. Numbering follows the packet 47 answer sheet. These are
founder decisions; execution and evidence for each gate remain separate.

## D1 — support channel

> "currently not available will be back together with railway"

Interpretation recorded: the designated channels remain
`support@propertylistifysa.co.za` (support/privacy) and
`info@propertylistifysa.co.za` (general); mailbox availability is deferred until
the hosted runtime resumes. Inbound/reply demonstration folds into the D2
window. LRC-SUPPORT-001 stays `in progress`.

## D2 — B10 email accounts

> "this will depend we currently have i think support, info and other mails
> available saved in this codebase for test you can use enetechsa@gmail.com"

Recorded: consented test recipient `enetechsa@gmail.com`. Sender default
proposed `Property Listify <mail@propertylistifysa.co.za>` (matching the hosted
runtime configuration precedent); to be confirmed at window scheduling.
Supervised window runs when hosting resumes, attended.

## D3 — provider contracts

> a: "i dont see any kind of dpa on the settings and railway is only for the
> backend does it store any of our customers data" → executed DPA provided:
> `/home/edwardspc/Downloads/Railway_Corporation_Data_Processing_Addendum.pdf`
>
> b: "i have azure account not sure if this is what you asking for" → billing
> readback screenshot reviewed
>
> c: Resend DPA provided:
> `/home/edwardspc/Downloads/resend-dpa-signed.pdf`
>
> d: "vercel is still on hobby we will only switch to pro after launch"

Recorded: Railway DPA executed 2026-10-17; Azure individual upgraded account
under billing name Lehlohonolo Banda (Microsoft Customer Agreement; Microsoft's
Data Protection Addendum applies); Resend DPA retrieved (binds on acceptance);
Vercel Hobby retained for the controlled release, upgrade revisited before
paid/commercial opening. Document identifiers and hashes:
[provider-documents.md](provider-documents.md).

Answer to the founder question "does Railway store customer data": Railway does
not host the customer database (Azure MySQL) or media (AWS S3), but it stores
runtime/HTTP/deploy/build logs for 90 days in US West — HTTP logs include
client IP addresses and cannot be disabled or deleted early — so personal data
is processed by Railway and the executed DPA covers it.

## D4 — B17 F7 package

> "yes to defaults"

Recorded: provisional forecast floor accepted; recovery objectives accepted;
restore budget minimal (verified quote readback before any provisioning; excess
remains `FOUNDER SPEND GATE`); backup destination = separate same-region Cape
Town bucket.

## D5 — hosted admission package

> "withdraw the gate" · "edward is the only operator for now"

Recorded: the September static-egress gate is withdrawn — no static outbound IP
requirement, no Railway Pro upgrade. Single operator: Edward (release/data,
database, reviewer; alert recipient on the same person). Window runs when
hosting resumes, supervised by Edward.

## D6 — af-south-1 provisioning

> "approved"

Recorded: domestic private proof bucket plus separate same-region backup bucket
are authorized under the existing aggregate usage approval (packet-29 pattern);
eu-north-1 bucket and canary retained unchanged. Execution is an attended
CloudShell run; names proposed at the run.

## D7 — finance facts

> "The 28 February / 29 February Year-End" · "none"

Recorded: financial year-end is the last day of February (28 February, or 29
February in leap years — matching the leap-day clamp already covered by
`financeRetentionPolicy.test.ts`). No residual foreign tax-record flow after the
domestic move; EFR001 is not needed. The retention selector derives per-record
return state (filed/outstanding/not required) from each record's actual state.
