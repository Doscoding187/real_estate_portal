/**
 * Prints the published guide copy as a review sheet.
 *
 * The sheet is generated from the same content the site serves, so a review can never be
 * based on a stale copy. Run it with:
 *   pnpm tsx scripts/print-guide-copy.ts
 */
import { getProvinceGuideContent } from '../shared/provinceGuideContent';
import { getCityGuideContent } from '../shared/cityGuideContent';
import { SUBURB_GUIDE_PILOT } from '../shared/suburbGuidePolicy';

function renderProvince(): string {
  const guide = getProvinceGuideContent('gauteng');
  if (!guide) throw new Error('The Gauteng guide content is missing.');
  const lines: string[] = [];
  lines.push(
    `# ${guide.name}`,
    '',
    `URL: /${guide.slug}`,
    `Page title: ${guide.title}`,
    `Meta description: ${guide.description}`,
    `Status: ${guide.status}`,
    `Sources checked: ${guide.sourceCheckedOn}`,
    '',
    '### Introduction',
    '',
    guide.introduction,
    '',
  );

  for (const region of guide.regions) {
    lines.push(
      `### ${region.name} (${region.kind})`,
      '',
      `*${region.strapline}*`,
      '',
      region.summary,
      '',
      ...region.paragraphs.flatMap(paragraph => [paragraph, '']),
      `**What to weigh up:** ${region.consider}`,
      '',
      `Places named: ${region.places.map(place => place.name).join(', ')}`,
      '',
      `Sources: ${region.sourceIds.join(', ')}`,
      '',
    );
  }

  for (const collection of guide.collections) {
    lines.push(
      `### Collection: ${collection.label}`,
      '',
      collection.description,
      '',
      collection.context,
      '',
      `Places: ${collection.places.map(place => `${place.name} (${place.caption})`).join('; ')}`,
      '',
      `Sources: ${collection.sourceIds.join(', ')}`,
      '',
    );
  }

  lines.push('### Everyday life', '');
  for (const item of guide.practical) {
    lines.push(
      `**${item.title}**`,
      '',
      item.text,
      '',
      `Sources: ${item.sourceIds.join(', ') || 'none'}`,
      '',
    );
  }

  lines.push('### Questions', '');
  for (const faq of guide.faqs) {
    lines.push(`**${faq.question}**`, '', faq.answer, '');
  }

  lines.push('### Source register', '');
  for (const source of guide.sources) {
    lines.push(`- ${source.title} — ${source.url}${source.note ? ` — ${source.note}` : ''}`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderCity(): string {
  const guide = getCityGuideContent('gauteng', 'johannesburg');
  if (!guide) throw new Error('The Johannesburg guide content is missing.');
  const lines: string[] = [];
  lines.push(
    `# ${guide.name}`,
    '',
    `URL: /${guide.provinceSlug}/${guide.slug}`,
    `Page title: ${guide.title}`,
    `Meta description: ${guide.description}`,
    `Status: ${guide.status}`,
    `Sources checked: ${guide.sourceCheckedOn}`,
    '',
    '### Introduction',
    '',
    guide.introduction,
    '',
  );

  for (const collection of guide.collections) {
    lines.push(
      `### Collection: ${collection.label}`,
      '',
      collection.description,
      '',
      collection.context,
      '',
      `Places: ${collection.places.map(place => `${place.name} (${place.caption})`).join('; ')}`,
      '',
      `Sources: ${collection.sourceIds.join(', ')}`,
      '',
    );
  }

  for (const region of guide.regions) {
    lines.push(
      `### ${region.title}`,
      '',
      region.text,
      '',
      `**What to weigh up:** ${region.consider}`,
      '',
      `Places named: ${region.places.join(', ')}`,
      '',
    );
  }

  lines.push('### Everyday life', '');
  for (const item of guide.practical) {
    lines.push(
      `**${item.title}**`,
      '',
      item.text,
      '',
      `Sources: ${item.sourceIds.join(', ') || 'none'}`,
      '',
    );
  }

  lines.push('### Questions', '');
  for (const faq of guide.faqs) {
    lines.push(`**${faq.question}**`, '', faq.answer, '');
  }

  lines.push('### Source register', '');
  for (const source of guide.sources) {
    lines.push(`- ${source.title} — ${source.url}`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderSuburbPilot(): string {
  const { provinceSlug, citySlug, suburbSlug } = SUBURB_GUIDE_PILOT;
  const cityGuide = getCityGuideContent(provinceSlug, citySlug);
  const region = cityGuide?.regions.find(
    candidate => candidate.id === SUBURB_GUIDE_PILOT.cityContextRegionId,
  );
  const lines: string[] = [
    `# Sandton`,
    '',
    `URL: /${provinceSlug}/${citySlug}/${suburbSlug}`,
    `Subtitle: Explore homes for sale, rentals and new developments in Sandton, Johannesburg.`,
    `Status: inherited from the ${cityGuide?.name ?? citySlug} guide (${cityGuide?.status ?? 'unknown'})`,
    '',
    'The suburb pilot reuses the reviewed city-guide chapter below as its "Where Sandton fits in',
    'the city" section. It adds no new claims of its own.',
    '',
    '### Reused city-guide chapter',
    '',
    region ? `**${region.title}**` : 'Missing',
    '',
    region?.text ?? '',
    '',
    region ? `**What to weigh up:** ${region.consider}` : '',
    '',
    '### The suburb page itself',
    '',
    'Live content that is not part of the copy review:',
    '',
    '- current listings for sale and to rent, and their asking-price medians',
    '- nearby schools, healthcare, shopping, transport and leisure from Google Places',
    '- published developments in the suburb',
    '- agencies and individual practitioners serving the suburb',
    '- other areas to explore nearby',
    '',
  ];
  return lines.join('\n');
}

function main() {
  const output = [
    '# Guide pilot copy review sheet',
    '',
    'Generated from the published guide content. Review the wording, the claims and the source',
    'register. Approving this sheet approves the guide copy for publication.',
    '',
    '---',
    '',
    renderProvince(),
    '---',
    '',
    renderCity(),
    '---',
    '',
    renderSuburbPilot(),
  ].join('\n');
  process.stdout.write(output);
}

main();
