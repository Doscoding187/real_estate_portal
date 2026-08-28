import type { SVGProps } from 'react';

type HouseMeasureIconProps = Omit<SVGProps<SVGSVGElement>, 'strokeWidth'> & {
  strokeWidth?: number;
};

export const HouseMeasureIcon = ({
  className = 'w-4 h-4',
  strokeWidth = 2,
  ...props
}: HouseMeasureIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* A house sits inside a plot boundary, with a clear width marker.
          It distinguishes usable floor area from a generic ruler or land size. */}
      <rect x="2.75" y="4.25" width="18.5" height="15.5" rx="1.5" strokeDasharray="2 2" />
      <path d="M7 12.25 12 8l5 4.25v4.5H7z" />
      <path d="M10.25 16.75v-2.75h3.5v2.75" />
      <path d="M4 21h16" />
      <path d="m4 21 2-2M4 21l2 2M20 21l-2-2M20 21l-2 2" />
    </svg>
  );
};
