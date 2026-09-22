import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lightweight native <select> styled to match the Input primitive. Native is
 * intentional here: it is fully accessible, form-associable, and testable with
 * RTL's `selectOptions` without pulling in a heavier popover dependency.
 */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };
