/**
 * Unit Match Display Component
 *
 * Shows units filtered and categorized by buyer's affordability
 * with visual indicators for match levels.
 *
 * Validates: Requirements 16.1, 16.2, 16.3
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Bed, Bath, Maximize, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { formatSARandShort } from '@/lib/bond-calculator';

interface UnitMatch {
  matchLevel: 'perfect' | 'good' | 'stretch' | 'out_of_reach';
  matchPercentage: number;
  monthlyPayment: number;
  downPaymentNeeded: number;
  message: string;
}

interface Unit {
  id: number;
  unitNumber: string;
  unitType: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  price: string;
  status: string;
  match?: UnitMatch | null;
}

interface UnitMatchDisplayProps {
  units: Unit[];
  onUnitSelect?: (unit: Unit) => void;
  onReserve?: (unit: Unit) => void;
}

export function UnitMatchDisplay({ units, onUnitSelect, onReserve }: UnitMatchDisplayProps) {
  const getMatchBadge = (matchLevel: string) => {
    switch (matchLevel) {
      case 'perfect':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Perfect Match
          </Badge>
        );
      case 'good':
        return (
          <Badge className="bg-blue-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Good Match
          </Badge>
        );
      case 'stretch':
        return (
          <Badge className="bg-yellow-500 text-white">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Stretch
          </Badge>
        );
      case 'out_of_reach':
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="h-3 w-3 mr-1" />
            Out of Reach
          </Badge>
        );
      default:
        return null;
    }
  };

  const getMatchBorderColor = (matchLevel: string) => {
    switch (matchLevel) {
      case 'perfect':
        return 'border-green-300';
      case 'good':
        return 'border-blue-300';
      case 'stretch':
        return 'border-yellow-300';
      case 'out_of_reach':
        return 'border-red-300';
      default:
        return 'border-gray-200';
    }
  };

  const getMatchBgColor = (matchLevel: string) => {
    switch (matchLevel) {
      case 'perfect':
        return 'bg-green-50';
      case 'good':
        return 'bg-blue-50';
      case 'stretch':
        return 'bg-yellow-50';
      case 'out_of_reach':
        return 'bg-red-50';
      default:
        return 'bg-white';
    }
  };

  // Group units by match level
  const perfectMatches = units.filter(u => u.match?.matchLevel === 'perfect');
  const goodMatches = units.filter(u => u.match?.matchLevel === 'good');
  const stretchMatches = units.filter(u => u.match?.matchLevel === 'stretch');
  const outOfReach = units.filter(u => u.match?.matchLevel === 'out_of_reach');

  const renderUnitCard = (unit: Unit) => {
    const match = unit.match;
    const matchLevel = match?.matchLevel || 'out_of_reach';

    return (
      <Card
        key={unit.id}
        className={`p-4 border-2 ${getMatchBorderColor(matchLevel)} ${getMatchBgColor(matchLevel)} hover:shadow-lg transition-shadow cursor-pointer`}
        onClick={() => onUnitSelect?.(unit)}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-lg">Unit {unit.unitNumber}</h4>
              <p className="text-sm text-gray-600 capitalize">{unit.unitType.replace('_', ' ')}</p>
            </div>
            {match && getMatchBadge(matchLevel)}
          </div>

          {/* Unit Details */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{unit.bedrooms} bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{unit.bathrooms} bath</span>
            </div>
            <div className="flex items-center gap-1">
              <Maximize className="h-4 w-4" />
              <span>{unit.size}m²</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Price</p>
              <p className="text-xl font-bold text-gray-900">
                {formatSARandShort(parseFloat(unit.price))}
              </p>
            </div>
            {match && (
              <div className="text-right">
                <p className="text-xs text-gray-600">Monthly</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatSARandShort(match.monthlyPayment / 100)}
                </p>
              </div>
            )}
          </div>

          {/* Match Message */}
          {match && (
            <div className="text-sm text-gray-700 bg-white/50 rounded p-2">{match.message}</div>
          )}

          {/* Actions */}
          {match && matchLevel !== 'out_of_reach' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={e => {
                  e.stopPropagation();
                  onUnitSelect?.(unit);
                }}
              >
                View Details
              </Button>
              {matchLevel === 'perfect' && (
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={e => {
                    e.stopPropagation();
                    onReserve?.(unit);
                  }}
                >
                  Reserve Now
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-gray-600 mb-1">Perfect Matches</p>
          <p className="text-3xl font-bold text-green-600">{perfectMatches.length}</p>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Good Matches</p>
          <p className="text-3xl font-bold text-blue-600">{goodMatches.length}</p>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-gray-600 mb-1">Stretch</p>
          <p className="text-3xl font-bold text-yellow-600">{stretchMatches.length}</p>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-gray-600 mb-1">Out of Reach</p>
          <p className="text-3xl font-bold text-red-600">{outOfReach.length}</p>
        </Card>
      </div>

      {/* Perfect Matches */}
      {perfectMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Perfect Matches</h3>
            <Badge className="bg-green-500 text-white">{perfectMatches.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {perfectMatches.map(renderUnitCard)}
          </div>
        </div>
      )}

      {/* Good Matches */}
      {goodMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Good Matches</h3>
            <Badge className="bg-blue-500 text-white">{goodMatches.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goodMatches.map(renderUnitCard)}
          </div>
        </div>
      )}

      {/* Stretch Matches */}
      {stretchMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold">Stretch Options</h3>
            <Badge className="bg-yellow-500 text-white">{stretchMatches.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stretchMatches.map(renderUnitCard)}
          </div>
        </div>
      )}

      {/* Out of Reach */}
      {outOfReach.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold">Currently Out of Reach</h3>
            <Badge className="bg-red-500 text-white">{outOfReach.length}</Badge>
          </div>
          <p className="text-sm text-gray-600">
            These units are currently above your affordability range. Consider increasing your
            deposit or improving your financial profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {outOfReach.slice(0, 3).map(renderUnitCard)}
          </div>
        </div>
      )}

      {units.length === 0 && (
        <Card className="p-8 text-center">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Units Available</h3>
          <p className="text-gray-600">
            There are currently no units available for this development.
          </p>
        </Card>
      )}
    </div>
  );
}
