import { PropertyPriceHeatmap } from '@/components/analytics/PropertyPriceHeatmap';

export default function PriceInsightsTest() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Property Price Insights Test</h1>
          <p className="text-muted-foreground">Testing the new analytics dashboard integration</p>
        </div>

        <PropertyPriceHeatmap
          className="w-full"
          onSuburbSelect={suburb => {
            console.log('Selected suburb:', suburb);
          }}
        />
      </div>
    </div>
  );
}
