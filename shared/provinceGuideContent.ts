import { selectPublishedGuides, type GuidePublicationStatus } from './guidePublication';

/** Source-backed editorial content. Place references are resolved against canonical geography,
 *  never used as search boundaries. Adding a place record does not publish an article. */
export interface ProvinceGuideRegion {
  id: string;
  name: string;
  kind: 'Metropolitan municipality' | 'District municipality';
  strapline: string;
  summary: string;
  paragraphs: readonly string[];
  consider: string;
  places: readonly { name: string; citySlug: string }[];
  sourceIds: readonly string[];
}
export interface ProvinceDiscoveryPlace {
  name: string;
  citySlug: string;
  regionId: string;
  caption: string;
}
export interface ProvinceDiscoveryCollection {
  id: string;
  label: string;
  icon: 'city' | 'leaf' | 'train' | 'home' | 'trees' | 'water';
  description: string;
  context: string;
  places: readonly ProvinceDiscoveryPlace[];
  sourceIds: readonly string[];
}
export interface ProvinceGuideContent {
  slug: string;
  name: string;
  status: GuidePublicationStatus;
  sourceCheckedOn: string;
  title: string;
  description: string;
  introduction: string;
  regions: readonly ProvinceGuideRegion[];
  collections: readonly ProvinceDiscoveryCollection[];
  sources: readonly { id: string; title: string; url: string; note?: string }[];
  practical: readonly { id: string; title: string; text: string; sourceIds: readonly string[] }[];
  faqs: readonly { question: string; answer: string }[];
}

const gauteng: ProvinceGuideContent = {
  slug: 'gauteng',
  name: 'Gauteng',
  status: 'published',
  sourceCheckedOn: '2026-10-15',
  title: 'Explore Gauteng: regions, cities & neighbourhoods | Property Listify',
  description:
    'Understand Gauteng’s three metros and two districts. Compare Johannesburg, Tshwane, Ekurhuleni, West Rand and Sedibeng, then explore their city guides.',
  introduction:
    'One province, many ways to live. These five areas are Property Listify’s main ways into Gauteng: three metropolitan municipalities — Johannesburg, Tshwane and Ekurhuleni — and two district-level areas, West Rand and Sedibeng. Get your bearings in Johannesburg, the greater Pretoria area and the East Rand, then look west to the towns of the West Rand or south towards the Vaal. Start with the region that fits your everyday life, and explore its places in more detail.',
  regions: [
    {
      id: 'johannesburg',
      name: 'Johannesburg',
      kind: 'Metropolitan municipality',
      strapline: 'A city of distinct neighbourhoods',
      summary:
        'From the inner city and Soweto to Sandton, Randburg and Midrand, “Joburg” is much more than one property market.',
      paragraphs: [
        'The City of Johannesburg is divided into seven municipal regions. Its inner city, northern business centres, western neighbourhoods and southern communities sit within the same metro, but they are different starting points for a home search. A Johannesburg address alone tells you very little about the journey you will make each day.',
        'Start by identifying the part of the city you need to reach. Sandton and Rosebank are useful points of reference along the Gautrain corridor; Midrand lies further north, while Roodepoort and Soweto offer different western and south-western contexts. “Johannesburg North” is a familiar area description, rather than a single municipality or a precise search boundary.',
      ],
      consider:
        'Compare specific neighbourhoods around your daily destination. A citywide result is useful for browsing, but it should not decide your commute for you.',
      places: [
        { name: 'Johannesburg', citySlug: 'johannesburg' },
        { name: 'Randburg', citySlug: 'randburg' },
        { name: 'Midrand', citySlug: 'midrand' },
        { name: 'Roodepoort', citySlug: 'roodepoort' },
        { name: 'Soweto', citySlug: 'soweto' },
      ],
      sourceIds: ['joburg', 'gautrain'],
    },
    {
      id: 'tshwane',
      name: 'Tshwane & Pretoria',
      kind: 'Metropolitan municipality',
      strapline: 'Look beyond a Pretoria address',
      summary:
        'Pretoria, Centurion and the metro’s northern and eastern communities belong to a much wider Tshwane geography.',
      paragraphs: [
        'Pretoria and the City of Tshwane are not interchangeable geographic scopes. Tshwane’s seven service regions cover Pretoria and Centurion as well as communities extending north and east. A guide to Pretoria can help you understand the city, but it should not be treated as a guide to every place in the metro.',
        'Centurion is a separate place to explore between Johannesburg and Pretoria. Within Pretoria, compare the centre with the neighbourhoods on the side of the city you need. Further east, Bronkhorstspruit sits in Tshwane’s Region 7. Gautrain connects Centurion, Pretoria and Hatfield, but a station on the network does not mean every home is within walking distance.',
      ],
      consider:
        'Shortlist around your campus, workplace or regular destination first. Check the full trip, including the distance from the station or main road to the property.',
      places: [
        { name: 'Pretoria', citySlug: 'pretoria' },
        { name: 'Centurion', citySlug: 'centurion' },
        { name: 'Bronkhorstspruit', citySlug: 'bronkhorstspruit' },
      ],
      sourceIds: ['tshwane', 'tshwane-east', 'gautrain'],
    },
    {
      id: 'ekurhuleni',
      name: 'Ekurhuleni',
      kind: 'Metropolitan municipality',
      strapline: 'Get to know the East Rand town by town',
      summary:
        'An interconnected network of towns, with airport, industrial and residential settings that vary considerably by location.',
      paragraphs: [
        'Ekurhuleni’s historic towns and centres include Alberton, Benoni, Boksburg, Brakpan, Edenvale, Germiston, Kempton Park, Nigel and Springs. The metro also covers large townships such as Tembisa, Daveyton, Vosloorus, Katlehong, Thokoza and KwaThema. Those are reached through the suburb search and their own place pages rather than as separate areas in this chapter. The familiar name “East Rand” helps with orientation, but a town and a metropolitan municipality are different levels of geography.',
        'OR Tambo International Airport is an important reference point for the northern part of the metro. The mining-belt towns stretch eastwards, while Alberton provides a southern starting point. Rather than treating the whole metro as one shortlist, compare the town, the neighbourhood and its connection to your daily destinations. Airport access, proximity to employment and a residential street’s surroundings are separate considerations.',
      ],
      consider:
        'Use an individual town as your next step. If airport access matters, check the actual route and property surroundings rather than relying on the “East Rand” label.',
      places: [
        { name: 'Benoni', citySlug: 'benoni' },
        { name: 'Boksburg', citySlug: 'boksburg' },
        { name: 'Alberton', citySlug: 'alberton' },
        { name: 'Kempton Park', citySlug: 'kempton-park' },
        { name: 'Germiston', citySlug: 'germiston' },
      ],
      sourceIds: ['ekurhuleni', 'gautrain'],
    },
    {
      id: 'west-rand',
      name: 'West Rand',
      kind: 'District municipality',
      strapline: 'Towns, open landscapes and a different western context',
      summary:
        'A district beyond Johannesburg’s western neighbourhoods, bringing together Mogale City, Rand West City and Merafong City.',
      paragraphs: [
        'The West Rand district has three local municipalities: Mogale City, Rand West City and Merafong City. Krugersdorp, Randfontein and Carletonville are useful town-level starting points. The district also includes places such as Magaliesburg and Fochville, so “West Rand” should not be read as one continuous suburban neighbourhood.',
        'It is also important to distinguish the district from the western side of Johannesburg: Roodepoort belongs to the Johannesburg metro. When comparing western locations, begin with the town and then the specific neighbourhood or property setting. A town address, a smallholding and a rural property can involve quite different access and service arrangements.',
      ],
      consider:
        'For a smallholding or rural property, ask about land use, road access, water, electricity and maintenance responsibilities before comparing it with a suburban home.',
      places: [
        { name: 'Krugersdorp', citySlug: 'krugersdorp' },
        { name: 'Randfontein', citySlug: 'randfontein' },
        { name: 'Carletonville', citySlug: 'carletonville' },
        { name: 'Magaliesburg', citySlug: 'magaliesburg' },
      ],
      sourceIds: ['west-rand', 'joburg'],
    },
    {
      id: 'sedibeng',
      name: 'Sedibeng & the Vaal',
      kind: 'District municipality',
      strapline: 'Southern Gauteng, with more than one local rhythm',
      summary:
        'Vereeniging, Vanderbijlpark, Meyerton and Heidelberg provide different ways into the south of the province.',
      paragraphs: [
        'Sedibeng is the southern Gauteng district made up of Emfuleni, Midvaal and Lesedi. The river communities around Vereeniging and Vanderbijlpark, the Meyerton area and Heidelberg are distinct places to explore. The R59, N1 and N3 provide different regional connections; choose the relevant corridor rather than assuming that every address has the same access to Johannesburg.',
        '“The Vaal” is a familiar regional description, not a synonym for one municipal boundary. Sedibeng covers southern Gauteng, including Emfuleni, Midvaal and Lesedi. The wider Vaal area also connects communities across the provincial boundary, including Sasolburg in the Free State, which is a separate province. This province guide keeps its place links within Gauteng. For a river or dam-side property, check the exact address and municipality as well as access, services and any property-specific restrictions.',
      ],
      consider:
        'Decide whether you want a town neighbourhood, a smaller settlement or a waterside setting. Then investigate that location on its own terms.',
      places: [
        { name: 'Vereeniging', citySlug: 'vereeniging' },
        { name: 'Vanderbijlpark', citySlug: 'vanderbijlpark' },
        { name: 'Meyerton', citySlug: 'meyerton' },
        { name: 'Heidelberg', citySlug: 'heidelberg' },
      ],
      sourceIds: ['sedibeng', 'metsimaholo'],
    },
  ],
  collections: [
    {
      id: 'city-living',
      label: 'City living',
      icon: 'city',
      description: 'Discover city centres, established neighbourhoods and the places between them.',
      context:
        'Start with a city guide, then compare the neighbourhoods around your everyday destinations. These are editorial starting points, not a ranking of the best places to live.',
      sourceIds: ['joburg', 'tshwane'],
      places: [
        {
          name: 'Johannesburg',
          citySlug: 'johannesburg',
          regionId: 'johannesburg',
          caption: 'Explore the city’s many sides',
        },
        {
          name: 'Pretoria',
          citySlug: 'pretoria',
          regionId: 'tshwane',
          caption: 'Look closer at the capital city',
        },
        {
          name: 'Randburg',
          citySlug: 'randburg',
          regionId: 'johannesburg',
          caption: 'Explore the local neighbourhoods',
        },
        {
          name: 'Midrand',
          citySlug: 'midrand',
          regionId: 'johannesburg',
          caption: 'Between Johannesburg and Pretoria',
        },
        {
          name: 'Centurion',
          citySlug: 'centurion',
          regionId: 'tshwane',
          caption: 'A different starting point in Tshwane',
        },
      ],
    },
    {
      id: 'green-spaces',
      label: 'Green spaces',
      icon: 'leaf',
      description: 'Explore around botanical gardens and established outdoor destinations.',
      context:
        'Johannesburg Botanical Garden and Emmarentia Dam, Pretoria National Botanical Garden and Walter Sisulu National Botanical Garden offer concrete places to investigate. Open the city guide for broader context, then check the exact neighbourhood and the route to the garden. These links do not mean that every home in the city is close to a park.',
      sourceIds: ['joburg-gardens', 'pretoria-garden', 'walter-sisulu'],
      places: [
        {
          name: 'Johannesburg',
          citySlug: 'johannesburg',
          regionId: 'johannesburg',
          caption: 'Botanical Garden & Emmarentia Dam',
        },
        {
          name: 'Pretoria',
          citySlug: 'pretoria',
          regionId: 'tshwane',
          caption: 'Pretoria National Botanical Garden',
        },
        {
          name: 'Roodepoort',
          citySlug: 'roodepoort',
          regionId: 'johannesburg',
          caption: 'Walter Sisulu National Botanical Garden',
        },
      ],
    },
    {
      id: 'connected-living',
      label: 'Connected living',
      icon: 'train',
      description: 'Use the Gautrain corridor as a starting point for your daily journey.',
      context:
        'Park Station, Midrand, Centurion, Pretoria and Hatfield are stations on the north–south commuter corridor. Compare the complete trip, including the distance between a home and a station; a city guide is not a promise of walkable rail access. Confirm current routes with Gautrain.',
      sourceIds: ['gautrain'],
      places: [
        {
          name: 'Johannesburg',
          citySlug: 'johannesburg',
          regionId: 'johannesburg',
          caption: 'Start with the Park Station corridor',
        },
        {
          name: 'Midrand',
          citySlug: 'midrand',
          regionId: 'johannesburg',
          caption: 'Explore around the Midrand connection',
        },
        {
          name: 'Centurion',
          citySlug: 'centurion',
          regionId: 'tshwane',
          caption: 'Compare your door-to-door journey',
        },
        {
          name: 'Pretoria',
          citySlug: 'pretoria',
          regionId: 'tshwane',
          caption: 'Pretoria & Hatfield connections',
        },
      ],
    },
    {
      id: 'east-rand',
      label: 'East Rand towns',
      icon: 'home',
      description: 'Get to know Ekurhuleni one town at a time.',
      context:
        'The towns within Ekurhuleni have different relationships to the airport, the mining belt and surrounding employment areas. Start with the town you mean, then explore specific neighbourhoods rather than treating the East Rand as one search area.',
      sourceIds: ['ekurhuleni'],
      places: [
        {
          name: 'Benoni',
          citySlug: 'benoni',
          regionId: 'ekurhuleni',
          caption: 'Explore a different East Rand town',
        },
        {
          name: 'Boksburg',
          citySlug: 'boksburg',
          regionId: 'ekurhuleni',
          caption: 'Get to know the town and its areas',
        },
        {
          name: 'Alberton',
          citySlug: 'alberton',
          regionId: 'ekurhuleni',
          caption: 'A southern starting point',
        },
        {
          name: 'Kempton Park',
          citySlug: 'kempton-park',
          regionId: 'ekurhuleni',
          caption: 'Explore the airport-side town',
        },
        {
          name: 'Germiston',
          citySlug: 'germiston',
          regionId: 'ekurhuleni',
          caption: 'Look closer at the local context',
        },
      ],
    },
    {
      id: 'town-country',
      label: 'Town & country',
      icon: 'trees',
      description: 'Explore the towns and surrounding landscapes west and south of the metros.',
      context:
        'Use West Rand and Sedibeng as regional context before choosing a town or a particular property setting. A town home, smallholding and rural property can have different access, land-use and service arrangements; check the specific address.',
      sourceIds: ['west-rand', 'sedibeng'],
      places: [
        {
          name: 'Krugersdorp',
          citySlug: 'krugersdorp',
          regionId: 'west-rand',
          caption: 'A starting point in Mogale City',
        },
        {
          name: 'Randfontein',
          citySlug: 'randfontein',
          regionId: 'west-rand',
          caption: 'Explore Rand West City',
        },
        {
          name: 'Magaliesburg',
          citySlug: 'magaliesburg',
          regionId: 'west-rand',
          caption: 'Look beyond a suburban setting',
        },
        {
          name: 'Meyerton',
          citySlug: 'meyerton',
          regionId: 'sedibeng',
          caption: 'Get to know the Midvaal side',
        },
      ],
    },
    {
      id: 'around-vaal',
      label: 'Around the Vaal',
      icon: 'water',
      description: 'Find your bearings in the southern part of Gauteng.',
      context:
        'Vereeniging, Vanderbijlpark and Meyerton are different entry points into Sedibeng. The wider Vaal region also reaches beyond Gauteng. A town’s place in this collection does not imply that every property is riverfront or dam-side.',
      sourceIds: ['sedibeng', 'metsimaholo'],
      places: [
        {
          name: 'Vereeniging',
          citySlug: 'vereeniging',
          regionId: 'sedibeng',
          caption: 'Discover southern Gauteng',
        },
        {
          name: 'Vanderbijlpark',
          citySlug: 'vanderbijlpark',
          regionId: 'sedibeng',
          caption: 'Explore the Vaal side',
        },
        {
          name: 'Meyerton',
          citySlug: 'meyerton',
          regionId: 'sedibeng',
          caption: 'A starting point in Midvaal',
        },
      ],
    },
  ],
  practical: [
    {
      id: 'transport',
      title: 'Start with the journey you make most',
      text: 'The north–south Gautrain corridor connects Park Station, Rosebank, Sandton, Marlboro, Midrand, Centurion, Pretoria and Hatfield. The airport service connects through the eastern branch to O.R. Tambo International Airport. It is one part of a wider transport picture. Check current routes and service information with the operator, and test your full door-to-door trip at the times you expect to travel. Distance on a map is not a travel-time promise.',
      sourceIds: ['gautrain'],
    },
    {
      id: 'daily-life',
      title: 'Compare the neighbourhood, not just the region',
      text: 'A metro label cannot tell you whether a particular home fits your routine. Mark the schools, healthcare facilities, shops and regular destinations you need, then investigate the neighbourhood around each shortlisted property. Confirm admissions, services and opening arrangements with the relevant provider rather than assuming proximity guarantees access.',
      sourceIds: [],
    },
    {
      id: 'housing',
      title: 'Look at the home and its running costs',
      text: 'When comparing apartments, townhouses, freestanding homes or smallholdings, ask about the costs and responsibilities attached to that specific property. Levies, rates, utilities, maintenance and applicable rules can change the practical comparison. A lower asking price alone does not establish a lower cost of living.',
      sourceIds: [],
    },
  ],
  faqs: [
    {
      question: 'Is Pretoria the same place as Tshwane?',
      answer:
        'No. Pretoria is a city within the City of Tshwane metropolitan municipality. Tshwane covers a wider area, including Centurion and communities further north and east. Choose a Pretoria guide for city context, then narrow to the neighbourhood you mean.',
    },
    {
      question: 'Does a Johannesburg search mean the northern suburbs?',
      answer:
        'It should not. Johannesburg includes the inner city, Soweto, western and southern areas as well as northern neighbourhoods. Names such as “Johannesburg North” need more precise place choices before they can define a useful home search.',
    },
    {
      question: 'Is the West Rand part of Johannesburg?',
      answer:
        'The West Rand district is separate from the Johannesburg metro. Roodepoort is within Johannesburg, while places such as Krugersdorp, Randfontein and Carletonville are in the West Rand district. Everyday regional labels can be broader than administrative boundaries.',
    },
    {
      question: 'Can this guide tell me where lofts or townhouses are most common?',
      answer:
        'The city guides are a starting point for exploring neighbourhoods. A reliable property-type comparison needs enough correctly classified listings within defined areas. We do not infer the province’s housing stock or demand from a small selection of listings.',
    },
    {
      question: 'Are listing prices the same as sale prices?',
      answer:
        'No. An advertised asking price is the seller’s or landlord’s request, rather than a completed transaction. Property Listify inventory counts describe listings available on this platform, not all homes in the province. This guide does not currently publish regional price estimates or price-growth claims.',
    },
  ],
  sources: [
    {
      id: 'geography',
      title: 'CoGTA · Gauteng district development profile',
      url: 'https://www.cogta.gov.za/cgta_2016/wp-content/uploads/2023/11/Gauteng-DDM-Booklet-Vol-1-Nov-2021.pdf',
      note: 'Municipal structure; November 2021 profile. Not used for current prices or population.',
    },
    {
      id: 'joburg',
      title: 'City of Johannesburg · municipal regions',
      url: 'https://joburg.org.za/about_/regions/Pages/City-of-Johannesburg-regions.aspx',
    },
    {
      id: 'tshwane',
      title: 'City of Tshwane · regional services',
      url: 'https://www.tshwane.gov.za/?page_id=8940',
    },
    {
      id: 'tshwane-east',
      title: 'City of Tshwane · Region 7',
      url: 'https://www.tshwane.gov.za/?page_id=10078',
    },
    {
      id: 'ekurhuleni',
      title: 'City of Ekurhuleni · Spatial Development Framework 2025',
      url: 'https://www.ekurhuleni.gov.za/wp-content/uploads/2026/03/MSDF2025%28excludingannexures%29.pdf',
    },
    {
      id: 'west-rand',
      title: 'West Rand · 2025/26 draft integrated development plan',
      url: 'https://www.wrdm.gov.za/wp-content/uploads/documents/idp/202526-Draft-IDP.pdf',
      note: 'Municipal structure only; draft policy proposals are not presented as settled outcomes.',
    },
    {
      id: 'sedibeng',
      title: 'Sedibeng · towns and regional connections',
      url: 'https://www.sedibeng.gov.za/tourism_townships.html',
      note: 'Used for geography and route names; historical travel-time and population claims are excluded.',
    },
    {
      id: 'metsimaholo',
      title: 'Metsimaholo · Sasolburg and the Vaal River',
      url: 'https://www.metsimaholo.gov.za/',
    },
    {
      id: 'joburg-gardens',
      title: 'Johannesburg City Parks & Zoo · Botanical Garden and Emmarentia Dam',
      url: 'https://www.jhbcityparksandzoo.com/services-facilities/botanical-gardens/plan-your-visit',
      note: 'Named outdoor destinations, not a citywide proximity or safety rating.',
    },
    {
      id: 'pretoria-garden',
      title: 'SANBI · Pretoria National Botanical Garden',
      url: 'https://www.sanbi.org/gardens/pretoria/',
    },
    {
      id: 'walter-sisulu',
      title: 'SANBI · Walter Sisulu National Botanical Garden',
      url: 'https://www.sanbi.org/gardens/walter-sisulu/visitor-information/information/',
      note: 'Garden location in Poortview, Roodepoort. Not a claim about every western neighbourhood.',
    },
    {
      id: 'gautrain',
      title: 'Gautrain · network and service information',
      url: 'https://www.gautrain.co.za/commuter/generalinformation?tab=4',
    },
  ],
};

export const PROVINCE_GUIDE_CONTENT: readonly ProvinceGuideContent[] = [gauteng];
export function getProvinceGuideContent(slug: string) {
  return PROVINCE_GUIDE_CONTENT.find(guide => guide.slug === slug);
}
/** Only editorial approval can add a guide to the public sitemap. Local review is not publication. */
export function getPublishedProvinceGuides() {
  return selectPublishedGuides(PROVINCE_GUIDE_CONTENT);
}
