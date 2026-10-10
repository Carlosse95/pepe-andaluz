import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

// Estilo Maia (redondo) y montado dentro de .af-app para tomar sus colores.
const contenedorApp = () => (typeof document !== "undefined" ? document.querySelector(".af-app") || undefined : undefined)

const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPortal container={contenedorApp()}>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      onOpenAutoFocus={(e) => e.preventDefault()}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[2rem] bg-card p-6 text-card-foreground shadow-xl ring-1 ring-foreground/10 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col items-center gap-2 text-center",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "grid grid-cols-2 gap-2 pt-1",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-snug", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "secondary" }),
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

// Ícono redondo arriba del título (como AlertDialogMedia de shadcn nuevo).
//   tono: "default" | "aviso" | "error"
const AlertDialogMedia = ({ className, tono = "default", ...props }) => (
  <div
    className={cn(
      "mb-1 flex size-12 items-center justify-center rounded-full [&>svg]:size-6",
      tono === "aviso" ? "bg-aviso/15 text-aviso-fuerte" : tono === "error" ? "bg-error/15 text-error-fuerte" : "bg-secondary text-secondary-foreground",
      className
    )}
    {...props}
  />
)

export {
  AlertDialogMedia,
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}

// Confirmación con el aspecto de las ventanas de Pepe El Andaluz (ícono,
// título, texto y botones apilados). A diferencia de una ventana normal NO
// se cierra tocando afuera: hay que elegir (Escape cuenta como "Cancelar").
// Se monta dentro de .af-app para tomar sus colores y medidas.
const AlertDialogConfirmacion = React.forwardRef(({ className, titulo = "Confirmar", children, ...props }, ref) => (
  <AlertDialogPrimitive.Portal container={typeof document !== "undefined" ? document.querySelector(".af-app") || undefined : undefined}>
    <AlertDialogPrimitive.Overlay className="af-modal-overlay af-modal-overlay-center">
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn("af-alerta-modal", className)}
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
        {...props}
      >
        <AlertDialogPrimitive.Title className="sr-only">{titulo}</AlertDialogPrimitive.Title>
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Overlay>
  </AlertDialogPrimitive.Portal>
));
AlertDialogConfirmacion.displayName = "AlertDialogConfirmacion";

export { AlertDialogConfirmacion };
