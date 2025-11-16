import * as React from 'react';
import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Button({
  variant = 'primary',
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx('btn', variant === 'primary' ? 'btn-primary' : 'btn-secondary', className)}
      {...props}
    >
      {leftIcon ? <span className="icon-md icon">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="icon-md icon">{rightIcon}</span> : null}
    </button>
  );
}

export default Button;
