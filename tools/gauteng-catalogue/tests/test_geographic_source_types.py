import unittest

from gauteng_catalogue.territory_source_authority import classify


class GeographicSourceTypesTests(unittest.TestCase):
    def test_facilities_are_not_promoted_to_geographic_types(self):
        for code in ["S.HTL", "S.MALL", "S.BLDG", "S.RSD", "S.TOWR", "L.CTRB"]:
            with self.subTest(code=code):
                feature_class, feature_code = code.split(".")
                result = classify(
                    {
                        "feature_class": feature_class,
                        "feature_code": feature_code,
                        "population": "100",
                    },
                    {},
                )
                self.assertFalse(result["admitted"])

    def test_settlements_and_administrative_areas_still_admit(self):
        for code in ["P.PPL", "P.PPLX", "A.ADM1", "L.LCTY"]:
            with self.subTest(code=code):
                feature_class, feature_code = code.split(".")
                result = classify(
                    {
                        "feature_class": feature_class,
                        "feature_code": feature_code,
                        "population": "100",
                    },
                    {},
                )
                self.assertTrue(result["admitted"])
