# KPI Query Fix

An error "Failed to load KPIs" was reported on the developer dashboard.

The root cause was identified as an inconsistent schema definition in `drizzle/schema.ts` for the `developments` table. The `developerId` field was not explicitly mapped to the `developer_id` column in the database. This caused the Drizzle ORM to generate an incorrect SQL query with a camelCase column name (`developerId`) instead of the snake_case name (`developer_id`) used in the database.

The following change has been made to `drizzle/schema.ts`:

```diff
- developerId: int().references(() => developers.id, { onDelete: "cascade" } ),
+ developerId: int("developer_id").references(() => developers.id, { onDelete: "cascade" } ),
```

This change makes the column mapping explicit and should resolve the issue.

The development server is running with `tsx watch`, which should automatically detect the change to `drizzle/schema.ts` and restart. Upon restart, the correct query should be generated, and the "Failed to load KPIs" error should be resolved.

No database migration is necessary as the database schema is already correct. The fix is purely in the ORM's schema definition.
