import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  containerClassName?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      containerClassName = '',
      className = '',
      ...props
    },
    ref
  ) => {
    const selectClasses = [
      'block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      error
        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
        : 'border-slate-300',
      'px-3 py-2 sm:text-sm',
      className,
    ].join(' ');

    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        <select ref={ref} className={selectClasses} {...props}>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
