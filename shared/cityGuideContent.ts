import { selectPublishedGuides, type GuidePublicationStatus } from './guidePublication';

/** Editorial orientation only. These groupings never create search boundaries. */
export interface CityGuidePlace {
  name: string;
  caption: string;
  kind: 'city' | 'suburb';
  imageCity: string;
}
export interface CityGuideCollection {
  id: string;
  label: string;
  icon: 'city' | 'leaf' | 'train' | 'compass';
  description: string;
  context: string;
  sourceIds: readonly string[];
  places: readonly CityGuidePlace[];
}
export interface CityGuideContent {
  provinceSlug: string;
  provinceName: string;
  slug: string;
  name: string;
  status: GuidePublicationStatus;
  sourceCheckedOn: string;
  title: string;
  description: string;
  introduction: string;
  collections: readonly CityGuideCollection[];
  regions: readonly {
    id: string;
    label: string;
    title: string;
    text: string;
    consider: string;
    places: string[];
  }[];
  practical: readonly { title: string; text: string; sourceIds: readonly string[] }[];
  faqs: readonly { question: string; answer: string }[];
  sources: readonly { id: string; title: string; url: string }[];
}
/**
 * A suburb reference is typed as a suburb so the guide resolves it against the canonical
 * hierarchy and links to its real place route. Typing a place as a city makes the lookup
 * refuse it, which silently turns a named neighbourhood into plain text.
 */
const suburb = (name: string, caption: string, imageCity = 'johannesburg'): CityGuidePlace => ({
  name,
  caption,
  kind: 'suburb',
  imageCity,
});
const city = (name: string, caption: string, imageCity: string): CityGuidePlace => ({
  name,
  caption,
  kind: 'city',
  imageCity,
});
const johannesburg: CityGuideContent = {
  provinceSlug: 'gauteng',
  provinceName: 'Gauteng',
  slug: 'johannesburg',
  name: 'Johannesburg',
  status: 'published',
  sourceCheckedOn: '2026-10-15',
  title: 'Johannesburg area guide: neighbourhoods, parks & city life | Property Listify',
  description:
    'Find your side of Johannesburg. Understand its different regions, discover neighbourhoods and green spaces, and choose a suburb to explore in more detail.',
  introduction:
    'Johannesburg is a collection of very different places. Start with the part of the city that fits your everyday destinations, then get to know its neighbourhoods. A Sandton address, an inner-city apartment and a home in Soweto can mean very different daily journeys.',
  collections: [
    {
      id: 'across-the-city',
      label: 'Across the city',
      icon: 'compass',
      description:
        'Five starting points for getting your bearings across the wider Johannesburg metro.',
      context:
        'The municipal metro and the places in our catalogue are different levels of geography. Each verified guide has its own place scope; opening one does not silently combine its properties with Johannesburg’s results.',
      sourceIds: ['regions'],
      places: [
        city('Johannesburg', 'Start with the city and its neighbourhoods', 'johannesburg'),
        suburb('Sandton', 'Explore a northern starting point', 'sandton'),
        city('Randburg', 'Get to know the north-western side', 'randburg'),
        city('Midrand', 'Look further north in the metro', 'midrand'),
        city('Soweto', 'Explore the south-western side', 'soweto'),
      ],
    },
    {
      id: 'green-spaces',
      label: 'Green spaces',
      icon: 'leaf',
      description: 'Start with a park or garden, then investigate the neighbourhood around it.',
      context:
        'City Parks identifies the Botanical Garden in Emmarentia, Zoo Lake in Parkview, Delta Park in Blairgowrie and Klipriviersburg Nature Reserve in Kibler Park. Check each venue’s current access arrangements and the actual route from a property. Collection membership is not a safety rating or a promise of walking distance.',
      sourceIds: ['parks'],
      places: [
        suburb('Emmarentia', 'Johannesburg Botanical Garden & dam'),
        suburb('Parkview', 'Zoo Lake as a local reference point'),
        suburb('Blairgowrie', 'Explore around Delta Park'),
        suburb('Kibler Park', 'Klipriviersburg Nature Reserve'),
      ],
    },
    {
      id: 'rail-connections',
      label: 'Rail connections',
      icon: 'train',
      description:
        'Use a station as a starting point for a more practical neighbourhood shortlist.',
      context:
        'Park, Rosebank, Sandton and Midrand are Gautrain commuter-network reference points. The station is only part of a journey: compare the walk, feeder connection or drive at both ends. A city-guide link does not mean every home is close to its station.',
      sourceIds: ['rail', 'rosebank'],
      places: [
        suburb('Rosebank', 'Compare the area around Rosebank station'),
        suburb('Sandton', 'Explore around the Sandton node', 'sandton'),
        city('Midrand', 'Investigate your full station connection', 'midrand'),
        suburb('Braamfontein', 'Investigate connections around Park station'),
      ],
    },
    {
      id: 'neighbourhood-life',
      label: 'Neighbourhood life',
      icon: 'city',
      description: 'Look closer at individual neighbourhoods before deciding where to search.',
      context:
        'Use these places as starting points for your own comparison. Check the street, housing arrangement, daily services and regular destinations. They are not ranked for affordability, school quality, safety or investment returns.',
      sourceIds: ['regions', 'parks'],
      places: [
        suburb('Rosebank', 'Compare the neighbourhood, not just the node'),
        suburb('Emmarentia', 'Explore the streets around the garden'),
        suburb('Parkview', 'Investigate your everyday local routes'),
        suburb('Alexandra', 'A different northern-city context'),
      ],
    },
  ],
  regions: [
    {
      id: 'a',
      label: 'Midrand & north',
      title: 'Region A · Midrand and the north',
      text: 'Midrand, Diepsloot and Ivory Park are northern reference points. The same municipal region includes quite different neighbourhoods and housing settings.',
      consider:
        'Start with the destination you need to reach. Compare the specific neighbourhood and the complete route rather than assuming that a northern address means a short commute.',
      places: ['Midrand', 'Diepsloot', 'Ivory Park'],
    },
    {
      id: 'b',
      label: 'Randburg & parks',
      title: 'Region B · Randburg and the park neighbourhoods',
      text: 'Northcliff and parts of Randburg, Sandton and Rosebank form this part of the metro. Familiar place names can cross the city’s administrative divisions.',
      consider:
        'Look at a specific neighbourhood around your regular destinations. A park or business-node name is a useful reference point, but it does not describe every street around it.',
      places: ['Randburg', 'Northcliff', 'Emmarentia'],
    },
    {
      id: 'c',
      label: 'Roodepoort & west',
      title: 'Region C · Roodepoort and the west',
      text: 'Roodepoort and parts of Randburg sit on the western side of Johannesburg. This municipal region is distinct from Gauteng’s West Rand district.',
      consider:
        'Check which place and municipality the address belongs to. Keep a Roodepoort shortlist separate from a district-wide search around Krugersdorp or Randfontein.',
      places: ['Roodepoort', 'Florida', 'Roodekrans'],
    },
    {
      id: 'd',
      label: 'Soweto',
      title: 'Region D · Soweto',
      text: 'Soweto, including areas such as Diepkloof and Meadowlands, provides a south-western starting point. Explore its neighbourhoods individually.',
      consider:
        'Choose a neighbourhood around the routes, services and everyday destinations that matter to you. A Soweto-wide label is orientation, not a substitute for a local guide.',
      places: ['Soweto', 'Diepkloof', 'Meadowlands'],
    },
    {
      id: 'e',
      label: 'Sandton & Alexandra',
      title: 'Region E · Sandton and Alexandra',
      text: 'Alexandra and parts of Sandton and Rosebank sit within Region E. An administrative grouping is not a single housing market or one lifestyle.',
      consider:
        'Compare the exact neighbourhood and property setting. If a rail connection matters, check the route to the station as well as the onward trip.',
      places: ['Sandton', 'Alexandra', 'Rosebank'],
    },
    {
      id: 'f',
      label: 'Inner city & south',
      title: 'Region F · Inner city and Johannesburg South',
      text: 'The inner city and Johannesburg South share a municipal region while offering different urban and residential contexts.',
      consider:
        'Distinguish a central apartment from a southern neighbourhood home. Compare the building’s running costs and management arrangements alongside your regular journeys.',
      places: ['Johannesburg', 'Braamfontein', 'Kibler Park'],
    },
    {
      id: 'g',
      label: 'Deep south',
      title: 'Region G · Lenasia and the deep south',
      text: 'Lenasia, Ennerdale, Orange Farm and Eldorado Park are reference points for the metro’s southern reach.',
      consider:
        'Check the actual route, access and nearby services for the specific address. Do not assume that the entire metro has the same connection to central Johannesburg.',
      places: ['Lenasia', 'Ennerdale', 'Orange Farm'],
    },
  ],
  practical: [
    {
      title: 'Start with your regular journey',
      text: 'Work backwards from work, study or family commitments. Check the complete route at the times you actually travel. A station or main road nearby is one part of the decision; the trip at either end still matters.',
      sourceIds: ['rail', 'rosebank'],
    },
    {
      title: 'Look beyond the property price',
      text: 'When comparing apartments, townhouses and freestanding homes, ask about levies, rates, utilities, maintenance and building management. Keep sale prices and monthly rents separate. A low asking price alone does not tell you the total cost of living there.',
      sourceIds: [],
    },
    {
      title: 'Visit the neighbourhood itself',
      text: 'Compare the street, local services and access arrangements with your own needs. Confirm schools, healthcare and transport directly with providers. A metro overview cannot verify an individual home’s surroundings or guarantee access.',
      sourceIds: ['regions'],
    },
  ],
  faqs: [
    {
      question: 'Does Johannesburg mean the entire metropolitan municipality?',
      answer:
        'Not always. The municipality includes places such as Midrand, Roodepoort and Soweto, while the platform also has separate catalogued city identities. This guide explains the wider context. Live inventory figures and search handoffs use the exact selected catalogue identity, not an inferred municipal boundary.',
    },
    {
      question: 'Can I explore a suburb before choosing Buy or Rent?',
      answer:
        'Yes. Suburb-guide links remain part of the discovery journey. Choose Buy or Rent only when you want property results. Your selected area is shown before you continue.',
    },
    {
      question: 'Why are there no neighbourhood price rankings?',
      answer:
        'Current listings alone do not establish fair value, achieved sale prices or demand. A defensible comparison needs matching property types, transactions, geographic scope and enough priced observations. Unsupported price comparisons are omitted.',
    },
    {
      question: 'Are the lifestyle collections recommendations for every property?',
      answer:
        'No. They identify places and reference points worth investigating. They do not rate neighbourhood safety, promise a commute time or imply that every property is near a park or station.',
    },
  ],
  sources: [
    {
      id: 'regions',
      title: 'City of Johannesburg · seven administrative regions',
      url: 'https://joburg.org.za/departments_/Documents/Joburg-City-Safety-Strategy/Joburg-City-Safety-Strategy-JCSS-2025.pdf',
    },
    {
      id: 'region-e',
      title: 'City of Johannesburg · Region E: Sandton and Alexandra',
      url: 'https://joburg.org.za/about_/regions/Pages/Region%20E%20-%20Sandton%2C%20Alexandra/region-e.aspx',
    },
    {
      id: 'parks',
      title: 'Johannesburg City Parks & Zoo · parks and walking destinations',
      url: 'https://www.jhbcityparksandzoo.com/services-facilities/nature-reserves-bird-sanctuary/walking-trails',
    },
    {
      id: 'rail',
      title: 'Gautrain · commuter network',
      url: 'https://www.gautrain.co.za/commuter/generalinformation?tab=3',
    },
    {
      id: 'rosebank',
      title: 'Gautrain · Rosebank station',
      url: 'https://www.gautrain.co.za/commuter/stationinfo?stationName=Rosebank',
    },
  ],
};
export const CITY_GUIDE_CONTENT: readonly CityGuideContent[] = [johannesburg];
export function getCityGuideContent(province: string, city: string) {
  return CITY_GUIDE_CONTENT.find(guide => guide.provinceSlug === province && guide.slug === city);
}
export function getPublishedCityGuides() {
  return selectPublishedGuides(CITY_GUIDE_CONTENT);
}
