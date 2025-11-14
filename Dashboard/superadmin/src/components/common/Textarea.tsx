import React from 'react';

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, containerClassName = '', className = '', ...props },
    ref
  ) => {
    const textareaClasses = [
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
        <textarea ref={ref} className={textareaClasses} {...props} />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
