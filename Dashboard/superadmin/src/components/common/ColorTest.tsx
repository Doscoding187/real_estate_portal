import React from 'react';
import theme from '../../styles/theme';

const ColorTest: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Design System Color Test</h1>

      {/* Primary Colors */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Primary Colors</h2>
        <div className="flex space-x-4">
          <div className="flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-lg"
              style={{ backgroundColor: theme.colors.primary.DEFAULT }}
            ></div>
            <span className="mt-2 text-sm">Primary</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-lg"
              style={{ backgroundColor: theme.colors.primary.hover }}
            ></div>
            <span className="mt-2 text-sm">Primary Hover</span>
          </div>
        </div>
      </div>

      {/* Status Colors */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Status Colors</h2>
        <div className="flex space-x-4">
          <div className="flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: theme.colors.status.success.background,
              }}
            >
              <span style={{ color: theme.colors.status.success.DEFAULT }}>
                ✓
              </span>
            </div>
            <span className="mt-2 text-sm">Success</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: theme.colors.status.warning.background,
              }}
            >
              <span style={{ color: theme.colors.status.warning.DEFAULT }}>
                !
              </span>
            </div>
            <span className="mt-2 text-sm">Warning</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: theme.colors.status.error.background }}
            >
              <span style={{ color: theme.colors.status.error.DEFAULT }}>
                ✗
              </span>
            </div>
            <span className="mt-2 text-sm">Error</span>
          </div>
        </div>
      </div>

      {/* Typography Test */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Typography</h2>
        <div className="space-y-2">
          <p
            className="text-xs"
            style={{ fontFamily: theme.typography.font.family }}
          >
            Extra Small Text (text-xs)
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: theme.typography.font.family }}
          >
            Small Text (text-sm)
          </p>
          <p
            className="text-base"
            style={{ fontFamily: theme.typography.font.family }}
          >
            Base Text (text-base)
          </p>
          <p
            className="text-lg"
            style={{ fontFamily: theme.typography.font.family }}
          >
            Large Text (text-lg)
          </p>
          <p
            className="text-xl"
            style={{ fontFamily: theme.typography.font.family }}
          >
            Extra Large Text (text-xl)
          </p>
          <p
            className="text-2xl font-bold"
            style={{ fontFamily: theme.typography.font.family }}
          >
            2XL Text (text-2xl)
          </p>
        </div>
      </div>
    </div>
  );
};

export default ColorTest;
