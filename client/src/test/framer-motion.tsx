import React from 'react';

const MOTION_PROPS = new Set([
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileInView',
  'animate',
  'initial',
  'exit',
  'transition',
  'variants',
  'layout',
  'layoutId',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'onAnimationStart',
  'onAnimationComplete',
]);

function stripMotionProps(props: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const key of Object.keys(props)) {
    if (!MOTION_PROPS.has(key)) out[key] = props[key];
  }
  return out;
}

function makeMotionTag(tag: keyof JSX.IntrinsicElements) {
  return React.forwardRef<any, any>((props, ref) =>
    React.createElement(tag, { ...stripMotionProps(props), ref }, props.children),
  );
}

export const motion = new Proxy(
  {},
  {
    get: (_target, key: string) => makeMotionTag(key as any),
  },
);

export const AnimatePresence: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;
export const LazyMotion: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;
export const useInView = () => true;
