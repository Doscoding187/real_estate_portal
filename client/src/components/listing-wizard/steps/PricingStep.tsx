/**
 * Step 4: Dynamic Pricing Fields
 *
 * Adapts pricing fields based on action type (sell/rent/auction)
 */

import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { BondCalculator } from '@/components/BondCalculator';
import { calculateTransferCosts, calculateMonthlyRepayment } from '@/lib/bond-calculator';
import type { SellPricing, RentPricing, AuctionPricing } from '@/../../shared/listing-types';

const PricingStep: React.FC = () => {
  const { action, pricing, setPricing } = useListingWizardStore();

  if (!action) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please select an action type first (Sell/Rent/Auction)
      </div>
    );
  }

  return (
    <div className="py-4">
      {action === 'sell' && (
        <SellPricingForm pricing={pricing as SellPricing} setPricing={setPricing} />
      )}
      {action === 'rent' && (
        <RentPricingForm pricing={pricing as RentPricing} setPricing={setPricing} />
      )}
      {action === 'auction' && (
        <AuctionPricingForm pricing={pricing as AuctionPricing} setPricing={setPricing} />
      )}
    </div>
  );
};

// SELL Pricing Form
const SellPricingForm: React.FC<{
  pricing?: SellPricing;
  setPricing: (pricing: any) => void;
}> = ({ pricing = {} as SellPricing, setPricing }) => {
  const [showBondCalculator, setShowBondCalculator] = React.useState(false);
  const [estimatedBondRepayment, setEstimatedBondRepayment] = React.useState<number | null>(null);

  const handleChange = (field: keyof SellPricing, value: any) => {
    setPricing({ ...pricing, [field]: value });
  };

  // Auto-calculate transfer costs using accurate SA rates
  React.useEffect(() => {
    if (pricing.askingPrice && !pricing.transferCostEstimate) {
      // Temporarily disable transfer cost calculation
      // const costs = calculateTransferCosts(pricing.askingPrice);
      // handleChange('transferCostEstimate', costs.total);
    }
  }, [pricing.askingPrice]);

  // Calculate estimated bond repayment for display
  React.useEffect(() => {
    if (pricing.askingPrice) {
      const monthlyPayment = calculateMonthlyRepayment(
        pricing.askingPrice, // 0% deposit assumption
        11.75, // Current SA prime rate
        20, // 20 year term
      );
      setEstimatedBondRepayment(monthlyPayment);
    }
  }, [pricing.askingPrice]);

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Sale Pricing</h3>
        <div className="space-y-4">
          {/* Asking Price */}
          <div>
            <Label htmlFor="askingPrice">
              Asking Price (R) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="askingPrice"
              type="number"
              value={pricing.askingPrice || ''}
              onChange={e => handleChange('askingPrice', parseFloat(e.target.value))}
              placeholder="e.g., 2500000"
              min="0"
              step="1000"
            />
            {pricing.askingPrice && (
              <p className="text-sm text-gray-500 mt-1">
                R {pricing.askingPrice.toLocaleString('en-ZA')}
              </p>
            )}
          </div>

          {/* Estimated Bond Repayment Preview */}
          {estimatedBondRepayment && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900">Estimated Bond Repayment</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBondCalculator(!showBondCalculator)}
                >
                  {showBondCalculator ? 'Hide' : 'View'} Calculator
                </Button>
              </div>
              <div className="text-2xl font-bold text-green-600">
                R {Math.round(estimatedBondRepayment).toLocaleString('en-ZA')} /month
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Based on 0% deposit over 20 years at 11.75% p.a.
              </p>
            </div>
          )}

          {/* Negotiable */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="negotiable"
              checked={pricing.negotiable || false}
              onCheckedChange={v => handleChange('negotiable', v)}
            />
            <Label htmlFor="negotiable" className="font-normal">
              Price is negotiable
            </Label>
          </div>

          {/* Transfer Cost Estimate - REMOVED */}
          {/* <div>
            <Label htmlFor="transferCostEstimate">Transfer Cost Estimate (R)</Label>
            <Input
              id="transferCostEstimate"
              type="number"
              value={pricing.transferCostEstimate || ''}
              onChange={e => {
                const value = e.target.value ? parseFloat(e.target.value) : null;
                handleChange('transferCostEstimate', value);
              }}
              placeholder="Estimated transfer and bond costs"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Includes transfer duty, bond costs, and legal fees (auto-calculated)
            </p>
          </div> */}
        </div>
      </div>

      {/* Bond Calculator */}
      {showBondCalculator && pricing.askingPrice && (
        <BondCalculator propertyPrice={pricing.askingPrice} showTransferCosts={true} />
      )}

      {/* Pricing Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Pricing Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Research comparable properties in your area</li>
          <li>• Consider recent market trends and demand</li>
          <li>• Factor in unique features and condition</li>
          <li>• Consult with a real estate agent for valuation</li>
        </ul>
      </div>
    </Card>
  );
};

// RENT Pricing Form
const RentPricingForm: React.FC<{
  pricing?: RentPricing;
  setPricing: (pricing: any) => void;
}> = ({ pricing = {} as RentPricing, setPricing }) => {
  const [availableDate, setAvailableDate] = React.useState<Date | undefined>(
    pricing.availableFrom ? new Date(pricing.availableFrom) : undefined,
  );

  const handleChange = (field: keyof RentPricing, value: any) => {
    setPricing({ ...pricing, [field]: value });
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Rental Pricing</h3>
        <div className="space-y-4">
          {/* Monthly Rent */}
          <div>
            <Label htmlFor="monthlyRent">
              Monthly Rent (R) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="monthlyRent"
              type="number"
              value={pricing.monthlyRent || ''}
              onChange={e => handleChange('monthlyRent', parseFloat(e.target.value))}
              placeholder="e.g., 12000"
              min="0"
              step="100"
            />
            {pricing.monthlyRent && (
              <p className="text-sm text-gray-500 mt-1">
                R {pricing.monthlyRent.toLocaleString('en-ZA')} per month
              </p>
            )}
          </div>

          {/* Deposit */}
          <div>
            <Label htmlFor="deposit">
              Deposit (R) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="deposit"
              type="number"
              value={pricing.deposit || ''}
              onChange={e => handleChange('deposit', parseFloat(e.target.value))}
              placeholder="Usually 1-2 months rent"
              min="0"
            />
            {pricing.monthlyRent && !pricing.deposit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1"
                onClick={() => handleChange('deposit', pricing.monthlyRent)}
              >
                Use 1 month rent
              </Button>
            )}
          </div>

          {/* Lease Terms */}
          <div>
            <Label htmlFor="leaseTerms">Lease Terms</Label>
            <Input
              id="leaseTerms"
              value={pricing.leaseTerms || ''}
              onChange={e => handleChange('leaseTerms', e.target.value)}
              placeholder="e.g., 12 months minimum"
            />
          </div>

          {/* Available From */}
          <div>
            <Label>Available From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {availableDate ? format(availableDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={availableDate}
                  onSelect={date => {
                    setAvailableDate(date);
                    handleChange('availableFrom', date);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Utilities Included */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="utilitiesIncluded"
              checked={pricing.utilitiesIncluded || false}
              onCheckedChange={v => handleChange('utilitiesIncluded', v)}
            />
            <Label htmlFor="utilitiesIncluded" className="font-normal">
              Utilities included in rent (water, electricity, etc.)
            </Label>
          </div>
        </div>
      </div>

      {/* Rental Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Rental Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Competitive pricing attracts quality tenants faster</li>
          <li>• Standard deposit is 1-2 months rent</li>
          <li>• Clearly state what utilities are included</li>
          <li>• Consider offering flexible lease terms</li>
        </ul>
      </div>
    </Card>
  );
};

// AUCTION Pricing Form
const AuctionPricingForm: React.FC<{
  pricing?: AuctionPricing;
  setPricing: (pricing: any) => void;
}> = ({ pricing = {} as AuctionPricing, setPricing }) => {
  const [auctionDate, setAuctionDate] = React.useState<Date | undefined>(
    pricing.auctionDateTime ? new Date(pricing.auctionDateTime) : undefined,
  );

  const handleChange = (field: keyof AuctionPricing, value: any) => {
    setPricing({ ...pricing, [field]: value });
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Auction Details</h3>
        <div className="space-y-4">
          {/* Starting Bid */}
          <div>
            <Label htmlFor="startingBid">
              Starting Bid (R) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="startingBid"
              type="number"
              value={pricing.startingBid || ''}
              onChange={e => handleChange('startingBid', parseFloat(e.target.value))}
              placeholder="e.g., 1500000"
              min="0"
              step="1000"
            />
            {pricing.startingBid && (
              <p className="text-sm text-gray-500 mt-1">
                R {pricing.startingBid.toLocaleString('en-ZA')}
              </p>
            )}
          </div>

          {/* Reserve Price */}
          <div>
            <Label htmlFor="reservePrice">Reserve Price (R)</Label>
            <Input
              id="reservePrice"
              type="number"
              value={pricing.reservePrice || ''}
              onChange={e => handleChange('reservePrice', parseFloat(e.target.value))}
              placeholder="Minimum acceptable price"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: The minimum price you'll accept (not shown to bidders)
            </p>
          </div>

          {/* Auction Date & Time */}
          <div>
            <Label>
              Auction Date & Time <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {auctionDate ? format(auctionDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={auctionDate}
                    onSelect={date => {
                      setAuctionDate(date);
                      handleChange('auctionDateTime', date);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                className="w-32"
                onChange={e => {
                  if (auctionDate) {
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(auctionDate);
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    setAuctionDate(newDate);
                    handleChange('auctionDateTime', newDate);
                  }
                }}
              />
            </div>
          </div>

          {/* Auction Terms Document */}
          <div>
            <Label htmlFor="auctionTerms">Auction Terms Document (Optional)</Label>
            <Input
              id="auctionTerms"
              type="file"
              accept=".pdf"
              onChange={e => {
                // Handle file upload
                const file = e.target.files?.[0];
                if (file) {
                  // TODO: Upload file and get URL
                  console.log('Upload auction terms:', file);
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload PDF with auction terms and conditions
            </p>
          </div>
        </div>
      </div>

      {/* Auction Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Auction Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Set a realistic starting bid to attract bidders</li>
          <li>• Reserve price protects you from low offers</li>
          <li>• Schedule auction at convenient times</li>
          <li>• Provide clear terms and conditions</li>
          <li>• Market extensively before auction date</li>
        </ul>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Important:</strong> Once the auction is live, you cannot change the starting
          bid or reserve price. Make sure all details are correct before publishing.
        </p>
      </div>
    </Card>
  );
};

export default PricingStep;
