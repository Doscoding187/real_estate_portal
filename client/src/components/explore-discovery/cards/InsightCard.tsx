import { TrendingUp, BarChart3, Info } from 'lucide-react';
import { useState } from 'react';

interface InsightCardProps {
  insight: {
    id: number;
    title: string;
    description: string;
    imageUrl?: string;
    insightType: 'market-trend' | 'price-analysis' | 'investment-tip' | 'area-spotlight';
    data?: {
      value: string;
      change?: number;
      label?: string;
    };
  };
  onClick: () => void;
}

export function InsightCard({ insight, onClick }: InsightCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const getIcon = () => {
    switch (insight.insightType) {
      case 'market-trend':
        return <TrendingUp className="w-5 h-5" />;
      case 'price-analysis':
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getGradient = () => {
    switch (insight.insightType) {
      case 'market-trend':
        return 'from-green-500 to-emerald-600';
      case 'price-analysis':
        return 'from-blue-500 to-indigo-600';
      case 'investment-tip':
        return 'from-purple-500 to-pink-600';
      case 'area-spotlight':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
    >
      {/* Header with gradient */}
      <div className={`relative p-4 bg-gradient-to-br ${getGradient()} text-white`}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            {getIcon()}
          </div>
          <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
            Insight
          </span>
        </div>

        {/* Data display */}
        {insight.data && (
          <div className="mb-2">
            <div className="text-3xl font-bold mb-1">{insight.data.value}</div>
            {insight.data.change !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className={`w-4 h-4 ${insight.data.change < 0 ? 'rotate-180' : ''}`} />
                <span>{Math.abs(insight.data.change)}% {insight.data.change >= 0 ? 'increase' : 'decrease'}</span>
              </div>
            )}
            {insight.data.label && (
              <div className="text-xs text-white/80 mt-1">{insight.data.label}</div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {insight.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-3">
          {insight.description}
        </p>
      </div>

      {/* Optional image */}
      {insight.imageUrl && (
        <div className="relative h-32 overflow-hidden bg-gray-100">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gray-200" />
          )}
          <img
            src={insight.imageUrl}
            alt={insight.title}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        </div>
      )}

      {/* Read more indicator */}
      <div className="px-4 pb-4">
        <div className="text-sm font-medium text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
          <span>Learn more</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </div>
  );
}
