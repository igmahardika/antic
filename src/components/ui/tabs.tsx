import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, style, ...props }, ref) => {
  // Paksa style inline jika tab aktif
  const isActive = props['data-state'] === 'active';
  const forcedStyle = isActive ? { background: '#5271ff', color: '#fff', boxShadow: '0 8px 32px 0 rgba(82,113,255,0.25)', backdropFilter: 'blur(8px)', ...style } : style;
  return (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
        `inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-base font-semibold transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5271ff] focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        data-[state=active]:shadow-2xl data-[state=active]:backdrop-blur-md
        data-[state=inactive]:bg-[rgba(82,113,255,0.10)] data-[state=inactive]:text-[#5271ff] data-[state=inactive]:border data-[state=inactive]:border-white/20 data-[state=inactive]:backdrop-blur-md data-[state=inactive]:shadow
        hover:bg-[#5271ff] hover:text-white`,
      className
    )}
      style={forcedStyle}
    {...props}
  />
  );
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
