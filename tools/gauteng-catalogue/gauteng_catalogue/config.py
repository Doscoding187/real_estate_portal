from __future__ import annotations

from pathlib import Path

from . import CATALOGUE_VERSION, PIPELINE_VERSION


REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_ROOT = REPO_ROOT / "data" / "gauteng-candidate-catalogue-v0.1"
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

PROBE_NAMES = [
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
]

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

PIPELINE_METADATA = {
    "catalogue_version": CATALOGUE_VERSION,
    "pipeline_version": PIPELINE_VERSION,
    "province": "Gauteng",
    "country": "ZA",
    "scope": "candidate research catalogue; not production geography",
}
