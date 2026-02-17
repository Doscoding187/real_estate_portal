import type { ReactNode } from 'react';

export function ContentRail({ children }: { children: ReactNode }) {
  return <div className="content-rail">{children}</div>;
}

