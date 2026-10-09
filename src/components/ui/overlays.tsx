'use client';

import { CaretDownIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
import {
  Dialog as DialogPrimitive,
  DropdownMenu as MenuPrimitive,
  Popover as PopoverPrimitive,
  Select as SelectPrimitive,
  Tabs as TabsPrimitive,
} from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

const overlaySurface =
  'bg-popover text-popover-foreground z-[60] rounded-xl border shadow-overlay outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95';

/* ───────────── Dialog ───────────── */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  footer,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Content>, 'title'> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        dir="rtl"
        className={cn(
          overlaySurface,
          'fixed top-1/2 left-1/2 flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div>
            <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-muted-foreground mt-1 text-sm">{description}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="text-muted-foreground hover:bg-hover hover:text-foreground -me-1 -mt-1 rounded-md p-1.5" aria-label="بستن">
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="scrollbar-minimal min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="bg-surface flex items-center justify-end gap-2 rounded-b-2xl border-t px-5 py-3">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ───────────── Dropdown menu ───────────── */

export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;

export function MenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content sideOffset={sideOffset} className={cn(overlaySurface, 'min-w-48 p-1.5', className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

export function MenuItem({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'data-[highlighted]:bg-hover flex h-8 items-center gap-2 rounded-md px-2 text-sm outline-none select-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)} {...props} />;
}

export function MenuSeparator() {
  return <MenuPrimitive.Separator className="bg-border -mx-1 my-1 h-px" />;
}

/* ───────────── Popover ───────────── */

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content dir="rtl" sideOffset={sideOffset} className={cn(overlaySurface, 'w-72 p-3', className)} {...props} />
    </PopoverPrimitive.Portal>
  );
}

/* ───────────── Tabs (underline, Kortix settings style) ───────────── */

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('flex h-full items-stretch gap-1', className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:bg-primary data-[state=active]:[&_svg]:text-primary relative inline-flex h-full items-center gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}

/* ───────────── Select ───────────── */

export function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  className,
  placeholder,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: { value: string; label: string; hint?: string }[];
  className?: string;
  placeholder?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} dir="rtl">
      <SelectPrimitive.Trigger
        className={cn(
          'border-input hover:bg-hover focus-visible:ring-ring/25 flex h-9 w-full items-center justify-between gap-2 rounded-full border px-4 text-sm outline-none focus-visible:ring-2',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <CaretDownIcon className="text-muted-foreground size-3.5" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content dir="rtl" position="popper" sideOffset={6} className={cn(overlaySurface, 'min-w-(--radix-select-trigger-width) p-1.5')}>
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="data-[highlighted]:bg-hover relative flex h-8 items-center gap-2 rounded-md ps-2 pe-8 text-sm outline-none select-none"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                {option.hint && <span className="text-muted-foreground text-xs">{option.hint}</span>}
                <SelectPrimitive.ItemIndicator className="absolute end-2">
                  <CheckIcon className="text-primary size-3.5" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
