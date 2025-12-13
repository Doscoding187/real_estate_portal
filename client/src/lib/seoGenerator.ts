
/**
 * SEO Content Generator
 * 
 * Generates unique, data-rich HTML content for location pages to improve SEO ranking.
 * Uses a template-based approach injected with real statistics to avoid duplicate content penalties.
 * 
 * Requirements 9.2: Auto-generate 150-500 words based on page level
 */

interface LocationStats {
  totalListings: number;
  avgPrice: number;
  minPrice?: number;
  maxPrice?: number;
  rentalCount?: number;
  saleCount?: number;
  avgRentalPrice?: number;
}

interface GeneratorOptions {
  type: 'province' | 'city' | 'suburb';
  name: string;
  parentName?: string; // e.g. City name for Suburb, Province name for City
  stats: LocationStats;
}

export function generateSEOContent({ type, name, parentName, stats }: GeneratorOptions): string {
  const formattedPrice = new Intl.NumberFormat('en-ZA', { 
    style: 'currency', 
    currency: 'ZAR',
    maximumFractionDigits: 0 
  }).format(stats.avgPrice);

  const listingCount = stats.totalListings;
  
  // Return different templates based on location type
  switch (type) {
    case 'province':
      return generateProvinceContent(name, stats, formattedPrice);
    case 'city':
      return generateCityContent(name, parentName || '', stats, formattedPrice);
    case 'suburb':
      return generateSuburbContent(name, parentName || '', stats, formattedPrice);
    default:
      return '';
  }
}

function generateProvinceContent(name: string, stats: LocationStats, formattedPrice: string): string {
  // Rotate opening phrases to add variety
  const openers = [
    `<p>Discover the vibrant real estate market in <strong>${name}</strong>, a premier destination for property buyers and investors in South Africa.</p>`,
    `<p><strong>${name}</strong> offers a diverse range of real estate opportunities, from bustling urban centers to serene countryside retreats.</p>`,
    `<p>Explore the best properties for sale in <strong>${name}</strong>. This province is known for its dynamic property market and exceptional lifestyle offerings.</p>`
  ];

  const marketOverview = `
    <h3>Real Estate Market Overview</h3>
    <p>The ${name} property market is currently active with <strong>${stats.totalListings} properties</strong> listed for sale and rent. 
    The average asking price for properties in this region is <strong>${formattedPrice}</strong>, catering to a wide range of budgets.</p>
    ${stats.rentalCount ? `<p>For investors, the rental market is robust with ${stats.rentalCount} active rental listings, offering potential for strong yields.</p>` : ''}
  `;

  const lifestyle = `
    <h3>Lifestyle & Amenities</h3>
    <p>Living in ${name} provides access to world-class amenities, top-rated schools, and excellent healthcare facilities. 
    Whether you are looking for a modern apartment, a family home in a secure estate, or a luxury villa, ${name} has something to offer every lifestyle.</p>
  `;

  const investment = `
    <h3>Why Invest in ${name}?</h3>
    <ul>
      <li><strong>Diverse Portfolio:</strong> From ${stats.minPrice ? 'affordable starter homes' : 'affordable apartments'} to luxury estates.</li>
      <li><strong>Growth Potential:</strong> consistently showing capital appreciation in key areas.</li>
      <li><strong>Rental Demand:</strong> strong demand in major economic hubs.</li>
    </ul>
  `;

  return [
    openers[Math.floor(Math.random() * openers.length)],
    marketOverview,
    lifestyle,
    investment
  ].join('');
}

function generateCityContent(name: string, provinceName: string, stats: LocationStats, formattedPrice: string): string {
  return `
    <p><strong>${name}</strong> is a thriving city located in <strong>${provinceName}</strong>, offering a unique blend of business opportunities and residential charm. 
    It is a sought-after location for professionals, families, and investors alike.</p>

    <h3>Property Market Insights for ${name}</h3>
    <p>With <strong>${stats.totalListings} listings</strong> currently available, the ${name} real estate market is vibrant. 
    The average property price stands at <strong>${formattedPrice}</strong>. 
    ${stats.saleCount ? `buyers can choose from ${stats.saleCount} homes for sale` : 'Various options are available'}, 
    while tenants have access to ${stats.rentalCount || 'numerous'} rental properties.</p>

    <h3>Living in ${name}</h3>
    <p>${name} boasts a well-developed infrastructure with easy access to major highways, public transport, and shopping centers. 
    Residents enjoy a high quality of life with access to parks, recreational facilities, and excellent educational institutions.</p>

    <p><strong>Key Highlights:</strong></p>
    <ul>
      <li>Central business districts and economic hubs.</li>
      <li>Vibrant nightlife, dining, and entertainment options.</li>
      <li>Family-friendly suburbs with secure varied housing options.</li>
    </ul>
  `;
}

function generateSuburbContent(name: string, cityName: string, stats: LocationStats, formattedPrice: string): string {
  return `
    <p>Welcome to <strong>${name}</strong>, a popular suburb situated in the heart of <strong>${cityName}</strong>. 
    Known for its community atmosphere and convenient location, ${name} is a top choice for homebuyers.</p>

    <h3>Buying Property in ${name}</h3>
    <p>There are currently <strong>${stats.totalListings} properties</strong> on the market in ${name}. 
    The area offers excellent value with an average listing price of <strong>${formattedPrice}</strong>. 
    Prospective buyers can find a mix of property types, including apartments, townhouses, and freestanding homes.</p>

    <h3>Area Profile</h3>
    <p>${name} is characterized by its tree-lined streets, local parks, and friendly community. 
    It is conveniently located near major routes, making commuting to ${cityName} center and surrounding areas a breeze. 
    Local amenities include shopping malls, restaurants, and schools, ensuring residents have everything they need on their doorstep.</p>
  `;
}
