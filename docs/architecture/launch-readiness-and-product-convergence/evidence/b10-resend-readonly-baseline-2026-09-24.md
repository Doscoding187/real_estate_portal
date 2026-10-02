# B10 Resend read-only provider baseline — 2026-09-24

Status: partial provider evidence at 15:22 UTC. No email was sent; no Resend,
Railway or DNS configuration was changed. No credential value or sender local
part was printed or retained in this packet.

The existing Railway Production API service defines `RESEND_API_KEY` and
`EMAIL_FROM`. The configured sender domain is `propertylistifysa.co.za`.
The credential was read only in process for the documented
[`GET /domains`](https://resend.com/docs/api-reference/domains/list-domains)
request. Resend returned HTTP **403**. This means the configured key cannot
provide domain-list evidence through that endpoint; it does not establish
whether sending works or whether the domain is verified. Do not replace or
broaden the production key solely to make this read pass.

Public DNS queries for the configured sender domain returned:

| Record | Observed result |
| --- | --- |
| `resend._domainkey` TXT | One record with DKIM public-key shape |
| Default `send` return-path TXT | One SPF record including Amazon SES |
| Default `send` return-path MX | One MX record pointing to Amazon SES |
| `_dmarc` TXT | No DMARC record observed |
| Root MX | Two records observed |

These are consistent with Resend's [documented SPF/MX return path and DKIM
record examples](https://resend.com/changelog/new-domain-webhooks), but DNS
presence is weaker than Resend account verification and a real delivered
message. The absent DMARC record is a deliverability follow-up; it is not by
itself evidence that the paid transactional flow cannot launch.

B10 still needs provider-side verified sending status, approved public sender
and monitored reply/support mailbox, consented receipt/reply/bounce exercise,
and the supervised hosted worker on the accepted B16 artifact. Edward is the
founder-approved initial reconciliation/support operator; no backup operator
is appointed. Keep B10 at `ENGINEERING EVIDENCE PASS — EXTERNAL PROVIDER PROOF
PENDING` until those checks pass.
