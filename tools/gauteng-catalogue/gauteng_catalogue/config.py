from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from . import CATALOGUE_VERSION, PIPELINE_VERSION


REPO_ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class TerritoryConfig:
    """Everything about a territory that is configuration, not code.

    Admitting a second province is an instance of this, never an edit to the
    pipeline. The province name, its admission probe names, the source admin
    code and the data directories all live here so that nothing below this line
    has to know which territory it is processing.
    """

    territory_id: str
    province: str
    province_name_tokens: tuple[str, ...]
    province_iso_codes: tuple[str, ...]
    source_admin1_code: str
    catalogue_data_dirname: str
    probe_names: tuple[str, ...]
    scope_note: str = "candidate research catalogue; not production geography"


GAUTENG = TerritoryConfig(
    territory_id="za-gp",
    province="Gauteng",
    province_name_tokens=("gauteng",),
    province_iso_codes=("GP", "ZA-GP"),
    source_admin1_code="3",
    catalogue_data_dirname="gauteng-candidate-catalogue-v0.1",
    probe_names=(
        "Johannesburg",
        "Pretoria",
        "Sandton",
        "Randburg",
        "Rosebank",
        "Bryanston",
        "Fourways",
        "North Riding",
        "Kyalami",
        "Midrand",
        "Centurion",
        "Soweto",
        "Mamelodi",
        "Benoni",
        "Boksburg",
        "Kempton Park",
        "Alberton",
        "Roodepoort",
        "Germiston",
        "Vereeniging",
        "Vanderbijlpark",
    ),
)

WESTERN_CAPE = TerritoryConfig(
    territory_id="za-wc",
    province="Western Cape",
    province_name_tokens=("western cape",),
    province_iso_codes=("WC", "ZA-WC"),
    source_admin1_code="11",
    catalogue_data_dirname="western-cape-candidate-catalogue-v0.1",
    # Research and probe prompts only. Requiring accepted evidence is the point:
    # a prompt never becomes a Place because it was asked about.
    probe_names=(
        "Cape Town",
        "Khayelitsha",
        "Mitchells Plain",
        "Stellenbosch",
        "Paarl",
        "Worcester",
        "George",
        "Knysna",
        "Beaufort West",
    ),
)

KWA_ZULU_NATAL = TerritoryConfig(
    territory_id="za-kzn",
    province="KwaZulu-Natal",
    province_name_tokens=("kwa zulu-natal", "kwazulu-natal"),
    province_iso_codes=("ZN", "ZA-ZN"),
    source_admin1_code="2",
    catalogue_data_dirname="kwa-zulu-natal-candidate-catalogue-v0.1",
    probe_names=(
        "Durban",
        "Pietermaritzburg",
        "Newcastle",
        "Richards Bay",
        "Mombasa",
        "KwaMashu",
        "Umlazi",
        "Vryheid",
        "Empangeni",
        "Howick",
    ),
)

TERRITORIES: dict[str, TerritoryConfig] = {
    config.territory_id: config for config in (GAUTENG, WESTERN_CAPE, KWA_ZULU_NATAL)
}


def territory_config(territory_id: str) -> TerritoryConfig:
    try:
        return TERRITORIES[territory_id]
    except KeyError as error:
        known = ", ".join(sorted(TERRITORIES))
        raise KeyError(f"Unknown territory {territory_id}. Configured: {known}") from error


# Backwards-compatible default: the Gauteng workstream that predates territory
# configuration. New callers must pass a TerritoryConfig explicitly.
DEFAULT_TERRITORY = GAUTENG
DATA_ROOT = REPO_ROOT / "data" / DEFAULT_TERRITORY.catalogue_data_dirname
RAW_ROOT = DATA_ROOT / "raw"
OUTPUT_ROOT = DATA_ROOT / "output"
WORK_ROOT = DATA_ROOT / "work"

GEOBOUNDARIES_API_BASE = "https://www.geoboundaries.org/api/current/gbOpen/ZAF"
GEONAMES_BASE = "https://download.geonames.org/export/dump"
GEOFABRIK_URL = "https://download.geofabrik.de/africa/south-africa-latest.osm.pbf"
WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
WIKIDATA_ENTITY_URL = "https://www.wikidata.org/wiki/Special:EntityData/{qid}.json"
NGA_LANDING_URL = "https://geonames.nga.mil/geonames/GNSData/"
NGA_DATA_INDEX_URL = "https://geonames.nga.mil/geonames/GNSData/data/data.json"
NGA_REFERENCE_URL = "https://geonames.nga.mil/geonames/GNSHome/reference.html"
NGA_DATA_DICTIONARY_URL = (
    "https://geonames.nga.mil/geonames/GNSSearch/GNSDocs/pdfdocs/GNS_Data_Dictionary.pdf"
)

LICENSES = {
    "geoboundaries": {
        "class": "CC_BY",
        "attribution": (
            "geoBoundaries gbOpen; upstream metadata records Creative Commons "
            "Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO)."
        ),
    },
    "geonames": {
        "class": "CC_BY_4",
        "attribution": "GeoNames geographic database; attribution required by the GeoNames licence.",
    },
    "osm": {
        "class": "ODBL_1",
        "attribution": "© OpenStreetMap contributors; Open Database License 1.0.",
    },
    "wikidata": {
        "class": "CC0",
        "attribution": "Wikidata contributors; CC0 public-domain dedication.",
    },
    "nga_gns": {
        "class": "NO_RESTRICTION_GNS",
        "attribution": (
            "Toponymic information is based on the NGA Geographic Names Database "
            "and maintained by the National Geospatial-Intelligence Agency."
        ),
    },
}

PROBE_NAMES = list(DEFAULT_TERRITORY.probe_names)

OSM_PLACE_VALUES = {
    "city",
    "town",
    "village",
    "suburb",
    "quarter",
    "neighbourhood",
    "locality",
    "hamlet",
}

RELEVANT_GEOBOUNDARY_LEVELS = ("ADM1", "ADM2", "ADM3")


def pipeline_metadata(territory: TerritoryConfig = DEFAULT_TERRITORY) -> dict[str, object]:
    """Pipeline metadata for a territory. The province is configuration."""
    return {
        "catalogue_version": CATALOGUE_VERSION,
        "pipeline_version": PIPELINE_VERSION,
        "territory_id": territory.territory_id,
        "province": territory.province,
        "country": "ZA",
        "scope": territory.scope_note,
    }


PIPELINE_METADATA = pipeline_metadata()
