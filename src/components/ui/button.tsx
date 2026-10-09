import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap outline-none transition-[color,background-color,border-color,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-strong',
        soft: 'bg-primary-soft text-primary hover:bg-primary/20',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-transparent text-foreground hover:bg-hover',
        ghost: 'bg-transparent text-foreground hover:bg-hover',
        muted: 'bg-transparent text-muted-foreground hover:bg-hover hover:text-foreground',
        success: 'bg-success-soft text-success hover:bg-success/20',
        danger: 'bg-danger-soft text-danger hover:bg-danger/20',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-9 gap-1.5 px-4 text-sm',
        xs: 'h-8 gap-1.5 px-3 text-xs',
        lg: 'h-11 px-6',
        icon: "size-9 [&_svg:not([class*='size-'])]:size-5",
        'icon-sm': "size-8 [&_svg:not([class*='size-'])]:size-[18px]",
        'icon-xs': 'size-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
