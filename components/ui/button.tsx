import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-[#FF6900] text-white shadow-lg hover:bg-[#E55D00] hover:shadow-[#FF6900]/25 focus-visible:ring-[#FF6900]/50",
        destructive:
          "bg-red-600 text-white shadow-lg hover:bg-red-700 focus-visible:ring-red-500/50",
        outline:
          "border-2 border-white/20 bg-transparent text-white shadow-lg hover:bg-white/10 hover:border-[#FF6900]/50 hover:text-[#FF6900] focus-visible:ring-[#FF6900]/50",
        secondary:
          "bg-white/10 text-white shadow-lg hover:bg-white/20 focus-visible:ring-white/50",
        ghost:
          "text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white/50",
        link: "text-[#FF6900] underline-offset-4 hover:underline hover:text-[#E55D00]",
      },
      size: {
        default: "h-11 px-6 py-3 has-[>svg]:px-5",
        sm: "h-9 rounded-lg gap-2 px-4 has-[>svg]:px-3.5",
        lg: "h-12 rounded-lg px-8 has-[>svg]:px-6",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
