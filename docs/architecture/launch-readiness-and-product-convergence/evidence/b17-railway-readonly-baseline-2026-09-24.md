# B17 Railway read-only recovery baseline — 2026-09-24

Status: read-only provider observation at 15:17 UTC; no Railway configuration,
deployment, variable, backup or volume was changed.

Railway project `successful-tranquility`
(`8cdd7515-ddd2-4252-bbee-df5a5c209d4b`), environment `production`
(`63070d99-357a-40ba-99c3-6d1368f61652`): Railway reported two services,
zero current service issues or recent failures, and no staged work. This is
platform status only, not B17 continuous monitoring or application readiness.

| Surface | Read-only observation | Recovery consequence |
| --- | --- | --- |
| API `real_estate_portal` | Live, last reported deployment `3996ee58-71f7-4976-b6a4-0cc3bc3c7731` successful on 2026-09-13; source branch `main`; one replica; no volume or staged changes | This is the pre-B16 hosted deployment. It does not establish the accepted release tuple, database readiness or exact monitor schedule. |
| Redis | Live, last reported deployment `ff97a541-e5b0-4520-920f-3681d18e3c7d` successful on 2026-09-05; image `redis:8.2.9`; one replica; 500 MB `redis-volume` mounted at `/data`; `--save 60 1`; no staged changes | Local Redis persistence is configured, but no backup schedule, successful snapshot or restore was established by this read. A single replica is not failover proof. |

The [Railway backup documentation](https://docs.railway.com/volumes/backups)
says volume backups can be manual or scheduled daily, weekly or monthly, are
charged for incremental storage, and can only be restored in the same project
and environment. This observation did **not** inspect the Redis volume's
actual Backups tab, schedule, backup history, or a disposable restore. Those
remain B17 evidence requirements. Any incremental backup charge requires a
founder cost decision before activation; it is a `FOUNDER SPEND GATE` if it
cannot fit the existing approved spend.

The Railway API has no volume and continues to use the existing TiDB database.
No Azure cutover, runtime credential change, deployment, Redis interruption,
or recovery action was performed. B17 still requires an independent check
schedule and alert recipient, plus hosted restart/interruption/object-retrieval
proof on the exact B16 candidate.
