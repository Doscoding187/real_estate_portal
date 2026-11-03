import { Button } from '@/components/ui/button';
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/features/services/catalog';

type CategoryChipsProps = {
  active?: ServiceCategory | null;
  onSelect: (category: ServiceCategory) => void;
};

export function CategoryChips({ active, onSelect }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SERVICE_CATEGORIES.map(category => (
        <Button
          key={category.value}
          variant={active === category.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(category.value)}
          className="rounded-full"
        >
          {category.shortLabel}
        </Button>
      ))}
    </div>
  );
}
