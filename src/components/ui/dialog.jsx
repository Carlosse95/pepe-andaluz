import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

// Ventana de shadcn/ui (Radix Dialog). Da gratis: cerrar con Escape o tocando
// afuera, el foco atrapado adentro y la pantalla de atrás quieta.
//
// Se monta DENTRO de .af-app (no en <body>) para que tome los colores y
// medidas de la app, y el contenido va dentro del fondo oscuro para que este
// lo centre (o lo pegue abajo, como hoja, en celular).
//
// No pone el foco solo en el primer campo al abrir: en iPad eso sacaría el
// teclado sin que nadie lo pidiera. Los campos con autoFocus sí lo toman.
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogContent = React.forwardRef(
  ({ className, overlayClassName, titulo = "Ventana", children, onOpenAutoFocus, ...props }, ref) => (
    <DialogPrimitive.Portal container={typeof document !== "undefined" ? document.querySelector(".af-app") || undefined : undefined}>
      <DialogPrimitive.Overlay className={cn("af-modal-overlay", overlayClassName)}>
        <DialogPrimitive.Content
          ref={ref}
          className={className}
          aria-describedby={undefined}
          onOpenAutoFocus={onOpenAutoFocus || ((e) => e.preventDefault())}
          {...props}
        >
          <DialogPrimitive.Title className="sr-only">{titulo}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  )
);
DialogContent.displayName = "DialogContent";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("font-display text-lg font-bold", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle };
