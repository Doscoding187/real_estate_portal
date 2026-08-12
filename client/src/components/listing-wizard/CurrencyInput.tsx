import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  value?: number | null;
  onValueChange: (value: number | undefined) => void;
}

export const sanitizeCurrencyText = (value: string) => {
  const withoutSeparators = value.replace(/,/g, '');
  const digitsAndDecimal = withoutSeparators.replace(/[^0-9.]/g, '');
  const [whole, ...decimalParts] = digitsAndDecimal.split('.');
  return decimalParts.length > 0 ? `${whole}.${decimalParts.join('')}` : whole;
};

export function CurrencyInput({
  value,
  onValueChange,
  className,
  onBlur,
  onFocus,
  onWheel,
  ...props
}: CurrencyInputProps) {
  const [draft, setDraft] = React.useState(
    value === undefined || value === null ? '' : String(value),
  );
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) setDraft(value === undefined || value === null ? '' : String(value));
  }, [isFocused, value]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      className={cn('tabular-nums', className)}
      onFocus={event => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onChange={event => {
        const nextDraft = sanitizeCurrencyText(event.target.value);
        setDraft(nextDraft);
        onValueChange(nextDraft === '' || nextDraft === '.' ? undefined : Number(nextDraft));
      }}
      onBlur={event => {
        setIsFocused(false);
        const nextDraft = sanitizeCurrencyText(event.target.value);
        setDraft(nextDraft);
        onValueChange(nextDraft === '' || nextDraft === '.' ? undefined : Number(nextDraft));
        onBlur?.(event);
      }}
      onWheel={event => {
        // Currency should never change because a user scrolls the page while
        // the field has focus.
        event.currentTarget.blur();
        onWheel?.(event);
      }}
    />
  );
}

export default CurrencyInput;
