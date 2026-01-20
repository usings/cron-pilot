import type * as React from 'react'
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { cn } from '#dashboard/libs/utils'

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-open:duration-500 data-closed:duration-500 data-open:ease-[cubic-bezier(0.32,0.72,0,1)] data-closed:ease-[cubic-bezier(0.32,0.72,0,1)] bg-black/10 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50',
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'group data-[side=left]:p-4 data-[side=right]:p-4 fixed z-50 flex flex-col text-xs/relaxed will-change-transform data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-open:duration-500 data-closed:duration-500 data-open:ease-[cubic-bezier(0.32,0.72,0,1)] data-closed:ease-[cubic-bezier(0.32,0.72,0,1)] data-[side=right]:data-open:slide-in-from-right data-[side=right]:data-closed:slide-out-to-right data-[side=left]:data-open:slide-in-from-left data-[side=left]:data-closed:slide-out-to-left data-[side=top]:data-open:slide-in-from-top data-[side=top]:data-closed:slide-out-to-top data-[side=bottom]:data-open:slide-in-from-bottom data-[side=bottom]:data-closed:slide-out-to-bottom data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:max-h-[80dvh] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:md:min-w-lg data-[side=left]:h-full data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:md:min-w-lg data-[side=right]:h-full data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:max-h-[80dvh]',
        )}
        {...props}
      >
        <div
          className={cn(
            'bg-background bg-clip-padding relative h-full flex flex-col group-data-[side=top]:border-b group-data-[side=bottom]:border-t group-data-[side=left]:border group-data-[side=right]:border overflow-y-auto overscroll-contain',
            className,
          )}
        >
          {children}
        </div>
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('gap-1 p-4 flex flex-col', className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn('gap-2 p-4 mt-auto flex flex-col', className)} {...props} />
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-foreground text-sm font-medium', className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-xs/relaxed', className)}
      {...props}
    />
  )
}

const createSheetHandle = SheetPrimitive.createHandle

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  createSheetHandle,
}
