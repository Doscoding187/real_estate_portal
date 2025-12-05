import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Copy, Trash2, Home, Bed, Bath, Maximize } from 'lucide-react';
import type { UnitType } from '@/hooks/useDevelopmentWizard';

interface UnitTypeCardProps {
  unitType: UnitType;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function UnitTypeCard({ unitType, onEdit, onDuplicate, onDelete }: UnitTypeCardProps) {
  const formatPrice = (price: number) => {
    return `R${price.toLocaleString()}`;
  };

  const getStructuralLabel = (type: UnitType['structuralType']) => {
    const labels = {
      apartment: 'Apartment',
      'freestanding-house': 'Freestanding House',
      simplex: 'Simplex',
      duplex: 'Duplex',
      penthouse: 'Penthouse',
      'plot-and-plan': 'Plot & Plan',
      townhouse: 'Townhouse',
      studio: 'Studio',
    };
    return labels[type];
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300 bg-gradient-to-br from-white to-slate-50/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 mb-1">{unitType.label}</h3>
          <p className="text-sm text-slate-600">{getStructuralLabel(unitType.structuralType)}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDuplicate}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Bed className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium">{unitType.bedrooms} Bed</span>
        </div>
        <div className="flex items-center gap-2">
          <Bath className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium">{unitType.bathrooms} Bath</span>
        </div>
        {unitType.unitSize && (
          <div className="flex items-center gap-2">
            <Maximize className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium">{unitType.unitSize}m²</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium">{unitType.availableUnits} units</span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Price Range</span>
          <span className="text-lg font-bold text-blue-600">
            {formatPrice(unitType.priceFrom)}
            {unitType.priceTo && ` - ${formatPrice(unitType.priceTo)}`}
          </span>
        </div>
      </div>
    </Card>
  );
}
