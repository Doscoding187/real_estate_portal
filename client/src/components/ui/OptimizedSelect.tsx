/**
 * OptimizedSelect Component
 *
 * High-performance select component for large datasets.
 * Uses virtua for virtualization to ensure 60fps interaction
 * even with thousands of items (e.g., Year, Suburbs, Countries).
 *
 * Features:
 * - Virtualized rendering (VList from virtua)
 * - Gradient styling matching design system
 * - Accessible via Radix primitives (with keyboard limitations due to virtualization)
 */

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { VList } from 'virtua';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface OptimizedSelectProps {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  containerClassName?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  height?: number;
  itemHeight?: number;
}

const OptimizedSelect = React.forwardRef<HTMLButtonElement, OptimizedSelectProps>(
  (
    {
      label,
      error,
      required,
      helperText,
      containerClassName,
      placeholder,
      value,
      onValueChange,
      options,
      disabled,
      height = 300,
      itemHeight = 35,
    },
    ref,
  ) => {
    const selectId = `opt-select-${React.useId()}`;
    const hasError = !!error;

    // Calculate actual height based on options count
    const listHeight = Math.min(options.length * itemHeight, height);

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {/* Label */}
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
            {label}
            {required && (
              <span
                className="ml-1 bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent font-semibold"
                aria-label="required"
              >
                *
              </span>
            )}
          </label>
        )}

        {/* Select */}
        <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectPrimitive.Trigger
            ref={ref}
            id={selectId}
            className={cn(
              // Base styles
              'w-full px-4 py-2.5 rounded-lg',
              'text-sm text-gray-900',
              'border-2 bg-white',
              'transition-all duration-300 ease-in-out',
              'outline-none',
              'flex items-center justify-between',
              // Default state
              'border-gray-300',
              // Focus state with gradient border
              'focus:border-transparent',
              'focus:ring-4 focus:ring-blue-500/20',
              'focus:shadow-[0_0_0_2px_transparent,0_0_0_4px_rgb(59_130_246_/_0.5)]',
              // Error state
              hasError && [
                'border-red-300',
                'focus:ring-red-500/20',
                'focus:shadow-[0_0_0_2px_transparent,0_0_0_4px_rgb(239_68_68_/_0.5)]',
                'animate-shake',
              ],
              // Disabled state
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60',
              // Placeholder
              'data-[placeholder]:text-gray-400',
            )}
            aria-invalid={hasError}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className={cn(
                'relative z-50 overflow-hidden',
                'rounded-lg border-2 border-gray-200 bg-white shadow-lg',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2',
                'data-[side=top]:slide-in-from-bottom-2',
              )}
              position="popper"
              sideOffset={4}
              style={{ width: 'var(--radix-select-trigger-width)' }}
            >
              <SelectPrimitive.Viewport className="p-0">
                <VList style={{ height: listHeight }}>
                  {options.map(option => (
                    <SelectPrimitive.Item
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className={cn(
                        'relative flex w-full cursor-pointer select-none items-center',
                        'py-2 pl-8 pr-2 text-sm outline-none',
                        'transition-colors duration-200',
                        // Default state
                        'text-gray-900',
                        // Hover/Focus state with gradient
                        'focus:bg-gradient-to-r focus:from-blue-50 focus:to-indigo-50',
                        // Selected state with gradient
                        'data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-600',
                        'data-[state=checked]:text-white data-[state=checked]:font-medium',
                        // Disabled state
                        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                      )}
                    >
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <SelectPrimitive.ItemIndicator>
                          <CheckIcon className="h-4 w-4" />
                        </SelectPrimitive.ItemIndicator>
                      </span>
                      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))}
                </VList>
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {/* Error Message */}
        {error && (
          <p className="text-sm bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent font-medium animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}

        {/* Helper Text */}
        {!error && helperText && <p className="text-sm text-gray-500">{helperText}</p>}
      </div>
    );
  },
);

OptimizedSelect.displayName = 'OptimizedSelect';

export { OptimizedSelect };
