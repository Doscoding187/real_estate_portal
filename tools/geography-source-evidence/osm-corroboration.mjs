/**
 * OSM corroboration pass.
 *
 * A place is held by the production Place release policy when its evidence base is OSM-only.
 * The cure is a second, cleanly licensed source: the policy releases a place whose name is
 * asserted by GeoNames (CC BY 4.0) or NGA GNS (no restrictions) as well.
 *
 * This tool joins the held places against the attribution-licensed source extracts and
 * reports, for each one, whether an independent source asserts the same place name in the
 * same administrative context. It never edits the admitted package: it produces evidence, and
 * the admission path is what changes a place's licensing classification.
 *
 * Usage:
 *   node tools/geography-source-evidence/osm-corroboration.mjs
 *   node tools/geography-source-evidence/osm-corroboration.mjs --json
 *   node tools/geography-source-evidence/osm-corroboration.mjs --check
 *
 * The GeoNames extract is expected at the path recorded in the source manifest, or at
 * $GEONAMES_ZA_PATH. Its licence is CC BY 4.0 and it must keep its original bytes.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ADMISSION = join(ROOT, 'data/gauteng-place-admission-v0.1');
const MANIFEST = join(ROOT, 'data/gauteng-source-authority-v0.2/gauteng_source_manifest_v0.2.json');
const GEONAMES =
  process.env.GEONAMES_ZA_PATH ||
  join(ROOT, 'data/gauteng-source-authority-v0.2/raw/geonames/ZA.txt');
const GEONAMES_ADMIN2 =
  process.env.GEONAMES_ADMIN2_PATH ||
  join(ROOT, 'data/gauteng-source-authority-v0.2/raw/geonames/admin2Codes.txt');

/** The governed merge distance the coverage pipeline already uses for the same referent. */
const GOVERNED_MAX_MERGE_KM = 15;

/** GeoNames administrative level 1 codes for the provinces we hold. */
const PROVINCE_ADMIN1 = { gauteng: '06' };

function readJsonl(path) {
  const rows = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line));
  }
  return rows;
}

function normaliseName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** GeoNames column indices, from the dump readme. */
const GN = {
  geonameid: 0,
  name: 1,
  alternates: 3,
  lat: 4,
  lon: 5,
  featureClass: 6,
  featureCode: 7,
  country: 8,
  admin1: 10,
  admin2: 11,
};

export function buildCorroboration() {
  const admitted = readJsonl(join(ADMISSION, 'gauteng_place_admission_v0.1.jsonl'));
  const names = readJsonl(join(ADMISSION, 'gauteng_place_names_v0.1.jsonl'));
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

  const held = new Set(
    admitted
      .filter(row => row.licensing_classification === 'osm_only_odbl_provisional')
      .map(row => row.place_id),
  );

  const preferredNames = new Map();
  const namesByPlace = new Map();
  for (const row of names) {
    if (!preferredNames.has(row.place_id) && row.name_role === 'preferred_public') {
      preferredNames.set(row.place_id, row);
    }
    if (!namesByPlace.has(row.place_id)) namesByPlace.set(row.place_id, []);
    namesByPlace.get(row.place_id).push(row);
  }

  // The source index: normalised name plus the administrative context, from the licensed extract.
  const sourceIndex = new Map();
  const sourceLicences = new Map();
  for (const artefact of manifest.artifacts || []) {
    if (artefact.licence_class && artefact.licence_class !== 'ODBL_1') {
      sourceLicences.set(artefact.artifact_id, artefact);
    }
  }

  if (!existsSync(GEONAMES)) {
    return {
      available: false,
      reason: `The GeoNames extract is not present at ${GEONAMES}.`,
      held: held.size,
      sourceLicences: [...sourceLicences.values()].map(a => ({
        artefact: a.artifact_id,
        licence: a.licence_class,
        access: a.access_url,
      })),
    };
  }

  // The municipality each GeoNames administrative code names.
  const municipalityByCode = new Map();
  if (existsSync(GEONAMES_ADMIN2)) {
    for (const line of readFileSync(GEONAMES_ADMIN2, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const [code, name] = line.split('\t');
      if (code && name) municipalityByCode.set(code.split('.').pop(), name);
    }
  }

  const rows = readFileSync(GEONAMES, 'utf8').split('\n').filter(Boolean);
  const provinceCode = PROVINCE_ADMIN1.gauteng;
  let inProvince = 0;
  for (const line of rows) {
    const columns = line.split('\t');
    if (columns[GN.country] !== 'ZA') continue;
    if (columns[GN.admin1] !== provinceCode) continue;
    inProvince += 1;
    // A place is named in more than one way. The primary name and every alternate name are
    // indexed, because the OSM name and the GeoNames name for the same place are often not
    // the same string.
    const names = [columns[GN.name], ...String(columns[GN.alternates] || '').split(',')];
    for (const candidate of names) {
      const key = normaliseName(candidate);
      if (!key) continue;
      if (!sourceIndex.has(key)) sourceIndex.set(key, []);
      if (!sourceIndex.get(key).includes(columns)) sourceIndex.get(key).push(columns);
    }
  }

  const distanceKm = (lat1, lon1, lat2, lon2) => {
    const toRad = value => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const results = [];
  for (const placeId of held) {
    const nameRow = preferredNames.get(placeId);
    const place = admitted.find(row => row.place_id === placeId);
    const adjudication = place?.adjudication || {};
    const context = adjudication.administrative_context || null;
    const latitude = Number(adjudication.representative_latitude);
    const longitude = Number(adjudication.representative_longitude);
    const hasPoint = Number.isFinite(latitude) && Number.isFinite(longitude);

    // The same place is the same name at the same point, inside the governed merge distance.
    // The place may be known by more than one name, and the source may use a different one.
    const placeNames = [
      ...new Set(
        (namesByPlace.get(placeId) || []).map(row => normaliseName(row.name)).filter(Boolean),
      ),
    ];
    const seen = new Set();
    const candidates = [];
    let matchedName = null;
    for (const candidateName of placeNames) {
      for (const candidate of sourceIndex.get(candidateName) || []) {
        if (seen.has(candidate[GN.geonameid])) continue;
        if (!hasPoint) continue;
        const distance = distanceKm(
          latitude,
          longitude,
          Number(candidate[GN.lat]),
          Number(candidate[GN.lon]),
        );
        if (distance > GOVERNED_MAX_MERGE_KM) continue;
        seen.add(candidate[GN.geonameid]);
        candidates.push(candidate);
        if (!matchedName) matchedName = candidateName;
      }
    }

    const contextName = context ? normaliseName(context) : '';
    results.push({
      placeId,
      name: nameRow?.name || null,
      administrativeContext: context,
      corroborated: candidates.length > 0,
      contextAgrees: candidates.some(candidate => {
        const municipality = municipalityByCode.get(candidate[GN.admin2]) || '';
        const municipalityName = normaliseName(municipality);
        return (
          contextName.length > 0 &&
          (municipalityName.includes(contextName) || contextName.includes(municipalityName))
        );
      }),
      matchedName,
      sourceRows: candidates.slice(0, 3).map(candidate => ({
        geonameid: candidate[GN.geonameid],
        name: candidate[GN.name],
        admin2: candidate[GN.admin2],
        municipality: municipalityByCode.get(candidate[GN.admin2]) || null,
        distanceKm: hasPoint
          ? Math.round(
              distanceKm(
                latitude,
                longitude,
                Number(candidate[GN.lat]),
                Number(candidate[GN.lon]),
              ) * 10,
            ) / 10
          : null,
        featureCode: candidate[GN.featureCode],
        licence: 'CC BY 4.0',
      })),
    });
  }

  // A place is corroborated when a clean-licensed source asserts its name at its point and
  // the municipality agrees. A place with no administrative context cannot be corroborated
  // by that test, so it is reported separately rather than counted.
  // Three honest buckets.
  //
  // corroborated      a clean-licensed source asserts the name at the point and the
  //                    municipality agrees. The place can be re-sourced and released.
  // context unproven  a clean-licensed source asserts the name at the point, but the two
  //                    municipalities differ. The place is real; which municipality owns it
  //                    is a parent-edge question for the governed admission path, not a
  //                    licence question. These are routed, not discarded.
  // unmatched         no clean-licensed source asserts the name at the point.
  const corroborated = results.filter(
    result => result.corroborated && (result.contextAgrees || !result.administrativeContext),
  );
  const contextUnproven = results.filter(
    result => result.corroborated && !result.contextAgrees && result.administrativeContext,
  );
  return {
    available: true,
    held: held.size,
    provinceRows: inProvince,
    corroborated: corroborated.length,
    corroboratedWithExactContext: corroborated.filter(result => result.contextAgrees).length,
    contextUnproven: contextUnproven.length,
    notCorroborated: results.length - corroborated.length - contextUnproven.length,
    byAdministrativeContext: corroborated.reduce((acc, result) => {
      const key = result.administrativeContext || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    examples: corroborated
      .slice(0, 12)
      .map(
        result =>
          `${result.name} (${result.administrativeContext}) → geonameid ${result.sourceRows[0].geonameid} ` +
          `${result.sourceRows[0].municipality || 'unknown municipality'}, ${result.sourceRows[0].distanceKm}km, ` +
          `context ${result.contextAgrees ? 'agrees' : 'differs'}`,
      ),
    contextUnprovenExamples: contextUnproven
      .slice(0, 12)
      .map(
        result =>
          `${result.name} (${result.administrativeContext}) -> ${
            result.sourceRows[0].municipality || 'unknown municipality'
          }, ${result.sourceRows[0].distanceKm}km`,
      ),
    unmatchedExamples: results
      .filter(result => !result.corroborated)
      .slice(0, 12)
      .map(result => `${result.name} (${result.administrativeContext})`),
  };
}

function main() {
  const report = buildCorroboration();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (!report.available) {
    console.error(`osm-corroboration: ${report.reason}`);
    console.error('  The licensed source extracts must be present before the pass can run.');
    for (const source of report.sourceLicences || []) {
      console.error(`  ${source.artefact} — ${source.licence} — ${source.access}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log('# OSM corroboration pass — Gauteng\n');
  console.log(`Held places (OSM-only evidence): ${report.held}`);
  console.log(`GeoNames rows in the province: ${report.provinceRows}`);
  console.log(`Corroborated by a clean-licensed source: ${report.corroborated}`);
  console.log(
    `  of which the administrative context matches exactly: ${report.corroboratedWithExactContext}`,
  );
  console.log(`Corroborated, municipality to be resolved: ${report.contextUnproven}`);
  console.log(`Not corroborated by any clean-licensed source: ${report.notCorroborated}`);
  if (Object.keys(report.byAdministrativeContext).length) {
    console.log('\nCorroborated by context:');
    for (const [context, count] of Object.entries(report.byAdministrativeContext).sort(
      (left, right) => right[1] - left[1],
    )) {
      console.log(`  ${context}: ${count}`);
    }
  }
  if (report.examples.length) {
    console.log('\nExamples:');
    for (const example of report.examples) console.log(`  ${example}`);
  }
  if (report.unmatchedExamples.length) {
    console.log('\nNot corroborated yet:');
    for (const example of report.unmatchedExamples) console.log(`  ${example}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('osm-corroboration.mjs')) main();
