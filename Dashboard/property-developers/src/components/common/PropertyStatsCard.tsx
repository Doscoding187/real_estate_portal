import React from 'react';

interface PropertyStatsCardProps {
  title: string;
  value: string;
  percentage?: string;
  color?: string;
  icon: 'apartment' | 'house' | 'building';
  onClick?: () => void;
}

const ApartmentIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const HouseIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const BuildingIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"
    />
  </svg>
);

const PropertyStatsCard: React.FC<PropertyStatsCardProps> = ({
  title,
  value,
  percentage,
  color = 'bg-blue-50',
  icon,
  onClick,
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'apartment':
        return <ApartmentIcon className="h-8 w-8 text-blue-600" />;
      case 'house':
        return <HouseIcon className="h-8 w-8 text-blue-600" />;
      case 'building':
        return <BuildingIcon className="h-8 w-8 text-blue-600" />;
      default:
        return <ApartmentIcon className="h-8 w-8 text-blue-600" />;
    }
  };

  return (
    <div
      className={`${color} rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-md`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-white rounded-lg shadow-sm">{getIcon()}</div>
        {percentage && (
          <div className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
            {percentage}
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="w-full h-12 bg-white bg-opacity-50 rounded-lg flex items-center justify-center mb-3">
          <div className="w-16 h-8 bg-gradient-to-r from-blue-200 to-blue-300 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-blue-800">LOGO</span>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
  );
};

export default PropertyStatsCard;
