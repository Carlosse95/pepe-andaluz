import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

// Drawer ORIGINAL de shadcn/ui (estilo Maia, registro radix-maia), pasado tal
// cual a Tailwind 3: mismas clases, solo traducidas (data-open → data-state,
// rounded-4xl → rounded-[2rem], backdrop-blur-xs → 4px). Se monta dentro de
// .af-app para que tome la letra y los colores de la app.
const contenedorApp = () => (typeof document !== "undefined" ? document.querySelector(".af-app") || undefined : undefined);

function Drawer(props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger(props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" container={contenedorApp()} {...props} />;
}

function DrawerClose(props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

// Con forwardRef: vaul le pasa una referencia (para animar y arrastrar). El
// original de shadcn es para React 19, que la recibe sola; la app usa React 18.
const DrawerOverlay = React.forwardRef(function DrawerOverlay({ className, ...props }, ref) {
  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/80 supports-[backdrop-filter]:backdrop-blur-[4px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  );
});

const DrawerContent = React.forwardRef(function DrawerContent({ className, children, ...props }, ref) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-transparent p-4 text-sm text-popover-foreground before:absolute before:inset-2 before:-z-10 before:rounded-[2rem] before:border before:border-border before:bg-popover data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] sm:data-[vaul-drawer-direction=left]:max-w-sm sm:data-[vaul-drawer-direction=right]:max-w-sm",
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-4 hidden h-1.5 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});

function DrawerHeader({ className, ...props }) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left",
        className
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }) {
  return <div data-slot="drawer-footer" className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />;
}

const DrawerTitle = React.forwardRef(function DrawerTitle({ className, ...props }, ref) {
  return <DrawerPrimitive.Title ref={ref} data-slot="drawer-title" className={cn("font-display text-base font-medium text-foreground", className)} {...props} />;
});

const DrawerDescription = React.forwardRef(function DrawerDescription({ className, ...props }, ref) {
  return <DrawerPrimitive.Description ref={ref} data-slot="drawer-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
});

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
