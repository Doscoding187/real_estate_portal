import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const OUTPUT_DIRECTORY = path.join(
  ROOT,
  'data/gauteng-canonical-runtime-convergence-v0.1/output',
);

const INPUTS = {
  factualSummary:
    'data/gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_summary_v0.1.json',
  searchAreaDefinitions:
    'data/gauteng-search-area-candidates-v0.1/output/gauteng_search_area_definitions_v0.1.json',
  activeMemberships:
    'data/gauteng-search-area-candidates-v0.1/output/gauteng_search_area_active_memberships_v0.1.jsonl',
  membershipEvidence:
    'data/gauteng-search-area-candidates-v0.1/output/gauteng_search_area_membership_evidence_v0.1.jsonl',
  searchAreaIdentityCollisions:
    'data/gauteng-search-area-candidates-v0.1/output/gauteng_search_area_identity_collisions_v0.1.json',
  canonicalGeographyAdapter: 'server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts',
  runtimeAuthority: 'shared/locationAuthority.ts',
  searchAreaAuthority: 'server/services/searchAreaAuthority.ts',
  runtimeSearchAreaDefinitions: 'server/services/searchAreaDefinitions.ts',
  searchAreaQueryBoundary: 'server/services/searchAreaQueryBoundary.ts',
  locationResolver: 'server/services/locationResolverService.ts',
  listingLocationResolver: 'server/services/listingLocationResolver.ts',
  publicSearchValidation: 'shared/publicSearchValidation.ts',
  geographyHandoff: 'client/src/lib/geographySearchHandoff.ts',
  listingSchema: 'drizzle/schema/listings.ts',
  locationSchema: 'drizzle/schema/locations.ts',
};

const CHECKPOINTS = {
  factualCanonical: 'bd39aa38e4f7158164f3572b62db827fbf01c1a7',
  searchAreaResearch: '5c8c04858c27339255f9648737da084097e2ec3c',
  searchAreaCandidates: 'ccd613d2b199504e90a74d7c5a0f6728c8ca98df',
};

const FACTUAL_IDS = Object.freeze({
  alberton: 'pl-gp-v01-4c21c1f81da64c1c6728',
  centurion: 'pl-gp-v01-029159849439c2ea8783',
  brackenhurst: 'pl-gp-v01-af17bb51ea1399e1ec40',
  raceview: 'pl-gp-v01-bd59322d0b3ed7431605',
  randhart: 'pl-gp-v01-800cda0bcb00e0edb9f9',
  ekurhuleniMidrand: 'pl-gp-v01-455d2715587edce120f0',
  midstreamEstate: 'pl-gp-v01-2fad4c8097c15027f8ec',
});

const BOUNDED_FIVE_FACTUAL_IDS = Object.freeze([
  FACTUAL_IDS.brackenhurst,
  FACTUAL_IDS.raceview,
  FACTUAL_IDS.randhart,
  FACTUAL_IDS.ekurhuleniMidrand,
  FACTUAL_IDS.midstreamEstate,
]);

const ACCEPTED_MEMBERSHIP_BOUNDARY_SHA256 =
  '8315e895369ae3552de5a22c5d5c91efc070fcbd9116e02c310508ea347e36da';

const HISTORICAL_SOURCE_ONLY_RECORDS = Object.freeze([
  {
    canonical_location_id: FACTUAL_IDS.ekurhuleniMidrand,
    factual_location_preferred_name: 'Midrand',
    factual_type: 'locality',
    search_area_ids: [],
    search_area_names: [],
    source_only: true,
  },
]);

/**
 * External evidence is retained as provenance only. No source geometry or
 * database row identifiers are copied into the durable projection.
 */
const EVIDENCE_PROVENANCE = Object.freeze({
  ekurhuleniRegionFRsdf: {
    source_id: 'official_ekurhuleni_region_f_rsdf_2015',
    source_url: 'https://www.ekurhuleni.gov.za/wp-content/uploads/2022/11/RSDF-Region-F_2015_Report.pdf',
    source_class: 'official_municipal_planning',
    licensing_note:
      'Official municipal publication; retain the source URL and attribution. No source geometry is copied.',
  },
  ekurhuleniAlbertonCalendar: {
    source_id: 'official_ekurhuleni_alberton_service_calendar_2024',
    source_url: 'https://www.ekurhuleni.gov.za/wp-content/uploads/2024/07/ALBERTON-Calender.pdf',
    source_class: 'official_municipal_service_context',
    licensing_note:
      'Official municipal publication; retain the source URL and attribution. Used for place-context assertion only.',
  },
  ekurhuleniBrackenhurstClinic: {
    source_id: 'official_ekurhuleni_brackenhurst_clinic_directory',
    source_url: 'https://www.ekurhuleni.gov.za/for-me/services/clinics/clinics-rehab-centres/',
    source_class: 'official_municipal_place_directory',
    licensing_note:
      'Official municipal directory; retain the source URL and attribution. No source geometry is copied.',
  },
  ekurhuleniMidstreamPlanning: {
    source_id: 'public_copy_of_ekurhuleni_midstream_estate_township_notice',
    source_url: 'https://stats.midstream.co.za/Handler1.ashx?guid=60b4c7e6-0bf6-46e5-972e-f30575e556a7',
    source_class: 'public_copy_of_official_municipal_town_planning_notice',
    licensing_note:
      'Publicly hosted copy of a municipal planning notice; retain the copy URL/provenance and verify against the primary municipal record before any later boundary use. No source geometry is copied.',
  },
  dlrrdMidstreamPlaceName: {
    source_id: 'official_dlrdd_esio_midstream_estate_place_name',
    source_url: 'https://csg.dlrrd.gov.za/esio/listminor.jsp?office=6',
    source_class: 'official_government_place_name_register',
    licensing_note:
      'Official government place-name register; retain URL and attribution. Used for identity corroboration only; no source geometry is copied.',
  },
  ekurhuleniMidstreamServices: {
    source_id: 'official_ekurhuleni_midstream_fire_service_context',
    source_url: 'https://www.ekurhuleni.gov.za/press-releases/service-delivery/ekurhuleni-welcomes-new-concrete-giant-to-fight-fire/',
    source_class: 'official_municipal_service_context',
    licensing_note:
      'Official municipal publication; retain the source URL and attribution. Used to corroborate administrative service context.',
  },
  tshwaneMidstreamService: {
    source_id: 'official_tshwane_midstream_water_service_context',
    source_url: 'https://www.tshwane.gov.za/?p=102541',
    source_class: 'official_municipal_service_context',
    licensing_note:
      'Official municipal publication; used only as a contextual service/market signal, not as a municipal-boundary assertion.',
  },
  centurionMarketContext: {
    source_id: 'market_centurion_midstream_estate_terminology',
    source_url: 'https://centurionproperty.co.za/suburb-info/midstream-estate-centurion/',
    source_class: 'property_market_terminology',
    licensing_note:
      'Market source used only to corroborate runtime consumer terminology; not the sole factual geography authority.',
  },
  justiceGautengPlaceAreas: {
    source_id: 'official_justice_gauteng_place_areas',
    source_url: 'https://www.justice.gov.za/maps/areas-gp.html',
    source_class: 'official_government_place_context',
    licensing_note:
      'Official government place-context publication; retain URL and attribution. No map geometry is copied.',
  },
  cityJohannesburgRegionA: {
    source_id: 'official_city_of_johannesburg_region_a_midrand',
    source_url: 'https://joburg.org.za/about_/regions/Pages/Region%20A%20-%20Diepsloot%2C%20Midrand/about-us.aspx',
    source_class: 'official_municipal_region_context',
    licensing_note:
      'Official municipal region publication; retain URL and attribution. Used for current municipal context, not as a same-name identity merge rule.',
  },
  cityJohannesburgRegionASuburbs: {
    source_id: 'official_city_of_johannesburg_region_a_place_list',
    source_url: 'https://joburg.org.za/about_/regions/Pages/Region%20A%20-%20Diepsloot%2C%20Midrand/suburbs.aspx',
    source_class: 'official_municipal_place_directory',
    licensing_note:
      'Official municipal place directory; retain URL and attribution. Used to corroborate current Region A place terminology only.',
  },
  cityJohannesburgWaterfallRegionA: {
    source_id: 'official_city_of_johannesburg_waterfall_midrand_region_a',
    source_url: 'https://joburg.org.za/media_/Pages/Media/Media%20Statements/2020%20Media%20Statements/October%202020/City-continues-to-implement-ways-to-improve-customer-experience.aspx',
    source_class: 'official_municipal_service_context',
    licensing_note:
      'Official municipal publication; retain URL and attribution. Used as a current Midrand/Region A cross-check; no geometry is copied.',
  },
  geonamesMidrand: {
    source_id: 'geonames_midrand_place_record',
    source_url: 'https://www.geonames.org/1105776/midrand.html',
    source_class: 'free_gazetteer',
    licensing_note:
      'GeoNames data is CC BY 4.0; retain attribution and do not treat a same-name record as the accepted factual ID without a cross-identifier.',
  },
  geonamesEkurhuleniMidrand: {
    source_id: 'geonames_ekurhuleni_midrand_area_record',
    source_url: 'https://www.geonames.org/975968/midrand.html',
    source_class: 'free_gazetteer',
    licensing_note:
      'GeoNames data is CC BY 4.0; retain attribution. The distinct source record is an AREA feature at the accepted coordinate, not proof of a current populated place or executable parent.',
  },
  geonamesFeatureCodes: {
    source_id: 'geonames_feature_code_definitions',
    source_url: 'https://www.geonames.org/export/codes.html',
    source_class: 'free_gazetteer_schema_documentation',
    licensing_note:
      'GeoNames documentation is retained as source interpretation context; GeoNames data attribution remains CC BY 4.0 where data is used.',
  },
  statsSaMidrandMainPlaceCodes: {
    source_id: 'official_stats_sa_midrand_main_place_codes',
    source_url: 'https://apps.statssa.gov.za/Deploy/census01/HTML/mainplace.pdf',
    source_class: 'official_statistics_place_code',
    licensing_note:
      'Official Statistics South Africa publication; retain URL and attribution. Census/main-place codes are source evidence and are not copied as runtime identity.',
  },
  statsSaJohannesburgMidrand: {
    source_id: 'official_stats_sa_johannesburg_midrand_main_place',
    source_url: 'https://www.statssa.gov.za/?id=11295&page_id=4286',
    source_class: 'official_statistics_main_place',
    licensing_note:
      'Official Statistics South Africa place page; retain URL and attribution. Used to corroborate the Johannesburg-context identity only.',
  },
  statsSa2023GautengPlaceTable: {
    source_id: 'official_stats_sa_2023_gauteng_place_table',
    source_url: 'https://www.statssa.gov.za/publications/Report-50-11-01/Report-50-11-012023.pdf',
    source_class: 'official_statistics_municipal_place_table',
    licensing_note:
      'Official Statistics South Africa publication; retain URL and attribution. The table is temporal survey evidence, not a substitute for a current statutory place-name register.',
  },
  ekurhuleniAdministrativeGis: {
    source_id: 'official_ekurhuleni_administrative_gis_2024',
    source_url:
      'https://gis.ekurhuleni.gov.za/arcgis/rest/services/Ekurhuleni/Ekurhuleni_AdministrativeBoundaries_Map_2024/MapServer',
    source_class: 'official_municipal_gis',
    licensing_note:
      'Official City of Ekurhuleni GIS service; retain URL and attribution. A read-only point-in-boundary check was used; no source geometry or database identifiers are copied.',
  },
  ekurhuleniKhayalamiHistory: {
    source_id: 'official_ekurhuleni_khayalami_metropolitan_council_history',
    source_url: 'https://www.ekurhuleni.gov.za/press-releases/city-s-20-years/city-of-ekurhuleni-turns-20/',
    source_class: 'official_municipal_historical_context',
    licensing_note:
      'Official municipal historical publication; retain URL and attribution. Historical administration is retained as provenance and is not treated as current municipal containment.',
  },
  osmEkurhuleniMidrandCoordinate: {
    source_id: 'openstreetmap_nominatim_ekurhuleni_midrand_coordinate',
    source_url:
      'https://nominatim.openstreetmap.org/reverse?lat=-25.978068&lon=28.172929&format=jsonv2&zoom=12',
    source_class: 'openstreetmap_reverse_geocoder',
    licensing_note:
      'OpenStreetMap/Nominatim corroboration; retain ODbL attribution and licensing review. Used as a current place-name cross-check only; no geometry is copied.',
  },
  osmMidstreamEstate: {
    source_id: 'osm_midstream_estate_way_72865241',
    source_url: 'https://www.openstreetmap.org/way/72865241',
    source_class: 'openstreetmap',
    licensing_note:
      'OSM source is ODbL; retain attribution and licensing review. No OSM geometry is copied into this artifact.',
  },
});

function provenance(source, assertion) {
  return { ...source, assertion };
}

function reconciliationDispositionForArtifact(disposition) {
  return {
    factual_disposition: disposition.factualDisposition,
    membership_recommendation: disposition.membershipRecommendation,
    current_place_status: disposition.currentPlaceStatus,
    source_identity_interpretation: disposition.sourceIdentityInterpretation,
  };
}

/**
 * These are explicit, evidence-backed identity edges for this bounded slice.
 * They are keyed by durable factual IDs; labels are never used as lookup keys.
 */
const RECONCILED_CONTEXTS = new Map([
  [
    FACTUAL_IDS.brackenhurst,
    {
      disposition: 'projection_ready',
      acceptedContextLocationId: FACTUAL_IDS.alberton,
      acceptedContextLocationName: 'Alberton',
      acceptedContextRelationship: 'factual_parent_suburb_of_town',
      runtimeParentNaturalKey: 'gauteng/alberton',
      runtimeParentResolution: 'accepted_factual_alberton_parent',
      hierarchyState: 'accepted_administrative_context; accepted_factual_parent',
      decisionReason:
        'Official municipal evidence independently places Brackenhurst within the Alberton suburb context. Preserve factual type suburb; project to locality under the accepted Alberton factual town using a stable natural key.',
      evidenceProvenance: [
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniRegionFRsdf,
          'City of Ekurhuleni Region F identifies Brackenhurst as a surrounding suburb of the Alberton CBD.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniAlbertonCalendar,
          'The Alberton municipal service schedule places Brackenhurst in the Alberton service context.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniBrackenhurstClinic,
          'The City of Ekurhuleni directory gives the Brackenhurst Clinic address as Brackenhurst, Alberton.',
        ),
      ],
    },
  ],
  [
    FACTUAL_IDS.raceview,
    {
      disposition: 'projection_ready',
      acceptedContextLocationId: FACTUAL_IDS.alberton,
      acceptedContextLocationName: 'Alberton',
      acceptedContextRelationship: 'factual_parent_suburb_of_town',
      runtimeParentNaturalKey: 'gauteng/alberton',
      runtimeParentResolution: 'accepted_factual_alberton_parent',
      hierarchyState: 'accepted_administrative_context; accepted_factual_parent',
      decisionReason:
        'Official municipal evidence independently places Raceview within the Alberton suburb context. Preserve factual type suburb; project to locality under the accepted Alberton factual town using a stable natural key.',
      evidenceProvenance: [
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniRegionFRsdf,
          'City of Ekurhuleni Region F identifies Raceview as a surrounding suburb of the Alberton CBD.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniAlbertonCalendar,
          'The Alberton municipal service schedule places Raceview in the Alberton service context.',
        ),
      ],
    },
  ],
  [
    FACTUAL_IDS.randhart,
    {
      disposition: 'projection_ready',
      acceptedContextLocationId: FACTUAL_IDS.alberton,
      acceptedContextLocationName: 'Alberton',
      acceptedContextRelationship: 'factual_parent_suburb_of_town',
      runtimeParentNaturalKey: 'gauteng/alberton',
      runtimeParentResolution: 'accepted_factual_alberton_parent',
      hierarchyState: 'accepted_administrative_context; accepted_factual_parent',
      decisionReason:
        'Official municipal evidence independently places Randhart within the Alberton suburb context. Preserve factual type suburb; project to locality under the accepted Alberton factual town using a stable natural key.',
      evidenceProvenance: [
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniRegionFRsdf,
          'City of Ekurhuleni Region F identifies Randhart as a surrounding suburb of the Alberton CBD.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniAlbertonCalendar,
          'The Alberton municipal service schedule places Randhart in the Alberton service context.',
        ),
      ],
    },
  ],
  [
    FACTUAL_IDS.ekurhuleniMidrand,
    {
      disposition: 'factual_geography_blocker',
      reconciliationDisposition: {
        factualDisposition: 'historical_source_identity_only',
        membershipRecommendation: 'retire_from_current_membership',
        currentPlaceStatus: 'not_current_independent_place',
        sourceIdentityInterpretation:
          'GeoNames 975968 is an AREA feature at -25.978068, 28.172929. The retained source assertion is best treated as a historical or source-level area label, not as a current populated-place identity.',
      },
      hierarchyState: 'historical_or_source_area_record; not_current_independent_midrand; current_place_mismatch',
      decisionReason:
        'This accepted factual ID does not represent a valid independent current Midrand locality. Current City of Johannesburg material identifies Midrand in Region A and lists its current localities, while explicitly placing Tembisa/Ekurhuleni to the east of Region A. The accepted coordinate (-25.978068, 28.172929) is inside the current Ekurhuleni municipal boundary; the official Ekurhuleni GIS returns KEMPTON PARK as the current account area, and a current OSM reverse lookup returns Thembisa/Ekurhuleni rather than Midrand. GeoNames source record 975968 is feature class L / code AREA, whose official definition is a tract of land without homogeneous character or boundaries, not a populated place; the current Johannesburg Midrand record is the separate 1105776 PPL record. Historical Ekurhuleni material confirms that the former Khayalami Metropolitan Council was absorbed in 2000, which may explain source lineage but does not establish current Midrand containment. Therefore preserve this PL factual ID and its source provenance as historical/source-level evidence, do not merge it into the Johannesburg Midrand ID by name, do not fabricate an Ekurhuleni city parent, and recommend retiring it from the current membership boundary pending founder authority.',
      evidenceProvenance: [
        provenance(
          EVIDENCE_PROVENANCE.cityJohannesburgRegionA,
          'Current City of Johannesburg material identifies Midrand as the main Region A focus area and states that Region A borders Tembisa/Ekurhuleni to the east and Centurion/Tshwane to the north. This establishes current municipal context without merging same-name source records.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.cityJohannesburgRegionASuburbs,
          'The current Region A place list includes Midrand localities such as Carlswald, Crowthorne, Halfway House, Kyalami, Noordwyk, Vorna Valley, Waterval, Ivory Park and Rabie Ridge, corroborating the current Johannesburg Midrand place context.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.cityJohannesburgWaterfallRegionA,
          'City of Johannesburg service material identifies Waterfall Estate/Waterfall Customer Service Centre as Midrand, Region A, providing a current municipal cross-check for the Johannesburg-context Midrand identity.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.justiceGautengPlaceAreas,
          'The official place-area listing places Midrand under Johannesburg while separately listing Ekurhuleni places, confirming that name/context distinctions matter.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.geonamesMidrand,
          'GeoNames provides the Johannesburg-context Midrand place record 1105776 as a distinct populated-place record; it cannot replace the accepted factual ID or prove identity equivalence.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.geonamesEkurhuleniMidrand,
          'GeoNames separately provides record 975968 at the accepted coordinate as feature class L / code AREA. This supports preservation of source provenance but does not establish a current populated place or canonical parent.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.geonamesFeatureCodes,
          'GeoNames defines feature class L as area features and AREA as a tract of land without homogeneous character or boundaries; this source record is not a P/PPL populated-place identity.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.statsSaMidrandMainPlaceCodes,
          'The official Stats SA main-place lookup contains separate Midrand entries 77320 under Ekurhuleni and 77415 under the City of Johannesburg. This is source-level distinction evidence, not proof that both labels describe current equivalent canonical places.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.statsSaJohannesburgMidrand,
          'The official Stats SA Johannesburg Midrand page identifies Midrand under City of Johannesburg Municipality and supplies the retained Johannesburg-context place description.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.statsSa2023GautengPlaceTable,
          'The 2023 Stats SA Gauteng municipal place table lists Midrand under City of Johannesburg and does not list it under Ekurhuleni, introducing a temporal discrepancy that requires later place-name reconciliation rather than an automatic merge or projection.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniAdministrativeGis,
          'A read-only point query against the official Ekurhuleni GIS places the accepted coordinate inside Ekurhuleni and its current account-area layer returns KEMPTON PARK. This is current municipal/service geography, not proof that the source label Midrand is a current canonical place.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.osmEkurhuleniMidrandCoordinate,
          'A current reverse lookup at the accepted coordinate returns Thembisa/Ekurhuleni at locality scale and does not return Midrand; this is corroborative discovery evidence, not sole authority.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniKhayalamiHistory,
          'Official Ekurhuleni history states that the former Khayalami Metropolitan Council was among the administrations absorbed when Ekurhuleni was established in 2000. This is a plausible source-history clue only and does not establish current Midrand containment.',
        ),
      ],
    },
  ],
  [
    FACTUAL_IDS.midstreamEstate,
    {
      disposition: 'projection_ready',
      acceptedContextLocationId: FACTUAL_IDS.centurion,
      acceptedContextLocationName: 'Centurion',
      acceptedContextRelationship: 'runtime_market_context_not_administrative_parent',
      runtimeParentNaturalKey: 'gauteng/centurion',
      runtimeParentResolution:
        'accepted_centurion_runtime_context; factual_administrative_context_remains_ekurhuleni',
      hierarchyState:
        'accepted_administrative_context; accepted_runtime_context_not_administrative_parent',
      decisionReason:
        'Factual administrative context remains Ekurhuleni and factual type remains suburb. Independent municipal and market evidence supports Centurion as the executable runtime market context; it is not a municipality-to-city coercion or a claim that Ekurhuleni is Centurion.',
      evidenceProvenance: [
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniMidstreamPlanning,
          'A publicly hosted copy of an Ekurhuleni municipal town-planning notice identifies Midstream Estate township extensions under Ekurhuleni authority; the copy is not treated as the sole authority.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.dlrrdMidstreamPlaceName,
          'The official government place-name register lists MIDSTREAM ESTATE as place-name entry T0JR0589, corroborating the estate identity without asserting a runtime parent.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.ekurhuleniMidstreamServices,
          'The City of Ekurhuleni service publication includes Midstream Estate in the Olifantsfontein/Ekurhuleni service context.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.tshwaneMidstreamService,
          'The City of Tshwane service publication lists Midstream Estate in the Tshwane supply/service context, corroborating the adjacent Centurion runtime market context but not replacing the Ekurhuleni administrative fact.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.centurionMarketContext,
          'A property-market area guide uses Midstream Estate, Centurion terminology; this is market evidence only and is not the sole factual authority.',
        ),
        provenance(
          EVIDENCE_PROVENANCE.osmMidstreamEstate,
          'The accepted OSM representation is the retained estate identity; its ODbL provenance remains attached and no geometry is copied.',
        ),
      ],
    },
  ],
]);

const RUNTIME_REFERENCE_ROWS = [
  { level: 'province', reference_key: 'gauteng', name: 'Gauteng', code: 'GP' },
  {
    level: 'city',
    reference_key: 'gauteng/johannesburg',
    name: 'Johannesburg',
    parent_reference_key: 'gauteng',
  },
  {
    level: 'city',
    reference_key: 'gauteng/pretoria',
    name: 'Pretoria',
    parent_reference_key: 'gauteng',
  },
  {
    level: 'suburb',
    reference_key: 'gauteng/johannesburg/sandton',
    name: 'Sandton',
    parent_reference_key: 'gauteng/johannesburg',
    latitude: -26.1076,
    longitude: 28.0567,
    postal_code: '2196',
  },
  {
    level: 'suburb',
    reference_key: 'gauteng/pretoria/hatfield',
    name: 'Hatfield',
    parent_reference_key: 'gauteng/pretoria',
    latitude: -25.7461,
    longitude: 28.2353,
    postal_code: '0083',
  },
];

const OBSERVED_RUNTIME_HANDLES = [
  {
    canonical_location_id: 'province:1',
    level: 'province',
    label: 'Gauteng',
    authority_class: 'contract_fixture_or_preview',
    production_row_verified: false,
    evidence: [
      'server/services/__tests__/searchAreaAuthority.test.ts',
      'server/services/searchAreaDefinitions.ts',
      'client/src/lib/__tests__/geographySearchHandoff.test.ts',
    ],
  },
  {
    canonical_location_id: 'city:12',
    level: 'city',
    label: 'Johannesburg',
    authority_class: 'contract_fixture_or_preview',
    production_row_verified: false,
    evidence: [
      'server/services/__tests__/searchAreaAuthority.test.ts',
      'server/services/searchAreaDefinitions.ts',
    ],
  },
  {
    canonical_location_id: 'city:13',
    level: 'city',
    label: 'Pretoria',
    authority_class: 'contract_fixture',
    production_row_verified: false,
    evidence: ['server/services/__tests__/searchAreaAuthority.test.ts'],
  },
  {
    canonical_location_id: 'suburb:34',
    level: 'suburb',
    label: 'Sandton',
    authority_class: 'contract_fixture_or_preview',
    production_row_verified: false,
    evidence: [
      'server/services/searchAreaDefinitions.ts',
      'server/services/__tests__/searchAreaAuthority.test.ts',
      'server/services/__tests__/searchAreaQueryIntegration.test.ts',
    ],
  },
];

const SEMANTIC_PROJECTION_RULES = {
  province: {
    runtimeSearchScopeKind: 'province',
    rationale: 'Factual province identities project directly to province search scope.',
  },
  city: {
    runtimeSearchScopeKind: 'metro_city',
    rationale: 'Factual city identities project to executable metro-city search scope.',
  },
  town: {
    runtimeSearchScopeKind: 'metro_city',
    rationale:
      'An accepted factual town is treated as an independently searchable city-style scope; it is not relabelled as a suburb.',
  },
  suburb: {
    runtimeSearchScopeKind: 'locality',
    rationale: 'Factual suburb identities project to locality search scope.',
  },
  locality: {
    runtimeSearchScopeKind: 'locality',
    rationale: 'Factual locality identities project to locality search scope.',
  },
  neighbourhood: {
    runtimeSearchScopeKind: 'locality',
    rationale:
      'An accepted factual neighbourhood projects to locality search scope without changing its factual type.',
  },
};

const UNSUPPORTED_FACTUAL_TYPES = new Set([
  'district_municipality',
  'local_municipality',
  'township',
  'village',
  'estate/residential_development_candidate',
  'other',
]);

const OUTPUT_NAMES = {
  inventory: 'gauteng_runtime_geography_inventory_v0.1.json',
  mapping: 'gauteng_factual_runtime_mapping_v0.1.jsonl',
  referenceProjection: 'gauteng_runtime_reference_projection_v0.1.json',
  conflicts: 'gauteng_factual_runtime_conflicts_v0.1.json',
  compatibility: 'gauteng_search_area_runtime_compatibility_v0.1.json',
  gaps: 'gauteng_runtime_geography_gaps_v0.1.json',
  summary: 'gauteng_canonical_runtime_convergence_summary_v0.1.md',
};

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readJsonl(relativePath) {
  return fs
    .readFileSync(path.join(ROOT, relativePath), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function writeJson(name, value) {
  fs.writeFileSync(
    path.join(OUTPUT_DIRECTORY, name),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}

function writeJsonl(name, values) {
  fs.writeFileSync(
    path.join(OUTPUT_DIRECTORY, name),
    `${values.map(value => JSON.stringify(value)).join('\n')}\n`,
    'utf8',
  );
}

function countProjectionStatuses(rows) {
  return rows.reduce(
    (counts, row) => {
      counts[row.projection_status] = (counts[row.projection_status] || 0) + 1;
      return counts;
    },
    {
      projection_ready: 0,
      ambiguous_projection: 0,
      unsupported_search_scope: 0,
      factual_geography_blocker: 0,
      other_material_blocker: 0,
    },
  );
}

function countReferenceStatuses(rows) {
  return rows.reduce(
    (counts, row) => {
      if (row.runtime_reference_status) {
        counts[row.runtime_reference_status] =
          (counts[row.runtime_reference_status] || 0) + 1;
      }
      return counts;
    },
    { existing_reference_data: 0, reference_data_expansion_required: 0 },
  );
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function buildEvidenceIndex(evidenceRows) {
  const byId = new Map();
  for (const row of evidenceRows) {
    if (!row.canonical_location_id) continue;
    const current = byId.get(row.canonical_location_id) ?? {
      administrative_context_names: new Set(),
      evidence_references: [],
      canonical_resolution_states: new Set(),
      confidence: new Set(),
    };
    for (const contextName of row.administrative_context_names ?? []) {
      current.administrative_context_names.add(contextName);
    }
    current.evidence_references.push(
      `${INPUTS.membershipEvidence}#${row.membership_assertion_id ?? row.canonical_location_id}`,
    );
    if (row.canonical_resolution_state) {
      current.canonical_resolution_states.add(row.canonical_resolution_state);
    }
    if (row.confidence) current.confidence.add(row.confidence);
    byId.set(row.canonical_location_id, current);
  }
  return byId;
}

function runtimeParentForContexts(contextNames) {
  if (contextNames.includes('City of Johannesburg')) {
    return {
      naturalKey: 'gauteng/johannesburg',
      contextKey: 'johannesburg',
      executable: true,
      resolution: 'administrative_context_to_known_metro',
    };
  }
  if (contextNames.includes('City of Tshwane')) {
    return {
      naturalKey: 'gauteng/pretoria',
      contextKey: 'pretoria',
      executable: true,
      resolution: 'administrative_context_to_known_metro',
    };
  }
  if (contextNames.includes('Ekurhuleni')) {
    return {
      naturalKey: null,
      contextKey: 'ekurhuleni',
      executable: false,
      resolution: 'administrative_context_only_do_not_coerce_municipality_to_city',
    };
  }
  return null;
}

function projectionRuleFor(factualType) {
  if (UNSUPPORTED_FACTUAL_TYPES.has(factualType)) return null;
  return SEMANTIC_PROJECTION_RULES[factualType] ?? null;
}

function buildSemanticProjection(record, evidence, runtimeReferenceKeys) {
  const contexts = uniqueSorted([...evidence.administrative_context_names]);
  const reconciliation = RECONCILED_CONTEXTS.get(record.canonical_location_id);
  const evidenceProvenance = reconciliation?.evidenceProvenance ?? [];
  const searchAreaIds = uniqueSorted(
    record.search_area_ids ?? (record.search_area_id ? [record.search_area_id] : []),
  );
  const searchAreaNames = uniqueSorted(
    record.search_area_names ??
      (record.search_area_preferred_name ? [record.search_area_preferred_name] : []),
  );
  const evidenceReferences = uniqueSorted([
    `${record.source_only ? INPUTS.membershipEvidence : INPUTS.activeMemberships}#${record.canonical_location_id}`,
    ...evidence.evidence_references,
    ...evidenceProvenance.map(item => item.source_url),
    'shared/searchScope.ts#SearchScopeKind',
    'server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts#reference-projection-boundary',
  ]);
  const factualContext = {
    province_slug: 'gauteng',
    administrative_context_names: contexts,
    ...(reconciliation?.hierarchyState
      ? { hierarchy_state: reconciliation.hierarchyState }
      : { hierarchy_state: 'accepted_administrative_context; parent_edge_not_in_candidate_artifact' }),
    ...(reconciliation?.acceptedContextLocationId
      ? { accepted_context_location_id: reconciliation.acceptedContextLocationId }
      : {}),
    ...(reconciliation?.acceptedContextLocationName
      ? { accepted_context_location_name: reconciliation.acceptedContextLocationName }
      : {}),
    ...(reconciliation?.acceptedContextRelationship
      ? { accepted_context_relationship: reconciliation.acceptedContextRelationship }
      : {}),
  };
  const rule = projectionRuleFor(record.factual_type);
  if (!rule) {
    return {
      schema_version: '0.1',
      factual_location_id: record.canonical_location_id,
      factual_preferred_name: record.factual_location_preferred_name,
      factual_type: record.factual_type,
      factual_context: factualContext,
      search_area_ids: searchAreaIds,
      search_area_names: searchAreaNames,
      projection_status: 'unsupported_search_scope',
      runtime_reference_status: null,
      runtime_search_scope_kind: null,
      runtime_natural_key: null,
      runtime_parent_natural_key: null,
      environment_runtime_compatibility_ids: [],
      environment_runtime_ids_are_durable_authority: false,
      evidence_references: evidenceReferences,
      ...(evidenceProvenance.length > 0 ? { evidence_provenance: evidenceProvenance } : {}),
      decision_reason:
        `Factual type ${record.factual_type} has no approved executable Search scope. It remains factual and is not relabelled as a suburb or city.`,
      name_only_match: false,
    };
  }

  if (reconciliation?.disposition && reconciliation.disposition !== 'projection_ready') {
    return {
      schema_version: '0.1',
      factual_location_id: record.canonical_location_id,
      factual_preferred_name: record.factual_location_preferred_name,
      factual_type: record.factual_type,
      factual_context: factualContext,
      search_area_ids: searchAreaIds,
      search_area_names: searchAreaNames,
      projection_status: reconciliation.disposition,
      runtime_reference_status: null,
      runtime_search_scope_kind: rule.runtimeSearchScopeKind,
      runtime_natural_key: null,
      runtime_parent_natural_key: null,
      environment_runtime_compatibility_ids: [],
      environment_runtime_ids_are_durable_authority: false,
      evidence_references: evidenceReferences,
      evidence_provenance: evidenceProvenance,
      ...(reconciliation?.reconciliationDisposition
        ? {
            reconciliation_disposition: reconciliationDispositionForArtifact(
              reconciliation.reconciliationDisposition,
            ),
          }
        : {}),
      decision_reason: reconciliation.decisionReason,
      name_only_match: false,
    };
  }

  const slug = slugify(record.factual_location_preferred_name);
  const parent = reconciliation?.runtimeParentNaturalKey
    ? {
        naturalKey: reconciliation.runtimeParentNaturalKey,
        executable: true,
        resolution: reconciliation.runtimeParentResolution,
      }
    : runtimeParentForContexts(contexts);
  let runtimeNaturalKey;
  let runtimeParentNaturalKey;
  let parentResolution;
  if (rule.runtimeSearchScopeKind === 'province') {
    runtimeNaturalKey = 'gauteng';
    runtimeParentNaturalKey = null;
    parentResolution = 'province_root';
  } else if (rule.runtimeSearchScopeKind === 'metro_city') {
    runtimeNaturalKey = `gauteng/${slug}`;
    runtimeParentNaturalKey = 'gauteng';
    parentResolution = 'province_root_city_style_scope';
  } else if (parent?.executable && parent.naturalKey) {
    runtimeNaturalKey = `${parent.naturalKey}/${slug}`;
    runtimeParentNaturalKey = parent.naturalKey;
    parentResolution = parent.resolution;
  } else {
    return {
      schema_version: '0.1',
      factual_location_id: record.canonical_location_id,
      factual_preferred_name: record.factual_location_preferred_name,
      factual_type: record.factual_type,
      factual_context: {
        ...factualContext,
        hierarchy_state: parent
          ? 'accepted_administrative_context; executable_parent_not_established'
          : 'missing_administrative_context',
      },
      search_area_ids: searchAreaIds,
      search_area_names: searchAreaNames,
      projection_status: 'other_material_blocker',
      runtime_reference_status: null,
      runtime_search_scope_kind: rule.runtimeSearchScopeKind,
      runtime_natural_key: null,
      runtime_parent_natural_key: null,
      environment_runtime_compatibility_ids: [],
      environment_runtime_ids_are_durable_authority: false,
      evidence_references: evidenceReferences,
      ...(evidenceProvenance.length > 0 ? { evidence_provenance: evidenceProvenance } : {}),
      decision_reason:
        parent
          ? 'A locality scope rule exists, but the accepted artifact provides only an Ekurhuleni administrative context and no executable city parent. Do not coerce the municipality to a city or create a synthetic runtime parent; retain this explicit blocker until an accepted factual hierarchy edge is available.'
          : 'A semantic scope rule exists, but no accepted administrative context is available to construct a deterministic hierarchy key.',
      name_only_match: false,
    };
  }

  const existingReferenceData = runtimeReferenceKeys.has(runtimeNaturalKey);
  const environmentRuntimeCompatibilityIds =
    runtimeNaturalKey === 'gauteng/johannesburg/sandton' ? ['suburb:34'] : [];
  return {
    schema_version: '0.1',
    factual_location_id: record.canonical_location_id,
    factual_preferred_name: record.factual_location_preferred_name,
    factual_type: record.factual_type,
    factual_context: factualContext,
    search_area_ids: searchAreaIds,
    search_area_names: searchAreaNames,
    runtime_search_scope_kind: rule.runtimeSearchScopeKind,
    runtime_natural_key: runtimeNaturalKey,
    runtime_parent_natural_key: runtimeParentNaturalKey,
    runtime_parent_resolution: parentResolution,
    ...(reconciliation?.acceptedContextRelationship
      ? { runtime_parent_relationship: reconciliation.acceptedContextRelationship }
      : {}),
    projection_status: 'projection_ready',
    runtime_reference_status: existingReferenceData
      ? 'existing_reference_data'
      : 'reference_data_expansion_required',
    existing_runtime_reference_keys: existingReferenceData ? [runtimeNaturalKey] : [],
    environment_runtime_compatibility_ids: environmentRuntimeCompatibilityIds,
    environment_runtime_ids_are_durable_authority: false,
    evidence_references: uniqueSorted([
      ...evidenceReferences,
      ...(environmentRuntimeCompatibilityIds.length > 0
        ? [
            'server/services/searchAreaDefinitions.ts#SANDTON_SEARCH_AREA_PREVIEW',
            'server/services/__tests__/searchAreaAuthority.test.ts#canonicalLocations.suburb:34',
          ]
        : []),
    ]),
    ...(evidenceProvenance.length > 0 ? { evidence_provenance: evidenceProvenance } : {}),
    decision_reason:
      reconciliation?.decisionReason ??
      `${rule.rationale} Stable runtime key is ${runtimeNaturalKey}. Current database row IDs, if observed, are environment-specific handles only.`,
    name_only_match: false,
  };
}

function buildUniqueProjections(
  memberships,
  evidenceIndex,
  runtimeReferenceKeys,
  sourceOnlyRecords = [],
) {
  const byId = new Map();
  for (const row of memberships) {
    const current = byId.get(row.canonical_location_id);
    if (current) {
      if (
        current.factual_preferred_name !== row.factual_location_preferred_name ||
        current.factual_type !== row.factual_type
      ) {
        throw new Error(`Factual identity ${row.canonical_location_id} changed across memberships.`);
      }
      current.search_area_ids.push(row.search_area_id);
      current.search_area_names.push(row.search_area_preferred_name);
      continue;
    }

    const evidence = evidenceIndex.get(row.canonical_location_id);
    if (!evidence) {
      throw new Error(`No accepted evidence context for ${row.canonical_location_id}.`);
    }
    byId.set(
      row.canonical_location_id,
      buildSemanticProjection(
        {
          ...row,
          search_area_ids: [row.search_area_id],
          search_area_names: [row.search_area_preferred_name],
        },
        evidence,
        runtimeReferenceKeys,
      ),
    );
  }

  for (const row of sourceOnlyRecords) {
    if (byId.has(row.canonical_location_id)) {
      throw new Error(`Historical/source-only identity ${row.canonical_location_id} is still current.`);
    }
    const evidence = evidenceIndex.get(row.canonical_location_id);
    if (!evidence) {
      throw new Error(`No accepted evidence context for historical/source-only ${row.canonical_location_id}.`);
    }
    byId.set(row.canonical_location_id, buildSemanticProjection(row, evidence, runtimeReferenceKeys));
  }

  return Array.from(byId.values())
    .map(row => ({
      ...row,
      search_area_ids: [...new Set(row.search_area_ids)].sort(),
      search_area_names: [...new Set(row.search_area_names)].sort(),
    }))
    .sort((left, right) => left.factual_location_id.localeCompare(right.factual_location_id));
}

function buildCompatibilityRows(memberships, projections) {
  const projectionById = new Map(
    projections.map(projection => [projection.factual_location_id, projection]),
  );
  return memberships.map(row => {
    const projection = projectionById.get(row.canonical_location_id);
    if (!projection) throw new Error(`No projection disposition for ${row.canonical_location_id}.`);
    return {
      search_area_id: row.search_area_id,
      search_area_preferred_name: row.search_area_preferred_name,
      factual_location_id: row.canonical_location_id,
      factual_location_preferred_name: row.factual_location_preferred_name,
      factual_type: row.factual_type,
      factual_gap_candidate: row.factual_gap_candidate,
      kyalami_policy_blocked: row.kyalami_policy_blocked,
      projection_status: projection.projection_status,
      runtime_search_scope_kind: projection.runtime_search_scope_kind,
      runtime_natural_key: projection.runtime_natural_key,
      runtime_parent_natural_key: projection.runtime_parent_natural_key,
      runtime_reference_status: projection.runtime_reference_status,
      reconciliation_disposition: projection.reconciliation_disposition ?? null,
      existing_runtime_reference_keys: projection.existing_runtime_reference_keys ?? [],
      environment_runtime_compatibility_ids:
        projection.environment_runtime_compatibility_ids ?? [],
      environment_runtime_ids_are_durable_authority:
        projection.environment_runtime_ids_are_durable_authority ?? false,
      safe_to_resolve_semantically: projection.projection_status === 'projection_ready',
      reference_data_expansion_required:
        projection.runtime_reference_status === 'reference_data_expansion_required',
      blocker:
        projection.projection_status === 'projection_ready'
          ? null
          : {
              code: projection.projection_status,
              reason: projection.decision_reason,
            },
      evidence_references: projection.evidence_references,
    };
  });
}

function runtimeScopeKindForReferenceLevel(level) {
  if (level === 'province') return 'province';
  if (level === 'city') return 'metro_city';
  return 'locality';
}

function buildRuntimeReferenceProjection(projections) {
  const rows = new Map();

  for (const referenceRow of RUNTIME_REFERENCE_ROWS) {
    rows.set(referenceRow.reference_key, {
      runtime_search_scope_kind: runtimeScopeKindForReferenceLevel(referenceRow.level),
      runtime_storage_level: referenceRow.level,
      runtime_natural_key: referenceRow.reference_key,
      runtime_parent_natural_key: referenceRow.parent_reference_key ?? null,
      name: referenceRow.name,
      slug: referenceRow.reference_key.split('/').at(-1),
      ...(referenceRow.code ? { code: referenceRow.code } : {}),
      ...(referenceRow.latitude !== undefined ? { latitude: referenceRow.latitude } : {}),
      ...(referenceRow.longitude !== undefined ? { longitude: referenceRow.longitude } : {}),
      ...(referenceRow.postal_code ? { postal_code: referenceRow.postal_code } : {}),
      factual_location_ids: [],
      factual_preferred_names: [],
      factual_types: [],
    });
  }

  for (const projection of projections) {
    if (projection.projection_status !== 'projection_ready') continue;

    const runtimeNaturalKey = projection.runtime_natural_key;
    const runtimeScopeKind = projection.runtime_search_scope_kind;
    if (!runtimeNaturalKey || !runtimeScopeKind) {
      throw new Error(`Ready projection ${projection.factual_location_id} is incomplete.`);
    }

    const runtimeStorageLevel =
      runtimeScopeKind === 'province'
        ? 'province'
        : runtimeScopeKind === 'metro_city'
          ? 'city'
          : 'suburb';
    const existing = rows.get(runtimeNaturalKey);
    const row = existing ?? {
      runtime_search_scope_kind: runtimeScopeKind,
      runtime_storage_level: runtimeStorageLevel,
      runtime_natural_key: runtimeNaturalKey,
      runtime_parent_natural_key: projection.runtime_parent_natural_key ?? null,
      name: projection.factual_preferred_name,
      slug: runtimeNaturalKey.split('/').at(-1),
      factual_location_ids: [],
      factual_preferred_names: [],
      factual_types: [],
    };

    if (
      row.runtime_search_scope_kind !== runtimeScopeKind ||
      row.runtime_storage_level !== runtimeStorageLevel ||
      row.name !== projection.factual_preferred_name
    ) {
      throw new Error(`Conflicting governed runtime reference row ${runtimeNaturalKey}.`);
    }

    row.factual_location_ids.push(projection.factual_location_id);
    row.factual_preferred_names.push(projection.factual_preferred_name);
    row.factual_types.push(projection.factual_type);
    rows.set(runtimeNaturalKey, row);
  }

  return {
    schema_version: '0.1',
    projection_version: 'gauteng-runtime-reference-projection-v0.1',
    source_factual_projection_artifact:
      'data/gauteng-canonical-runtime-convergence-v0.1/output/gauteng_factual_runtime_mapping_v0.1.jsonl',
    checkpoint: CHECKPOINTS,
    numeric_runtime_ids_are_durable_authority: false,
    rows: Array.from(rows.values())
      .map(row => ({
        ...row,
        factual_location_ids: uniqueSorted(row.factual_location_ids),
        factual_preferred_names: uniqueSorted(row.factual_preferred_names),
        factual_types: uniqueSorted(row.factual_types),
      }))
      .sort((left, right) => left.runtime_natural_key.localeCompare(right.runtime_natural_key)),
  };
}

function buildConflicts(
  projections,
  factualSummary,
  identityCollisions,
  referenceRows,
  currentMembershipCount,
) {
  const projectionCounts = countProjectionStatuses(projections);
  const referenceCounts = countReferenceStatuses(
    projections.filter(projection => projection.projection_status === 'projection_ready'),
  );
  const sameNameCollisions = factualSummary.duplicate_safety.examples.map(example => ({
    normalized_name: example.normalized_name,
    factual_location_ids: example.canonical_location_ids,
    decision: 'preserve_separate_factual_identities',
  }));

  return {
    schema_version: '0.1',
    checkpoint: CHECKPOINTS,
    projection_scope: `current factual identities across ${currentMembershipCount} memberships plus retained historical/source identities`,
    semantic_projection_counts: projectionCounts,
    runtime_reference_counts: referenceCounts,
    numeric_ids_are_not_durable_authority: true,
    conflicts: [],
    legacy_runtime_observations: [
      {
        observation_type: 'historical_runtime_type_disagrees_with_factual_type',
        factual_location_id: 'pl-gp-v01-3462bd075a8d155a3b22',
        factual_name: 'Randburg',
        factual_type: 'city',
        historical_runtime_representation: {
          runtime_level: 'suburb',
          runtime_parent_label: 'Johannesburg',
          source: 'migrations/create-location-hierarchy.sql',
          authority_state: 'historical_non_canonical_source',
        },
        resolution: 'factual_type_wins_for_semantic_projection',
        action:
          'project as metro_city using a stable natural key; never use the historical suburb sample as a durable mapping',
      },
      {
        observation_type: 'current_reference_catalogue_is_small',
        reference_rows: referenceRows.length,
        current_reference_authority: 'canonical-geography-v2',
        resolution: 'expand_through_governed_projection_before_runtime_activation',
        action:
          'treat absent rows as runtime reference-data expansion work, not factual-geography failures',
      },
    ],
    identity_collisions: identityCollisions.collisions.map(collision => ({
      collision_type: collision.collision_type,
      search_area_id: collision.search_area_id,
      search_area_preferred_name: collision.search_area_preferred_name,
      factual_location_ids: collision.factual_canonical_ids.map(item => item.canonical_location_id),
      factual_preferred_names: collision.factual_canonical_ids.map(item => item.preferred_name),
      identities_are_distinct: collision.identities_are_distinct,
      disambiguation_required: collision.disambiguation_required,
      resolution: 'preserve_separate_authorities',
      action: 'do_not_merge_factual_and_search_area_identities_or_inherit_factual_boundaries',
      evidence_source: INPUTS.searchAreaIdentityCollisions,
    })),
    ambiguities: [
      {
        ambiguity_type: 'same_name_factual_identities',
        normalized_name: 'midrand',
        factual_location_ids: [
          'pl-gp-v01-0d7688adb9c7af392007',
          'pl-gp-v01-455d2715587edce120f0',
        ],
        resolution: 'historical_source_identity_only_for_ekurhuleni_record',
        action:
          'retain the Ekurhuleni-coordinate source provenance without current runtime mapping; do not merge into Johannesburg Midrand by label',
      },
      {
        ambiguity_type: 'same_name_factual_identities',
        normalized_name: 'sandton',
        factual_location_ids: [
          'pl-gp-v01-418038409a1c0a00d9bc',
          'pl-gp-v01-43d109a4091bf9c2044c',
        ],
        resolution: 'canonical_id_selected_by_accepted_factual_checkpoint',
        action: 'map only the accepted factual Sandton identity; retain the candidate-only identity outside the bridge',
      },
      ...sameNameCollisions.filter(example =>
        ['johannesburg north', 'centurion', 'east rand'].includes(example.normalized_name),
      ),
    ],
    policy_blockers: [
      {
        topic: 'Kyalami/Khayalami',
        factual_identity: factualSummary.kyalami_khayalami.canonical_location_id,
        candidate_identity:
          factualSummary.kyalami_khayalami.existing_candidate_interpretations[0].candidate_location_id,
        runtime_mapping: 'blocked',
        rule: 'one eventual factual identity; consumer name Kyalami; official name Khayalami; no runtime or Search Area workaround',
        evidence_source:
          'data/gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_kyalami_evidence_v0.1.json',
      },
      {
        topic: 'name_only_mapping',
        rule: 'never map a factual identity to a runtime row solely because visible labels match',
      },
    ],
  };
}

function buildInventory(factualSummary, definitions) {
  return {
    schema_version: '0.1',
    artifact: 'gauteng-runtime-geography-inventory-v0.1',
    identity_owner: 'Property Listify',
    checkpoint: CHECKPOINTS,
    runtime_identity_contract: {
      levels: ['province', 'city', 'suburb'],
      emitted_format: 'province:<positive integer> | city:<positive integer> | suburb:<positive integer>',
      read_compatible_format: 'colon and hyphen separators are accepted; new output uses colon',
      origin: {
        tables: ['provinces', 'cities', 'suburbs'],
        primary_key: 'auto-increment database row id',
        hierarchy: 'cities.provinceId and suburbs.cityId foreign keys',
        durability: 'database-row compatibility handle, not a durable product geography identity',
        cross_environment_mapping: 'forbidden; resolve from stable runtime natural key per target environment',
      },
      public_role: [
        'Search locationId/locationIds query parameters',
        'canonical location read models and Search Area preview contracts',
        'listing and public-property foreign-key fields',
      ],
      non_roles: [
        'not a factual catalogue identity',
        'not a source/provider place ID',
        'not safe to regenerate from visible names',
      ],
    },
    authority_surfaces: [
      {
        path: INPUTS.runtimeAuthority,
        role: 'parse/encode runtime canonical identity; no database lookup',
      },
      {
        path: INPUTS.locationSchema,
        role: 'province/city/suburb row definitions and provider FK targets',
      },
      {
        path: INPUTS.canonicalGeographyAdapter,
        role: 'current small acceptance/reference fixture preparation by stable slugs and hierarchy',
      },
      {
        path: INPUTS.membershipEvidence,
        role: 'accepted factual administrative context and membership evidence used by semantic projection',
      },
      {
        path: INPUTS.locationResolver,
        role: 'database-backed ID/slug resolution and hierarchy validation',
      },
      {
        path: INPUTS.searchAreaAuthority,
        role: 'server-owned Search Area registry and runtime resolution',
      },
      {
        path: INPUTS.runtimeSearchAreaDefinitions,
        role: 'non-active Sandton preview definition using existing numeric handles',
      },
      {
        path: INPUTS.searchAreaIdentityCollisions,
        role: 'accepted factual/Search Area same-name collision evidence; identities remain separate',
      },
      {
        path: INPUTS.searchAreaQueryBoundary,
        role: 'converts resolved canonical suburb IDs into executable Search predicates',
      },
      {
        path: INPUTS.publicSearchValidation,
        role: 'fails closed on malformed canonical IDs and mixed levels',
      },
      {
        path: INPUTS.geographyHandoff,
        role: 'serializes canonical runtime IDs into Buy/Rent search intent URLs',
      },
      {
        path: INPUTS.listingLocationResolver,
        role: 'resolves/persists provinceId/cityId/suburbId for listing location evidence',
      },
      {
        path: INPUTS.listingSchema,
        role: 'listing and public properties persist numeric geography foreign keys alongside display text',
      },
    ],
    current_reference_data: {
      authority: 'canonical-geography-v2',
      approved_reference_rows: { provinces: 9, cities: 10, suburbs: 10 },
      gauteng_rows_reviewed: RUNTIME_REFERENCE_ROWS,
      numeric_ids: 'not available from static authority files; database verification was not run',
      legacy_seed_note:
        'migrations/create-location-hierarchy.sql contains historical sample rows and implicit insertion order; it is not the current reference-data authority and is not used for automatic mapping',
    },
    observed_compatibility_handles: OBSERVED_RUNTIME_HANDLES,
    known_factual_context_mappings: [
      {
        factual_location_id: 'pl-gp-v01-482952abc84b2eccf7d2',
        factual_name: 'Johannesburg',
        factual_type: 'city',
        runtime_scope_kind: 'metro_city',
        runtime_natural_key: 'gauteng/johannesburg',
        environment_runtime_compatibility_id: 'city:12',
        status: 'semantic_projection_ready_environment_handle_observed',
        database_row_verified: false,
        evidence: [
          'data/gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_summary_v0.1.json#required_property_search_probes[0]',
          'server/services/__tests__/searchAreaAuthority.test.ts#canonicalLocations.city:12',
        ],
      },
      {
        factual_location_id: 'pl-gp-v01-d55f7cb52192bba95e88',
        factual_name: 'Pretoria',
        factual_type: 'city',
        runtime_scope_kind: 'metro_city',
        runtime_natural_key: 'gauteng/pretoria',
        environment_runtime_compatibility_id: 'city:13',
        status: 'semantic_projection_ready_environment_handle_observed',
        database_row_verified: false,
        evidence: [
          'data/gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_summary_v0.1.json#required_property_search_probes[1]',
          'server/services/__tests__/searchAreaAuthority.test.ts#canonicalLocations.city:13',
        ],
      },
      {
        factual_location_id: 'pl-gp-v01-418038409a1c0a00d9bc',
        factual_name: 'Sandton',
        factual_type: 'locality',
        runtime_scope_kind: 'locality',
        runtime_natural_key: 'gauteng/johannesburg/sandton',
        environment_runtime_compatibility_id: 'suburb:34',
        status: 'semantic_projection_ready_environment_handle_observed',
        database_row_verified: false,
        evidence: [
          'data/gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_summary_v0.1.json#required_property_search_probes[2]',
          'server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts#SUBURBS.Sandton',
          'server/services/searchAreaDefinitions.ts#SANDTON_SEARCH_AREA_PREVIEW',
          'server/services/__tests__/searchAreaAuthority.test.ts#canonicalLocations.suburb:34',
        ],
      },
    ],
    factual_catalogue_context: {
      canonical_status: factualSummary.canonical_status,
      identity_owner: factualSummary.identity_owner,
      total_factual_canonical_identities: factualSummary.canonical_result.total_factual_canonical_identities,
      accepted_search_areas: definitions.search_areas.map(area => ({
        search_area_id: area.search_area_id,
        name: area.preferred_name,
        lifecycle_state: area.lifecycle_state,
        production_activation: area.production_activation,
      })),
    },
    conclusion:
      'Numeric runtime IDs remain compatibility handles. The durable bridge is factual-ID-first, explicit, evidence-backed and resolved through stable natural keys per environment.',
    runtime_projection_contract: {
      scope_kinds: ['province', 'metro_city', 'locality'],
      factual_type_is_preserved: true,
      natural_key_examples: [
        'gauteng',
        'gauteng/benoni',
        'gauteng/johannesburg/bryanston',
        'gauteng/pretoria/centurion',
      ],
      environment_numeric_ids_optional: true,
      environment_numeric_ids_are_durable_authority: false,
      municipality_to_city_coercion: false,
      locality_requires_executable_parent_hierarchy: true,
      current_fixture_role: 'acceptance/reference subset only; governed expansion required for accepted Search Area membership coverage',
    },
  };
}

function buildGaps() {
  return {
    schema_version: '0.1',
    checkpoint: CHECKPOINTS,
    authority_rule:
      'A runtime row absent from the accepted factual projection is a runtime_factual_geography_gap; it is not promoted by label matching.',
    comparison_scope: {
      runtime_authority: 'canonical-geography-v2 Gauteng reference rows',
      factual_artifacts_available:
        'accepted factual summary/probes and accepted Search Area membership records; full canonical geography JSONL is not present in the accepted candidate patch',
      database_verification: 'not run; no shared/disposable database was created or mutated',
    },
    counts: {
      runtime_reference_rows_reviewed: RUNTIME_REFERENCE_ROWS.length,
      runtime_factual_geography_gaps: 1,
      confirmed_from_full_projection: 0,
      provisional_checkpoint_artifact_gaps: 1,
    },
    gaps: [
      {
        gap_type: 'runtime_factual_geography_gap',
        status: 'not_observable_from_accepted_artifacts',
        runtime_reference_key: 'gauteng/pretoria/hatfield',
        runtime_level: 'suburb',
        runtime_label: 'Hatfield',
        runtime_parent_reference_key: 'gauteng/pretoria',
        runtime_source: `${INPUTS.canonicalGeographyAdapter}#SUBURBS.Hatfield`,
        factual_location_id: null,
        factual_projection_presence: 'not_found_in_accepted_summary_probe_or_active_memberships',
        candidate_only_status: 'not_determined_without_full_factual_canonical_jsonl',
        reason:
          'Hatfield is an approved current runtime reference row but no accepted factual Hatfield identity appears in the summary/probe or Search Area artifacts available to this worktree. The full factual canonical JSONL was not included in the accepted candidate patch, so this remains a reconciliation queue item rather than a confirmed factual absence or candidate-only decision.',
        action: 'feed back to factual enrichment/reconciliation; do not promote or map by name',
      },
    ],
    excluded_non_authorities: [
      {
        source: 'migrations/create-location-hierarchy.sql',
        reason: 'historical/non-canonical sample rows are not treated as current runtime authority or factual gaps',
      },
    ],
  };
}

function buildSummary({ projections, compatibilityRows, conflicts, gaps }) {
  const uniqueProjectionCounts = countProjectionStatuses(projections);
  const memberProjectionCounts = countProjectionStatuses(compatibilityRows);
  const referenceCounts = countReferenceStatuses(compatibilityRows);
  const blockedRows = compatibilityRows.filter(
    row => row.projection_status !== 'projection_ready',
  );
  const areas = new Map();
  for (const row of compatibilityRows) {
    const area = areas.get(row.search_area_id) ?? {
      id: row.search_area_id,
      name: row.search_area_preferred_name,
      total: 0,
      projection_ready: 0,
      existing_reference_data: 0,
      reference_data_expansion_required: 0,
      ambiguous_projection: 0,
      unsupported_search_scope: 0,
      factual_geography_blocker: 0,
      other_material_blocker: 0,
    };
    area.total += 1;
    area[row.projection_status] += 1;
    if (row.runtime_reference_status) area[row.runtime_reference_status] += 1;
    areas.set(row.search_area_id, area);
  }
  const eastRandMembers = compatibilityRows.filter(
    row => row.search_area_preferred_name === 'East Rand',
  );
  const boundedReconciliationRows = BOUNDED_FIVE_FACTUAL_IDS.map(factualLocationId => {
    const row = projections.find(projection => projection.factual_location_id === factualLocationId);
    if (!row) throw new Error(`Missing bounded reconciliation row ${factualLocationId}.`);
    return row;
  });
  const boundedReadyCount = boundedReconciliationRows.filter(
    row => row.projection_status === 'projection_ready',
  ).length;
  const boundedBlockedCount = boundedReconciliationRows.length - boundedReadyCount;

  return `# Gauteng Canonical Runtime Convergence v0.1

## Decision

The bridge is factual-ID-first and semantic-projection-first. pl-gp-v01-* remains the durable factual identity. A stable runtime natural key describes the executable Search scope; province:<id>, city:<id> and suburb:<id> are environment-specific database handles resolved only after the projection is materialized in that environment. No Search Area was activated and no listing, URL, schema or database data was changed.

The bounded runtime projection implementation remains safe to review: **YES**. The founder-authorized current boundary is ${compatibilityRows.length} memberships, all of which are projection-ready. Search Area activation remains **NO** because activation is a separate approval boundary.

The previous 62-record evidence set included one historical/source-only Ekurhuleni-context Midrand identity. It remains preserved in the factual mapping and source provenance, but it is retired from current Search Area membership and has no runtime natural key. The bounded slice retains ${boundedReadyCount} projection-ready current reconciliations and ${boundedBlockedCount} historical/source-only record. The resulting current state is ${memberProjectionCounts.projection_ready}/${compatibilityRows.length} projection-ready. One ready membership already matches the small canonical-geography-v2 reference fixture; the other ${referenceCounts.reference_data_expansion_required} ready memberships require governed runtime reference-data expansion. This is reference-data work, not evidence that those factual identities are unmapped.

## Runtime identity conclusion

- shared/locationAuthority.ts owns parsing/encoding of province:<positive integer>, city:<positive integer> and suburb:<positive integer>.
- The numeric value originates from the auto-increment primary key of a target database row. It is an environment-specific runtime handle, not a durable Property Listify geography identity.
- server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts currently prepares a deliberately small reference fixture by stable slug and hierarchy; it does not create cross-environment numeric mappings.
- The durable bridge is factual ID -> factual type/context -> runtime Search scope -> stable natural key -> environment row resolution.
- Existing URLs, listings, persisted numeric fields and public projections remain unchanged.

## Semantic projection counts

Unique factual identities represented by the ${compatibilityRows.length} current memberships plus retained historical/source identities: **${projections.length}**.

| Status | Unique factual identities | ${compatibilityRows.length} current memberships |
| --- | ---: | ---: |
| projection_ready | ${uniqueProjectionCounts.projection_ready} | ${memberProjectionCounts.projection_ready} |
| ambiguous_projection | ${uniqueProjectionCounts.ambiguous_projection} | ${memberProjectionCounts.ambiguous_projection} |
| unsupported_search_scope | ${uniqueProjectionCounts.unsupported_search_scope} | ${memberProjectionCounts.unsupported_search_scope} |
| factual_geography_blocker | ${uniqueProjectionCounts.factual_geography_blocker} | ${memberProjectionCounts.factual_geography_blocker} |
| other_material_blocker | ${uniqueProjectionCounts.other_material_blocker} | ${memberProjectionCounts.other_material_blocker} |

## Runtime reference-data disposition

| Disposition | ${compatibilityRows.length} current memberships |
| --- | ---: |
| existing_reference_data | ${referenceCounts.existing_reference_data} |
| reference_data_expansion_required | ${referenceCounts.reference_data_expansion_required} |

Sandton (pl-gp-v01-418038409a1c0a00d9bc) is the only current fixture match, using natural key gauteng/johannesburg/sandton. The observed suburb:34 value is retained only as an environment-specific contract observation and is never emitted as durable mapping authority.

Randburg remains factual type city and projects to metro_city with natural key gauteng/randburg. The historical suburb sample is recorded as a legacy observation, not a semantic conflict.

## Same-name identity collisions

${conflicts.identity_collisions
  .map(
    collision =>
      `- ${collision.search_area_preferred_name} Search Area (${collision.search_area_id}) remains distinct from factual ${collision.factual_preferred_names.join(', ')} (${collision.factual_location_ids.join(', ')}); no merge or factual-boundary inheritance is allowed.`,
  )
  .join('\n')}

## ${compatibilityRows.length}-member current Search Area compatibility

| Search Area | Members | Semantic ready | Existing row | Expansion required | Ambiguous | Unsupported | Factual blocker | Other |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${Array.from(areas.values())
  .sort((left, right) => left.id.localeCompare(right.id))
  .map(
    area =>
      `| ${area.name} | ${area.total} | ${area.projection_ready} | ${area.existing_reference_data} | ${area.reference_data_expansion_required} | ${area.ambiguous_projection} | ${area.unsupported_search_scope} | ${area.factual_geography_blocker} | ${area.other_material_blocker} |`,
  )
  .join('\n')}

All ${compatibilityRows.length} current members retain their factual types. No member is converted into a suburb merely to satisfy the current legacy validator.

## Bounded five-location context reconciliation

| Factual identity | Factual type | Accepted context | Runtime scope | Stable natural key | Disposition |
| --- | --- | --- | --- | --- | --- |
${boundedReconciliationRows
  .map(
    row =>
      `| ${row.factual_preferred_name} (${row.factual_location_id}) | ${row.factual_type} | ${row.factual_context.accepted_context_location_name ?? row.factual_context.administrative_context_names.join(', ')} | ${row.runtime_search_scope_kind ?? '—'} | ${row.runtime_natural_key ?? '—'} | ${row.projection_status} |`,
  )
  .join('\n')}

Alberton is used as the explicit factual parent for Brackenhurst, Raceview and Randhart. Midstream Estate retains Ekurhuleni as its factual administrative context; Centurion is an explicitly labeled runtime market context, not a municipality-to-city rewrite. The Ekurhuleni-coordinate Midrand record remains preserved as historical/source-level provenance, is not merged into the accepted City of Johannesburg Midrand identity, is not executable, and has been retired from the current membership boundary by founder decision.

## East Rand test

The nine East Rand members are all accepted factual town identities and all receive metro_city projections: ${eastRandMembers
    .map(row => `${row.factual_location_preferred_name} -> ${row.runtime_natural_key}`)
    .join(', ')}. This is the intended multi-level contract direction; they are not suburb projections.

## Remaining material blockers

${blockedRows.length === 0
    ? 'No active membership has a semantic projection blocker.'
    : blockedRows
        .map(
          row =>
            `- ${row.search_area_preferred_name}: ${row.factual_location_preferred_name} (${row.factual_location_id}) -> ${row.projection_status}; ${row.blocker.reason}`,
        )
        .join('\n')}

## Type-model recommendation

Keep factual type and executable runtime scope as separate fields. The factual catalogue may retain province, municipality, city, town, township, suburb, neighbourhood, locality, village and estate/development-candidate types. In this accepted slice, province -> province, city/town -> metro_city, and suburb/locality/neighbourhood -> locality only where an executable parent hierarchy is accepted. These are executable scope projections, not factual type rewrites.

## Search Area authority convergence boundary

The existing server-owned SearchAreaAuthority should remain the only production registry. Its later definition shape should replace suburb-only memberCanonicalLocationIds with explicit members containing factualLocationId, scopeKind and runtimeNaturalKey. City/town and locality members may coexist and expand into an explicit OR boundary. Parent city should become optional context/parent metadata, not membership authority. The query boundary must resolve each member independently in the target environment, preserve overlap, and fail closed on an unresolved natural key. Activation is still out of scope here.

## Runtime reference-data strategy

The bounded next implementation should generate a governed reference projection from the accepted factual catalogue, keyed by stable slugs and explicit hierarchy/context. The Database Authority adapter should consume that projection and resolve target-environment numeric IDs after insertion. canonical-geography-v2 can remain the small acceptance fixture until the governed projection is accepted; it must not become a second permanent geography authority. No seed or production reference-data operation is performed here.

## Property Location Authority dependency

Property Location Authority should later consume the bridge after resolving an individual property's factual geography. It must continue to answer where a property is; this bridge answers what factual identity a runtime location refers to. No Property Location Authority files were changed.

## Geography gaps

${gaps.gaps.length} provisional runtime factual geography gap is recorded: current approved runtime reference Hatfield is not present in the accepted factual summary/probe or Search Area artifacts available here. The full factual canonical JSONL was not included in the accepted candidate patch, so this remains an unverified reconciliation queue item, not a confirmed factual absence or automatic promotion.

## Kyalami/Khayalami

The accepted rule is unchanged: one eventual factual identity, consumer name Kyalami, official/corrected name Khayalami, related family places separate, licensing gate unresolved, and no runtime mapping or Search Area workaround.

## Verification

- The accepted governed runtime geography checkpoint ${'46ef4aa6ec219f8ed2ec688ef9bad0201a09cf7e'} is incorporated by cherry-pick; the generated semantic bridge remains deterministic.
- The semantic bridge rejects invalid PL IDs, duplicate factual IDs, duplicate natural-key ownership, name-only projections and unsupported projection states; numeric IDs are optional environment observations only.
- The artifact generator is deterministic and can be rerun with node tools/gauteng-runtime-convergence/generate.mjs --check.
- Database Authority verification is performed separately through the repository-owned disposable worktree sequence; no production/shared target is used.

## Next boundary

Proceed only to the bounded implementation boundary: generated semantic projection -> Database Authority reference projection -> target-environment row resolution -> generalized existing SearchAreaAuthority. Do not activate the six Search Areas in that implementation.
`;
}

function buildArtifacts() {
  const factualSummary = readJson(INPUTS.factualSummary);
  const definitions = readJson(INPUTS.searchAreaDefinitions);
  const memberships = readJsonl(INPUTS.activeMemberships);
  const evidenceRows = readJsonl(INPUTS.membershipEvidence);
  if (memberships.length !== 61) throw new Error(`Expected 61 memberships, got ${memberships.length}.`);
  const membershipBoundaryDigest = createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, INPUTS.activeMemberships)))
    .digest('hex');
  if (membershipBoundaryDigest !== ACCEPTED_MEMBERSHIP_BOUNDARY_SHA256) {
    throw new Error(
      `Accepted 61-membership boundary changed: expected ${ACCEPTED_MEMBERSHIP_BOUNDARY_SHA256}, got ${membershipBoundaryDigest}.`,
    );
  }
  if (definitions.search_areas.length !== 6) {
    throw new Error(`Expected 6 Search Areas, got ${definitions.search_areas.length}.`);
  }

  const evidenceIndex = buildEvidenceIndex(evidenceRows);
  const runtimeReferenceKeys = new Set(RUNTIME_REFERENCE_ROWS.map(row => row.reference_key));
  const projections = buildUniqueProjections(
    memberships,
    evidenceIndex,
    runtimeReferenceKeys,
    HISTORICAL_SOURCE_ONLY_RECORDS,
  );
  const compatibilityRows = buildCompatibilityRows(memberships, projections);
  const referenceProjection = buildRuntimeReferenceProjection(projections);
  const identityCollisions = readJson(INPUTS.searchAreaIdentityCollisions);
  const conflicts = buildConflicts(
    projections,
    factualSummary,
    identityCollisions,
    RUNTIME_REFERENCE_ROWS,
    memberships.length,
  );
  const gaps = buildGaps();
  const inventory = buildInventory(factualSummary, definitions);
  const compatibility = {
    schema_version: '0.1',
    checkpoint: CHECKPOINTS,
    production_activation: false,
    accepted_search_area_count: definitions.search_areas.length,
    active_membership_count: compatibilityRows.length,
    projection_counts: countProjectionStatuses(compatibilityRows),
    runtime_reference_counts: countReferenceStatuses(compatibilityRows),
    semantic_projection_ready_members: compatibilityRows.filter(
      row => row.safe_to_resolve_semantically,
    ).length,
    reference_data_expansion_required_members: compatibilityRows.filter(
      row => row.reference_data_expansion_required,
    ).length,
    search_areas: definitions.search_areas
      .map(area => ({
        search_area_id: area.search_area_id,
        preferred_name: area.preferred_name,
        candidate_status: area.status,
        lifecycle_state: area.lifecycle_state,
        production_activation: area.production_activation,
        canonical_context: area.canonical_context,
        optional_anchor: area.optional_anchor,
        member_count: compatibilityRows.filter(row => row.search_area_id === area.search_area_id).length,
        members: compatibilityRows.filter(row => row.search_area_id === area.search_area_id),
      }))
      .sort((left, right) => left.search_area_id.localeCompare(right.search_area_id)),
    conclusion:
      'The accepted Search Area definitions have semantic runtime projections for bounded reference-data/Search Area authority implementation; retain candidate state and do not activate them.',
  };
  const summary = buildSummary({ projections, compatibilityRows, conflicts, gaps });

  return {
    [OUTPUT_NAMES.inventory]: inventory,
    [OUTPUT_NAMES.mapping]: projections,
    [OUTPUT_NAMES.referenceProjection]: referenceProjection,
    [OUTPUT_NAMES.conflicts]: conflicts,
    [OUTPUT_NAMES.compatibility]: compatibility,
    [OUTPUT_NAMES.gaps]: gaps,
    [OUTPUT_NAMES.summary]: summary,
  };
}

function serialize(name, value) {
  if (name.endsWith('.json')) return `${JSON.stringify(value, null, 2)}\n`;
  if (name.endsWith('.jsonl')) return `${value.map(row => JSON.stringify(row)).join('\n')}\n`;
  return value;
}

function main() {
  const artifacts = buildArtifacts();
  const checkOnly = process.argv.includes('--check');
  if (!checkOnly) fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  for (const [name, value] of Object.entries(artifacts)) {
    const target = path.join(OUTPUT_DIRECTORY, name);
    const expected = serialize(name, value);
    if (checkOnly) {
      const actual = fs.readFileSync(target, 'utf8');
      if (actual !== expected) throw new Error(`Generated artifact is not deterministic: ${target}`);
    } else {
      fs.writeFileSync(target, expected, 'utf8');
    }
  }

  const projectionCounts = countProjectionStatuses(artifacts[OUTPUT_NAMES.mapping]);
  const membershipCounts = countProjectionStatuses(
    artifacts[OUTPUT_NAMES.compatibility].search_areas.flatMap(area => area.members),
  );
  const referenceCounts = countReferenceStatuses(
    artifacts[OUTPUT_NAMES.compatibility].search_areas.flatMap(area => area.members),
  );
  console.log(
    JSON.stringify(
      {
        mode: checkOnly ? 'check' : 'write',
        outputDirectory: path.relative(ROOT, OUTPUT_DIRECTORY),
        outputs: Object.keys(artifacts),
        uniqueProjectionCounts: projectionCounts,
        membershipProjectionCounts: membershipCounts,
        membershipReferenceCounts: referenceCounts,
      },
      null,
      2,
    ),
  );
}

main();
