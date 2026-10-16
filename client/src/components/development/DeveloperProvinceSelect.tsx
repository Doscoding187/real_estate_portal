import { useId } from 'react';
import { DEVELOPER_DISCOVERY_PROVINCES } from '@shared/developerDiscovery';

export function DeveloperProvinceSelect({
  province,
  invalid = false,
  onChange,
}: {
  province?: string;
  invalid?: boolean;
  onChange: (province: string | undefined) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
        Project province
      </label>
      <select
        id={id}
        value={invalid ? 'invalid' : province || 'all'}
        onChange={event => onChange(event.target.value === 'all' ? undefined : event.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
      >
        {invalid && (
          <option value="invalid" disabled>
            Choose a valid province
          </option>
        )}
        <option value="all">All provinces</option>
        {DEVELOPER_DISCOVERY_PROVINCES.map(name => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
