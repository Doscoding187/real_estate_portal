import path from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { assertLocalSeedSafety } from './localDemoSeed';

const SHOWCASE_TITLE = '[LOCAL PDP SHOWCASE] Complete Camps Bay Villa';

function json(value: unknown) {
  return JSON.stringify(value);
}

function placeholders(values: unknown[]) {
  return values.map(() => '?').join(', ');
}

async function deleteByPropertyIds(
  connection: mysql.Connection,
  table: string,
  column: string,
  propertyIds: number[],
) {
  if (!propertyIds.length) return;
  await connection.execute(
    `DELETE FROM ${table} WHERE ${column} IN (${placeholders(propertyIds)})`,
    propertyIds,
  );
}

async function clearPropertyIds(
  connection: mysql.Connection,
  table: string,
  column: string,
  propertyIds: number[],
) {
  if (!propertyIds.length) return;
  await connection.execute(
    `UPDATE ${table} SET ${column} = NULL WHERE ${column} IN (${placeholders(propertyIds)})`,
    propertyIds,
  );
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

  const parsedUrl = assertLocalSeedSafety(process.env, { target: 'local' });
  const connection = await mysql.createConnection(parsedUrl.toString());

  try {
    await connection.beginTransaction();

    const [ownerRows] = await connection.execute<mysql.RowDataPacket[]>(
      `
        SELECT id
        FROM users
        WHERE email IN ('listing.agent@listify.local', 'agent@listify.local')
        ORDER BY CASE WHEN email = 'listing.agent@listify.local' THEN 0 ELSE 1 END
        LIMIT 1
      `,
    );
    const ownerId = Number(ownerRows[0]?.id);

    if (!ownerId) {
      throw new Error('Local PDP showcase seed requires demo users. Run pnpm db:seed:local first.');
    }

    const [existingRows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT id FROM properties WHERE title LIKE '[LOCAL PDP SHOWCASE]%' OR placeId LIKE 'local-pdp-showcase-%'",
    );
    const existingIds = existingRows.map(row => Number(row.id)).filter(Number.isFinite);

    if (existingIds.length > 0) {
      await clearPropertyIds(connection, 'commissions', 'propertyId', existingIds);
      await clearPropertyIds(connection, 'leads', 'propertyId', existingIds);
      await clearPropertyIds(connection, 'service_leads', 'property_id', existingIds);
      await clearPropertyIds(connection, 'showings', 'propertyId', existingIds);
      await clearPropertyIds(connection, 'user_behavior_events', 'propertyId', existingIds);
      await clearPropertyIds(connection, 'videos', 'propertyId', existingIds);
      await deleteByPropertyIds(connection, 'favorites', 'propertyId', existingIds);
      await deleteByPropertyIds(connection, 'offers', 'propertyId', existingIds);
      await deleteByPropertyIds(connection, 'price_history', 'propertyId', existingIds);
      await deleteByPropertyIds(connection, 'price_predictions', 'propertyId', existingIds);
      await deleteByPropertyIds(connection, 'propertyImages', 'propertyId', existingIds);
      await deleteByPropertyIds(connection, 'property_similarity_index', 'propertyId1', existingIds);
      await deleteByPropertyIds(connection, 'property_similarity_index', 'propertyId2', existingIds);
      await deleteByPropertyIds(connection, 'prospect_favorites', 'propertyId', existingIds);
      await deleteByPropertyIds(connection, 'recently_viewed', 'propertyId', existingIds);
      await deleteByPropertyIds(connection, 'scheduled_viewings', 'propertyId', existingIds);
      await deleteByPropertyIds(connection, 'properties', 'id', existingIds);
    }

    const propertySettings = {
      // Core facts
      houseAreaM2: 450,
      erfSizeM2: 850,
      parkingCount: 3,
      floorLevel: null,

      // Buyer decision checks
      ownershipType: 'freehold',
      parkingType: 'double_garage',
      electricitySupply: 'municipal',
      prepaidElectricity: false,
      waterSupply: 'municipal',
      waterBackup: 'borehole',
      powerBackup: 'inverter',
      fibreReady: true,
      internetAccess: 'fibre',
      security: 'estate_security',
      securityFeatures: ['access_control', 'cctv', 'electric_fence', '24hr_guard'],
      petFriendly: true,
      petPolicy: 'allowed',

      // Features, finishes, and specifications
      furnishingStatus: 'unfurnished',
      flooring: 'tiled',
      kitchenType: 'open_plan',
      countertopMaterial: 'granite',
      builtInCupboards: 'yes',
      airConditioning: 'central',
      fireplace: 'gas',
      appliancesIncluded: ['stove', 'oven', 'hob', 'extractor', 'dishwasher', 'fridge'],
      waterHeating: 'solar_geyser',

      // Physical property features
      balcony: true,
      garden: true,
      pool: true,
      staffQuarters: true,
      boundaryWalls: true,
      additionalRooms: [
        'Study / Office',
        'Scullery',
        'Laundry Room',
        'Pantry',
        'Storage Room',
        'Walk-in Closet',
        'Staff Quarters',
      ],
      outdoorFeatures: [
        'pool',
        'garden',
        'braai_area',
        'patio',
        'balcony',
        'deck',
        'entertainment_area',
      ],
      amenitiesFeatures: [
        'Gym',
        'Clubhouse',
        'Kids Play Area',
        'Visitor Parking',
        'Communal Garden',
        'Concierge',
        'Rooftop Terrace',
      ],
      accessibilityFeatures: ['step_free_access', 'wide_doorways'],

      // Marketing and location data.
      // These should NOT appear in Property Features & Specifications.
      // They are for future separate PDP sections.
      propertyHighlights: [
        'Move-in Ready',
        'Private',
        'Natural Light',
        'Modern Finishes',
        'High Ceilings',
      ],
      viewHighlights: ['sea_view', 'mountain_view', 'panoramic_view'],
      locationHighlights: [
        'Near Top Schools',
        'Near Shopping Centres',
        'Easy Highway Access',
        'Close To Beach',
        'Near Restaurants',
      ],

      negotiable: false,
    };

    const mainImage =
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=85';

    const [insertResult] = await connection.execute<mysql.ResultSetHeader>(
      `
        INSERT INTO properties
          (title, description, propertyType, listingType, transactionType, price, bedrooms, bathrooms, area, address, city, province, zipCode, latitude, longitude, locationText, placeId, amenities, yearBuilt, status, featured, views, enquiries, ownerId, propertySettings, levies, ratesAndTaxes, mainImage)
        VALUES
          (?, ?, 'villa', 'sale', 'sale', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 1, 55, 7, ?, ?, ?, ?, ?)
      `,
      [
        SHOWCASE_TITLE,
        'A fully enriched local-only PDP showcase property used to test buyer checks, property specifications, running costs, marketing highlights, location highlights, and conversion sections. This record is intentionally rich so the detail page can be judged section by section.',
        18500000,
        5,
        4,
        450,
        'Beach Road, Camps Bay',
        'Cape Town',
        'Western Cape',
        '8005',
        '-33.9510',
        '18.3840',
        'Camps Bay, Cape Town, Western Cape',
        'local-pdp-showcase-camps-bay',
        json([
          'Swimming Pool',
          'Gym',
          'Garden',
          'Braai Area',
          'Clubhouse',
          'Concierge',
          'Beach Access',
        ]),
        2022,
        ownerId,
        json(propertySettings),
        0,
        4500,
        mainImage,
      ],
    );

    const propertyId = Number(insertResult.insertId);

    const images = [
      mainImage,
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
    ];

    for (let index = 0; index < images.length; index += 1) {
      await connection.execute(
        `
          INSERT INTO propertyImages
            (propertyId, imageUrl, isPrimary, displayOrder)
          VALUES
            (?, ?, ?, ?)
        `,
        [propertyId, images[index], index === 0 ? 1 : 0, index],
      );
    }

    await connection.commit();

    console.log('');
    console.log('Local PDP showcase property seeded.');
    console.log(`Property ID: ${propertyId}`);
    console.log(`Title: ${SHOWCASE_TITLE}`);
    console.log('');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/seedLocalPdpShowcase.ts')) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
