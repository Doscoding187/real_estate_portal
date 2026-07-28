# Engine Backlog Authority

| Field | Authority |
| --- | --- |
| Status | **Accepted target authority; no engine backlog files are created in Stage 1** |
| Central launch authority | [Central launch register](03-launch-register.md) owns launch disposition. |
| Future implementation | A living backlog may exist only for a real engine that has received a genuine assigned finding. |

## Relationship between launch correction and engine work

One living backlog may eventually exist for each real engine. It is created only after a real launch finding is assigned to that engine; Stage 1 deliberately creates no empty engine directories, audits, or backlogs.

The central launch register owns the launch disposition: whether a specific finding is fixed now, simplified, hidden, honestly represented, handled manually, or deferred. An engine backlog owns only deferred or comprehensive future-state requirements. It must not become a duplicate product authority, a substitute issue register, or an automatic implementation queue.

Immediate launch correction and future-state engine requirements must be recorded separately. A launch issue may link to an engine backlog entry, but the entry must backlink to the `LRC-...` issue ID and retain the original launch decision.

No engine backlog entry automatically authorises implementation. It requires the same approved bounded slice, owning authority, validation plan, and rollback boundary as any other implementation work.

## Reusable engine-backlog entry template

```text
Engine backlog ID:
Related launch issue ID(s):
Engine / owning authority:
Future-state requirement:
Why it is not required for the current launch decision:
Current launch treatment:
Dependencies and authority documents:
Implementation is authorised?: No — requires a separate approved bounded slice.
Required validation:
Review trigger / expiry condition:
```
