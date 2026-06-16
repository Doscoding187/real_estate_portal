import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';

export default function PricingStep() {
  const store = useListingWizardStore();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Pricing</h3>
      <p className="text-sm text-slate-500">Set your pricing details</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(!store.action || store.action === 'sell') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asking Price (ZAR)</label>
            <input
              type="number"
              value={(store.pricing as any)?.askingPrice || ''}
              onChange={(e) => store.setPricing({ ...(store.pricing as any), askingPrice: Number(e.target.value) })}
              placeholder="R 1,500,000"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
        )}
        {store.action === 'rent' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Rent (ZAR)</label>
              <input
                type="number"
                value={(store.pricing as any)?.monthlyRent || ''}
                onChange={(e) => store.setPricing({ ...(store.pricing as any), monthlyRent: Number(e.target.value) })}
                placeholder="R 12,000"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deposit (ZAR)</label>
              <input
                type="number"
                value={(store.pricing as any)?.deposit || ''}
                onChange={(e) => store.setPricing({ ...(store.pricing as any), deposit: Number(e.target.value) })}
                placeholder="R 24,000"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
          </>
        )}
        {store.action === 'auction' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Starting Bid (ZAR)</label>
              <input
                type="number"
                value={(store.pricing as any)?.startingBid || ''}
                onChange={(e) => store.setPricing({ ...(store.pricing as any), startingBid: Number(e.target.value) })}
                placeholder="R 500,000"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reserve Price (optional)</label>
              <input
                type="number"
                value={(store.pricing as any)?.reservePrice || ''}
                onChange={(e) => store.setPricing({ ...(store.pricing as any), reservePrice: Number(e.target.value) })}
                placeholder="R 750,000"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}