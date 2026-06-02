import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AcceleratorMatchSnapshot } from './acceleratorTypes';

function formatRand(amount: number) {
  return `R${Math.round(amount).toLocaleString('en-ZA')}`;
}

type MatchTransactionType = 'sale' | 'rent' | 'auction';

export function normalizeAcceleratorMatchTransactionType(value: unknown): MatchTransactionType {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'rent' || normalized === 'rental' || normalized === 'for_rent' || normalized === 'to-rent') {
    return 'rent';
  }
  if (normalized === 'auction') return 'auction';
  return 'sale';
}

export function getAcceleratorMatchPriceText(input: {
  transactionType?: unknown;
  priceFrom: number;
  priceTo?: number | null;
}) {
  const transactionType = normalizeAcceleratorMatchTransactionType(input.transactionType);
  const from = Number(input.priceFrom || 0);
  const to = Number(input.priceTo || 0);
  const range = `${formatRand(from)}${to > from ? ` - ${formatRand(to)}` : ''}`;
  if (transactionType === 'rent') {
    return {
      transactionType,
      label: 'Monthly rent',
      text: `${range} / month`,
    };
  }
  if (transactionType === 'auction') {
    return {
      transactionType,
      label: 'Starting bid',
      text: range,
    };
  }
  return {
    transactionType,
    label: 'Price',
    text: range,
  };
}

export function MatchesGrid({
  snapshot,
  assessmentId,
  onSubmitReferral,
}: {
  snapshot: AcceleratorMatchSnapshot;
  assessmentId: string;
  onSubmitReferral: (developmentId: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Matches ({snapshot.matches.length}) - Snapshot {snapshot.matchSnapshotId}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snapshot.matches.length ? (
          <p className="text-sm text-slate-500">
            No developments currently match this affordability ceiling in the selected location.
          </p>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {snapshot.matches.map(match => (
            <div key={match.developmentId} className="rounded border bg-white p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{match.developmentName}</p>
                  <p className="text-xs text-slate-500">{match.area}</p>
                </div>
                {match.logoUrl ? (
                  <img src={match.logoUrl} alt="" className="h-8 w-8 rounded object-cover" />
                ) : null}
              </div>

              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="outline">Best fit {(match.bestFitRatio * 100).toFixed(1)}%</Badge>
                <Badge variant="secondary">Affordability ceiling {formatRand(match.purchasePrice)}</Badge>
              </div>

              <div className="space-y-1 text-sm">
                {match.unitOptions.slice(0, 4).map(unit => {
                  const pricing = getAcceleratorMatchPriceText({
                    transactionType: unit.transactionType || match.transactionType,
                    priceFrom: unit.priceFrom,
                    priceTo: unit.priceTo,
                  });
                  return (
                    <div
                      key={`${match.developmentId}-${unit.unitTypeId || unit.unitName}`}
                      className="flex items-center justify-between gap-3 rounded border px-2 py-1"
                    >
                      <span>{unit.unitName}</span>
                      <span className="text-right">
                        <span className="block text-[10px] font-semibold uppercase text-slate-500">
                          {pricing.label}
                        </span>
                        <span className="font-medium">{pricing.text}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                className="mt-3 h-9 rounded border px-3 text-sm font-medium"
                onClick={() => onSubmitReferral(Number(match.developmentId))}
              >
                Submit referral with this match
              </button>
              <p className="mt-1 text-xs text-slate-500">Assessment attached: {assessmentId}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
