# DLE Manual Flow Checklist

Use this checklist before calling the Development Listing Engine stable.

| Flow | Required Result | Status | Evidence |
|---|---|---|---|
| Create development | Development can be created without data loss | Pending | |
| Manual Save Draft | Draft saves through real backend path | Pending | |
| Draft appears in My Drafts | Saved draft is visible | Pending | |
| Resume draft | Canonical state restores correctly | Pending | |
| Edit location | Only location fields change | Pending | |
| Edit media | Only media fields change | Pending | |
| Edit governance/finance | Only governance/finance fields change | Pending | |
| Edit sale unit types | Sale inventory/pricing updates safely | Pending | |
| Edit rental unit types | Rental inventory/pricing updates safely | Pending | |
| Edit auction unit types | Auction inventory/pricing updates safely | Pending | |
| Publish development | Publish validation passes correctly | Pending | |
| Public page | Correct sale/rent/auction display | Pending | |
| Search cards | Correct sale/rent/auction pricing and ordering | Pending | |
| Lead capture | Lead context matches transaction type and unit interest | Pending | |
| Edit published development | No unrelated field wipes | Pending | |

## Evidence Standard

Each completed row should include one of:

- Browser/manual evidence with route and timestamp.
- Focused automated test name.
- Screenshot path.
- API/database verification output.

Tests are useful, but the final stability call needs browser-level proof for create, save draft, resume, publish, and public display.
