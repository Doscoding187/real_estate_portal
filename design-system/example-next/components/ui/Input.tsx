import * as React from 'react';
import clsx from 'clsx';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function Input({ label, hint, className, ...props }: InputProps) {
  return (
    <label className="block">
      {label ? <div className="typ-body-s text-gray-700 mb-1">{label}</div> : null}
      <input className={clsx('input', className)} {...props} />
      {hint ? <div className="typ-body-s text-gray-500 mt-1">{hint}</div> : null}
    </label>
  );
}

export default Input;
