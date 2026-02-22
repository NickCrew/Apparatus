import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./cn"

const cardVariants = cva(
  "border overflow-hidden flex flex-col transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border shadow-sm",
        panel: "bg-card border-border shadow-panel",
        glass: "bg-black/40 backdrop-blur-xl border-white/10 shadow-inner-glow",
        ghost: "bg-transparent border-transparent",
      },
      glow: {
        none: "",
        primary: "border-primary/30 shadow-glow-primary",
        success: "border-success/30 shadow-glow-success",
        warning: "border-warning/30 shadow-glow-warning",
        danger: "border-danger/30 shadow-glow-danger",
        info: "border-info/30 shadow-glow-info",
      },
      kinetic: {
        true: "rounded-[var(--ui-radius)] skew-x-[var(--ui-skew)]",
        false: "rounded-sm",
      }
    },
    defaultVariants: {
      variant: "panel",
      glow: "none",
      kinetic: false,
    }
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, glow, kinetic, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, glow, kinetic, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 border-b border-border/50 bg-white/[0.01]", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight font-display text-primary/90 rec-tech",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground font-sans", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 mt-4", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 border-t border-border mt-auto", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
