/** Source-backed editorial content. Place references are resolved against canonical geography,
 * never used as search boundaries. Adding a place record does not publish an article. */
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
export interface ProvinceGuideContent {
  slug: string;
  name: string;
  status: 'local-review' | 'published';
  sourceCheckedOn: string;
  title: string;
  description: string;
  introduction: string;
  regions: readonly ProvinceGuideRegion[];
  sources: readonly { id: string; title: string; url: string; note?: string }[];
  practical: readonly { id: string; title: string; text: string; sourceIds: readonly string[] }[];
  faqs: readonly { question: string; answer: string }[];
}

const gauteng: ProvinceGuideContent = {
  slug: 'gauteng',
  name: 'Gauteng',
  status: 'local-review',
  sourceCheckedOn: '2026-10-15',
  title: 'Explore Gauteng: regions, cities & neighbourhoods | Property Listify',
  description:
    'Understand Gauteng’s three metros and two districts. Compare Johannesburg, Tshwane, Ekurhuleni, West Rand and Sedibeng, then explore their city guides.',
  introduction:
    'One province, many ways to live. Get your bearings in Johannesburg, the greater Pretoria area and the East Rand, then look west to the towns of the West Rand or south towards the Vaal. Start with the region that fits your everyday life, and explore its places in more detail.',
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
        'Ekurhuleni brings together nine established towns: Alberton, Benoni, Boksburg, Brakpan, Edenvale, Germiston, Kempton Park, Nigel and Springs. The familiar name “East Rand” helps with orientation, but a town and a metropolitan municipality are different levels of geography.',
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
        '“The Vaal” is a familiar regional description, not a synonym for one municipal boundary. The wider river region also connects to places outside Gauteng, including Sasolburg in the Free State. This province guide keeps its place links within Gauteng. For a river or dam-side property, check the exact address and municipality as well as access, services and any property-specific restrictions.',
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
  practical: [
    {
      id: 'transport',
      title: 'Start with the journey you make most',
      text: 'Gautrain links Johannesburg, Sandton, Midrand, Centurion, Pretoria and Hatfield, with an airport connection. It is one part of a wider transport picture. Check current routes and service information with the operator, and test your full door-to-door trip at the times you expect to travel. Distance on a map is not a travel-time promise.',
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
  return PROVINCE_GUIDE_CONTENT.filter(guide => guide.status === 'published');
}
