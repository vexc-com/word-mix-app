import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <div className="relative">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-transparent focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'peer',
            className
          )}
          ref={ref}
          {...props}
        />
        <div className="gradient-border-focus pointer-events-none absolute inset-0 rounded-md peer-focus:border-transparent"></div>
        <div 
          className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-transparent peer-focus:ring-2 peer-focus:ring-offset-0"
          style={{
              background: 'linear-gradient(to right, #4F46E5, #EC4899) border-box',
              WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              border: '2px solid transparent',
              opacity: 0,
              transition: 'opacity 0.2s ease-in-out',
          }}
        />
         <style jsx>{`
          .peer:focus + div + div {
            opacity: 1;
          }
        `}</style>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
