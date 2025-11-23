# How to Update SARB Prime Rate

The SARB (South African Reserve Bank) Prime Rate is now stored in the database and can be updated without code changes.

## Quick Update via SQL

Run this SQL command in MySQL Workbench or any MySQL client:

```sql
USE real_estate_portal;

UPDATE platform_settings 
SET settingValue = 'NEW_RATE_HERE', 
    updatedAt = NOW()
WHERE settingKey = 'sarb_prime_rate';

-- Example: To update to 11.00%
UPDATE platform_settings 
SET settingValue = '11.00', 
    updatedAt = NOW()
WHERE settingKey = 'sarb_prime_rate';
```

## Via Admin Panel (Future Enhancement)

You can create an admin settings page to update this value through the UI:

1. Navigate to Admin Dashboard → Settings
2. Find "SARB Prime Rate" setting
3. Update the value
4. Click Save

The change will be reflected immediately across the entire platform.

## Current Implementation

- **Database Table:** `platform_settings`
- **Setting Key:** `sarb_prime_rate`
- **Current Value:** 10.50%
- **Backend Endpoint:** `trpc.settings.getSARBPrimeRate`
- **Used In:** Buyability Calculator (BondCalculator component)

## When to Update

Update the SARB Prime Rate whenever the South African Reserve Bank announces a change to the repo rate. The prime rate is typically:

**Prime Rate = Repo Rate + 3.50%**

For example:
- Repo Rate: 7.00% → Prime Rate: 10.50%
- Repo Rate: 7.25% → Prime Rate: 10.75%
- Repo Rate: 6.75% → Prime Rate: 10.25%

## Verification

After updating, verify the change by:

1. Visiting any property detail page
2. Scrolling to the "Buyability Calculator"
3. Checking that the displayed rate matches your update
4. The calculator will automatically use the new rate for all calculations

## Fallback

If the database is unavailable, the system will fall back to 10.50% to ensure the calculator always works.
