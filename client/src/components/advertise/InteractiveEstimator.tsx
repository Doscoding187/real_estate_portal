import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calculator } from 'lucide-react';
import { trackEvent } from '@/lib/tracking';

export function InteractiveEstimator() {
  const [listingCount, setListingCount] = useState([15]);
  const [priceBand, setPriceBand] = useState([1500000]);

  // V1 Heuristic
  const areaDemandScore = 1.2;
  const priceBandFactor = priceBand[0] > 2000000 ? 0.8 : 1.5;
  const estimatedLeads = Math.round(areaDemandScore * listingCount[0] * priceBandFactor * 5.5);
  const estimatedViews = estimatedLeads * 14;

  useEffect(() => {
    const timer = setTimeout(() => {
      trackEvent('estimator_used', {
        priceBand: priceBand[0].toString(),
        listings: listingCount[0],
        estimatedLeads: Math.ceil(estimatedLeads * 1.3)
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [listingCount, priceBand, estimatedLeads]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <Card className="w-full shadow-lg border-primary/10">
      <CardHeader className="bg-slate-50 border-b pb-6">
        <div className="flex items-center space-x-3 text-primary">
          <Calculator className="h-6 w-6" />
          <CardTitle className="text-xl">ROI Estimator</CardTitle>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Adjust the sliders below to see your potential monthly reach.
        </p>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Active Listings</Label>
              <span className="font-semibold text-primary">{listingCount[0]} properties</span>
            </div>
            <Slider
              value={listingCount}
              onValueChange={setListingCount}
              min={1}
              max={100}
              step={1}
              className="py-4"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Average Price Band</Label>
              <span className="font-semibold text-primary">{formatCurrency(priceBand[0])}</span>
            </div>
            <Slider
              value={priceBand}
              onValueChange={setPriceBand}
              min={500000}
              max={10000000}
              step={100000}
              className="py-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t mt-8">
            <div className="bg-primary/5 rounded-xl p-5 text-center col-span-2">
              <div className="text-4xl font-bold text-primary mb-1">
                {Math.floor(estimatedLeads * 0.7)} – {Math.ceil(estimatedLeads * 1.3)}
              </div>
              <div className="text-sm text-slate-600 font-semibold uppercase tracking-wider">Estimated Monthly Buyer Inquiries</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center">
               <div className="text-xl text-emerald-700 font-bold mb-1">High</div>
               <div className="text-xs text-emerald-600/80 font-medium uppercase tracking-wider">Buyer Intent Level</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-center">
               <div className="text-xl text-amber-700 font-bold mb-1">Medium</div>
               <div className="text-xs text-amber-600/80 font-medium uppercase tracking-wider">Local Competition</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center col-span-2 mt-2">
              <div className="flex items-center justify-center gap-4">
                <div className="text-3xl font-bold text-blue-700 mb-1">
                  {Math.min(9.8, ((areaDemandScore + priceBandFactor * 2.5) * 1.4)).toFixed(1)} / 10
                </div>
                <div className="text-left">
                  <div className="text-sm text-blue-800 font-bold">Opportunity Score</div>
                  <div className="text-xs text-blue-600/80">Based on demand vs supply in your pricing band</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
