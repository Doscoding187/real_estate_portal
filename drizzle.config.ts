import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "292qWmvn2YGy2jW.root",
    password: "TOdjCJY1bepCcJg1",
    database: "listify_property_sa",
    ssl: {},
  },
});
