import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    { label, error, icon, containerClassName = '', className = '', ...props },
    ref
  ) => {
    const inputClasses = [
      'block w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      error
        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
        : 'border-slate-300',
      icon ? 'pl-10' : 'px-3',
      'py-2 sm:text-sm',
      className,
    ].join(' ');

    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input ref={ref} className={inputClasses} {...props} />
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;
