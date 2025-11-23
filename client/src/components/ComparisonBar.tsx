import { useComparison } from '@/contexts/ComparisonContext';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

export function ComparisonBar() {
  const { comparedProperties, removeFromComparison, clearComparison } = useComparison();
  const [, setLocation] = useLocation();

  if (comparedProperties.length === 0) {
    return null;
  }

  const handleCompare = () => {
    setLocation('/compare');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 transition-all duration-300 ease-in-out">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              Compare Properties ({comparedProperties.length}/4)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearComparison}
              className="text-slate-500 hover:text-slate-700"
            >
              Clear All
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2 overflow-x-auto max-w-md">
              {comparedProperties.map((propertyId) => (
                <div
                  key={propertyId}
                  className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-1 text-sm"
                >
                  <span className="text-slate-600">Property #{propertyId}</span>
                  <button
                    onClick={() => removeFromComparison(propertyId)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              onClick={handleCompare}
              disabled={comparedProperties.length < 2}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Compare
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
