# Railway Cron: Actor Score Recompute

This project exposes a protected internal endpoint for scheduled actor score persistence:

- `POST /internal/recompute-actor-scores`

It requires `Authorization: Bearer <INTERNAL_CRON_SECRET>` and uses a Redis lock with a 10-minute TTL to prevent concurrent runs.

## Environment Variable

Set this in Railway service variables:

- `INTERNAL_CRON_SECRET=<long-random-secret>`

## Railway Cron Configuration

Create a Railway Cron job with:

- Schedule: `0 3 * * *` (03:00 UTC daily)
- Method: `POST`
- URL: `https://api.propertylistifysa.co.za/internal/recompute-actor-scores`
- Header:
  - `Authorization: Bearer <INTERNAL_CRON_SECRET>`

## Manual Verification

Run:

```bash
curl -X POST "https://api.propertylistifysa.co.za/internal/recompute-actor-scores" \
  -H "Authorization: Bearer <INTERNAL_CRON_SECRET>"
```

Expected response shape:

```json
{
  "success": true,
  "actorsUpdated": 123,
  "durationMs": 4567
}
```

If already running, endpoint returns `409` with:

```json
{
  "success": false,
  "error": "Job is already running"
}
```
