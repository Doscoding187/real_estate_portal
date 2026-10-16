import { Bath, BedDouble, CarFront, House, LandPlot } from 'lucide-react';

/** One icon per property fact, shared by authoring, inventory and public views. */
export const PROPERTY_FACT_ICONS = Object.freeze({
  residentialSize: House,
  landSize: LandPlot,
  bedrooms: BedDouble,
  bathrooms: Bath,
  parking: CarFront,
});
