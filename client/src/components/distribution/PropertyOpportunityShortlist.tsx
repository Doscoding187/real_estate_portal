import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ShortlistOption = {
  id: number | string;
  name: string;
  location: string;
  publisher?: string | null;
  imageUrl?: string | null;
  url?: string | null;
  priceLabel: string;
  availabilityLabel: string;
  propertyDetails?: string[];
  description?: string | null;
};

function currentTimestamp() {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());
}

export function PropertyOpportunityShortlist({
  marketMode,
  searchSummary,
  opportunities,
}: {
  marketMode: 'sale' | 'rent';
  searchSummary: string;
  opportunities: ShortlistOption[];
}) {
  if (!opportunities.length) return null;
  const generatedAt = currentTimestamp();

  return (
    <>
      <style>{`
        .distribution-shortlist-print { display: none !important; }
        @media print {
          @page { margin: 16mm; }
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .distribution-shortlist-print,
          .distribution-shortlist-print * { visibility: visible !important; }
          .distribution-shortlist-print {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            padding: 12mm !important;
            overflow: visible !important;
            color: #0f172a !important;
            background: #fff !important;
            font-family: Arial, sans-serif !important;
          }
          .distribution-shortlist-print__option { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      <Button type="button" variant="outline" onClick={() => window.print()} className="print:hidden">
        <Download className="mr-2 h-4 w-4" /> Print or save shortlist as PDF
      </Button>
      <section className="distribution-shortlist-print" aria-hidden="true">
        <header style={{ borderBottom: '2px solid #0f5ea8', paddingBottom: 18, marginBottom: 22 }}>
          <p style={{ color: '#0f5ea8', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Property Listify
          </p>
          <h1 style={{ margin: '8px 0', fontSize: 26 }}>Property opportunity shortlist</h1>
          <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
            {marketMode === 'sale' ? 'Purchase' : 'Rental'} options · Prepared {generatedAt}
          </p>
        </header>

        <section style={{ marginBottom: 22, borderRadius: 8, background: '#f1f5f9', padding: 14 }}>
          <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
            Search preferences
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>{searchSummary}</p>
        </section>

        <div style={{ display: 'grid', gap: 14 }}>
          {opportunities.map((option, index) => (
            <article
              key={option.id}
              className="distribution-shortlist-print__option"
              style={{ display: 'grid', gridTemplateColumns: option.imageUrl ? '130px 1fr' : '1fr', gap: 16, border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}
            >
              {option.imageUrl ? (
                <img src={option.imageUrl} alt="" style={{ width: 130, height: 96, borderRadius: 5, objectFit: 'cover' }} />
              ) : null}
              <div>
                <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                  Option {index + 1}
                </p>
                <h2 style={{ margin: '0 0 3px', fontSize: 17 }}>{option.name}</h2>
                <p style={{ margin: '0 0 8px', color: '#475569', fontSize: 12 }}>{option.location}</p>
                <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 700 }}>{option.priceLabel}</p>
                <p style={{ margin: 0, color: '#475569', fontSize: 11 }}>{option.availabilityLabel}</p>
                {option.propertyDetails?.length ? (
                  <p style={{ margin: '7px 0 0', color: '#475569', fontSize: 11 }}>
                    {option.propertyDetails.join(' · ')}
                  </p>
                ) : null}
                {option.publisher ? (
                  <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: 10 }}>
                    Published by {option.publisher}
                  </p>
                ) : null}
                {option.description ? (
                  <p style={{ margin: '7px 0 0', color: '#334155', fontSize: 11, lineHeight: 1.45 }}>
                    {option.description}
                  </p>
                ) : null}
                {option.url ? (
                  <p style={{ margin: '7px 0 0', color: '#0f5ea8', fontSize: 10 }}>
                    propertylistifysa.co.za{option.url}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <footer style={{ marginTop: 24, borderTop: '1px solid #cbd5e1', paddingTop: 12, color: '#475569', fontSize: 10, lineHeight: 1.5 }}>
          These options match the search preferences shown above. This shortlist is for discussion
          only. It is not a credit assessment, loan approval, property offer, or guarantee of
          availability. Prices and stock can change; confirm current details with the developer.
        </footer>
      </section>
    </>
  );
}
