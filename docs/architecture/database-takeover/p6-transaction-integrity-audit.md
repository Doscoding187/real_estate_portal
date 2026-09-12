# P6 transaction integrity audit

Agency deals, offer versions, transactions, and commission settlements form
separate lifecycle facts. Offer versions are append-only by `(deal_id,
version_number)`, accepted transactions are one-to-one with a deal, and a
commission settlement is one-to-one with a transaction.

The acceptance path previously checked for an existing transaction before
opening its write transaction. Two concurrent acceptors could both pass that
check and race to insert the unique transaction row. The path now locks the
deal row and rechecks the transaction inside the transaction. The second
acceptor returns the existing transaction ID, while only the first mutates the
offer and creates milestones, conditions, parties, and the settlement.

The existing agency lifecycle suites cover the surrounding tenant and offer
state rules. The authority-run agency deal integration now exercises two
concurrent caller requests and proves one durable transaction with one
idempotent response; the transactional lock and in-lock recheck are therefore
covered by physical evidence. Further commission schema changes still require
their own lifecycle proof.

Fresh authority-run evidence: `pnpm test:authority --
server/__tests__/integration.agency-deal-engine.test.ts
server/__tests__/integration.agency-canvassing-mvp.test.ts` passed four deal
engine tests and skipped the canvassing suite because that suite requires the
protected `listify_local` acceptance profile. Deal evidence includes complete
commission creation, generated-transaction rollback, and independent
concurrent acceptance serialization.
