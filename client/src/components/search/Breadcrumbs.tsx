import { Link } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbItem } from '@/lib/urlUtils';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
          )}
          {index === items.length - 1 ? (
            // Last item - not a link
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <Link href={item.href}>
              <span className="hover:text-primary hover:underline cursor-pointer transition-colors flex items-center gap-1">
                {index === 0 && <Home className="h-3.5 w-3.5" />}
                {item.label}
              </span>
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
