# Shared Living — Regulatory Boundary Memo

**Status:** Phase R — boundary definition for MVP scope
**Programme:** Shared Living Foundations
**Related:** `docs/product/shared-living-spec.md`
**Caveat:** This memo defines Product Listify's *product posture* from public regulatory sources. It is not legal advice; the flagged items require review by qualified South African counsel before any transactional feature ships.

---

## 1. Posture

Shared Living MVP operates as a **verified property-advertising and structured-enquiry platform**:

- Lister publishes a place/space through moderation.
- Consumer discovers, enquires, and converses on-platform.
- Any tenancy is formed **off-platform, directly between the parties**.

Property Listify is not, in MVP: a screening service, a lease generator, a deposit holder, or a rent collector.

## 2. Rental Housing Act (RHA) scope awareness

Government guidance describes the RHA's "residential dwelling" as broad enough to include rooms, outbuildings, garages, hostel rooms and similar structures used for residential rental. Therefore:

- Informal or backyard accommodation on Shared Living is **not outside** rental-housing considerations merely for being informal.
- Because the platform does not form tenancies, hold money, or adjudicate disputes in MVP, the platform's direct RHA obligations are limited; landlords/tenants carry their own statutory duties.
- The moment any of these change — tenant screening products, lease tooling, deposit/rent handling — a fresh compliance gate is required **before build**, because each progressively changes the platform's operating-model exposure.

## 3. PPRA / Property Practitioners

The PPRA's licensing guidance expressly includes property-advertising platforms within potential "property practitioner" scope. Consequences adopted now:

1. **Practitioner attribution is enforced in code**: a practitioner-authored listing always renders practitioner + agency identification; owner-impression advertising by practitioners is structurally impossible (attribution derives from authority records).
2. Platform-scope questions (registration/licensing duties of the marketplace itself) are logged for counsel review before any monetisation of practitioner listings ships.
3. Private listers are never asked to complete estate-agency vocabulary (mandate type etc.) — dynamic authoring keeps them in consumer language.

## 4. NSFAS / student accreditation

NSFAS accreditation involves provider accreditation/inspection processes and valid signed leases for funded students. Product rule:

- "NSFAS Accredited" can only render from an evidence-backed verification record (`sl_verifications`, rung `student_accreditation`).
- No authoring checkbox anywhere may claim it.
- Phase 2: evidence workflow definition (document upload + reviewer) with institutional verification partners before launch of that badge.

## 5. Privacy & safety (POPIA-aligned posture)

- Canonical addresses are private by default; public exposure is approximate-location per the type matrix (spec §6). Exact coordinates for occupied-home room types are never published.
- Contact-detail shielding: counterpart contact information unlocks only after mutual on-platform engagement.
- Consent capture on enquiry (versioned), honeypot + rate limiting on public forms.
- Copy actively encourages keeping communication on-platform during early stages (safety precedent: Flatmates/SpareRoom).
- Media moderation includes privacy review (no identifying documents/exterior overexposure for occupied-home room types).

## 6. Explicit MVP prohibitions

| Prohibited | Reason |
|---|---|
| Deposit collection/handling | Escrow-like duty; separate product + compliance workstream |
| Lease generation/e-signature | Legal document production; separate workstream |
| Rent collection/payments | Money custody; separate workstream |
| Tenant screening/vetting products | Fairness/legal review required |
| Checkbox-based accreditation claims | Truth invariant |
| Owner-impression practitioner ads | PPRA attribution rule |

## 7. Review triggers

Counsel review is mandatory before: (a) any payment/deposit/lease feature; (b) screening tools; (c) operator monetisation contracts at scale; (d) expansion beyond advertising+enquiry posture in any form.
