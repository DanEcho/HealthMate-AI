import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full items-center rounded-md px-3 py-2 text-base md:text-sm", // Added items-center
          "bg-white dark:bg-neutral-800", // Light background for inputs
          "text-neutral-900 dark:text-neutral-100", // Dark text for inputs
          "border-2 border-black dark:border-neutral-300", // Obvious black outline
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-neutral-900 dark:file:text-neutral-100",
          "placeholder:text-neutral-500 dark:placeholder:text-neutral-400",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
