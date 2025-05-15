import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md px-3 py-2 text-base md:text-sm',
          "bg-white dark:bg-neutral-800", // Light background for textareas
          "text-neutral-900 dark:text-neutral-100", // Dark text for textareas
          "border-2 border-black dark:border-neutral-300", // Obvious black outline
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "placeholder:text-neutral-500 dark:placeholder:text-neutral-400",
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
