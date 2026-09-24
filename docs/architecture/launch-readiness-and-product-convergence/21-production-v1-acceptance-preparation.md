# B18 Production V1 acceptance preparation

Status: exact-artifact checklist prepared; no production acceptance has run.
The B08 disposition in the [central launch register](03-launch-register.md#b08-protected-database-disposition--2026-09-24)
keeps Railway on TiDB while Azure cutover is deferred by the founder spend
gate. This checklist does not authorize deployment, database change or paid
product activation.

## Freeze the candidate

Record the B16-approved frontend and backend 40-character SHAs, tree, migration
head/model digest, target fingerprint, release ID, three product keys and
approval reference. Reject an acceptance run if `/version.json`,
`/api/version`, Database Authority status or the actual deployment details
disagree. Record the effective API/email/lead service commands and replicas,
not merely repository configuration files.

## Controlled acceptance order

1. **Provider and runtime:** HTTPS domain and certificate, cookie/origin
   behavior, readiness 200, exact SHA, Redis fail-closed and restart recovery,
   private/public object separation, and B10/B13 worker supervision.
2. **Access boundary:** ordinary visitor sees the approved offer, while paid
   routes remain disabled until the final B16 activation. After activation,
   only Agent R499, Agency R999 and Developer R1,499 once-off 90-day manual-EFT
   products are enabled. No automatic renewal, card checkout or deferred
   property classes are implied.
3. **Agent loop:** account/profile gate, invoice, controlled proof, verified
   finance activation, listing/media authoring, review, public discovery,
   correctly attributed enquiry, CRM follow-up, expiry and renewal. Check that
   proof submission alone grants no access.
4. **Agency loop:** approved owner, invoice/activation, real invitation email,
   member acceptance, inherited agency entitlement without a second personal
   payment, authorized inventory/publication, agency-owned enquiry, assignment
   and follow-up, expiry preservation.
5. **Developer loop:** approved organisation owner, invoice/activation,
   organisation-owned development/unit/media authoring, review/publication,
   public discovery, correctly attributed enquiry and follow-up. A brand or
   login alone does not grant paid publication.
6. **Failure controls:** unmatched/partial/duplicate payment, rejected proof,
   unavailable private object, B10 unknown email outcome, B13 platform custody,
   wrong role/tenant, expired entitlement and customer-support handover all
   remain visible and recoverable without direct SQL.
7. **Operations:** B14 primary/backup rehearsal, B15 approved legal pages and
   invoice disclosures, B17 monitoring/recovery signals, and a sanitized
   evidence packet with no customer secret or proof content.

Use consented test accounts, controlled payment records and disposable media;
do not charge or seed a real customer for this proof. Clean controlled data
through governed application or verification paths. An observed failure is a
finding with an owner and severity, never silently normalized into a pass.

Acceptance is withheld until every P0/P1 is resolved or explicitly accepted
under launch authority, and the exact protected target/runtime tuple is the
one actually deployed. The Railway Pro/static outbound IP spend gate is a
separate founder decision; B18 preparation does not close it.
