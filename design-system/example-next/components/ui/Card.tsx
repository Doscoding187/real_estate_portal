import * as React from 'react';
import clsx from 'clsx';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx('card', className)}>{children}</div>;
}

export function Widget({
  className,
  children,
  scroll,
  fixedHeight,
}: {
  className?: string;
  children: React.ReactNode;
  scroll?: boolean;
  fixedHeight?: number;
}) {
  return (
    <div
      className={clsx(
        'widget',
        scroll && 'widget--scroll',
        fixedHeight && 'widget--fixed-400',
        className,
      )}
      style={fixedHeight ? { height: fixedHeight } : undefined}
    >
      {children}
    </div>
  );
}

export default Card;
