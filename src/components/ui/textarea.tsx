import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <div className="relative group">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'peer',
            'transition-all',
            'focus:ring-0 focus:ring-offset-0 focus:border-transparent',
            className
          )}
          ref={ref}
          {...props}
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-md border-2 border-transparent transition-all',
            'peer-focus:border-0 peer-focus:p-[2px]',
            'bg-gradient-to-r from-transparent to-transparent',
            'peer-focus:from-[#4F46E5] peer-focus:to-[#EC4899]'
          )}
          style={{backgroundClip: 'padding-box, border-box', backgroundOrigin: 'padding-box, border-box'}}
        ></div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
