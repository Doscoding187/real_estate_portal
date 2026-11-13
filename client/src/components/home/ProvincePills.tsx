import { HOME_PROVINCE_OPTIONS } from '@/lib/homeProvinceOptions';

/**
 * The nine province pills shared by the homepage sections. One selection drives the whole page
 * (see docs/product/homepage/README.md); each section shows its own row.
 */
export function ProvincePills({
  selectedProvince,
  onProvinceChange,
  label = 'Province',
}: {
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  label?: string;
}) {
  return (
    <div className="home-section-tabs scrollbar-hide -mx-4 flex justify-start overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div
        role="group"
        aria-label={label}
        className="inline-flex h-auto flex-nowrap justify-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5"
      >
        {HOME_PROVINCE_OPTIONS.map(province => (
          <button
            key={province}
            type="button"
            aria-pressed={selectedProvince === province}
            onClick={() => onProvinceChange(province)}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-[13px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 md:px-4 md:text-sm ${
              selectedProvince === province
                ? 'bg-[#2774AE] text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-white hover:text-[#2774AE]'
            }`}
          >
            {province}
          </button>
        ))}
      </div>
    </div>
  );
}
