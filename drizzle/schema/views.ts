import {
  mysqlTable,
  mysqlSchema,
  AnyMySqlColumn,
  index,
  unique,
  foreignKey,
  int,
  varchar,
  text,
  json,
  mysqlEnum,
  timestamp,
  decimal,
  date,
  datetime,
  mysqlView,
  tinyint,
  bigint,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { provinces, cities } from './locations';

export const priceFacts = mysqlView('price_facts').as(qb => {
  return qb
    .select({
      id: provinces.id,
      provinceName: provinces.name,
      cityName: cities.name,
      avgPrice: sql<number>`avg(properties.price)`.as('avg_price'),
      minPrice: sql<number>`min(properties.price)`.as('min_price'),
      maxPrice: sql<number>`max(properties.price)`.as('max_price'),
      propertyCount: sql<number>`count(*)`.as('property_count'),
    })
    .from(provinces)
    .leftJoin(cities, sql`${provinces.id} = ${cities.provinceId}`)
    .leftJoin(sql.raw('properties'), sql`${cities.id} = properties.city_id`)
    .groupBy(provinces.id, cities.id);
});
