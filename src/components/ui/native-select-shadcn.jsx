import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Native Select ORIGINAL de shadcn (registro new-york-v4), pasado a Tailwind 3
// sin cambiarle el estilo. En iPhone/iPad abre el selector del sistema.
//   envoltura: clases de la caja de afuera (el original es "w-fit"; en los
//   formularios se pasa "w-full" para que ocupe el ancho del campo).
function NativeSelect({ className, size = "default", envoltura = "w-fit", ...props }) {
  return (
    <div
      className={cn("group/native-select relative has-[select:disabled]:opacity-50", envoltura)}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-3 py-2 pr-9 text-sm shadow-sm transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 select-none text-muted-foreground opacity-50"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  );
}

function NativeSelectOption({ className, ...props }) {
  return <option data-slot="native-select-option" className={cn("bg-[Canvas] text-[CanvasText]", className)} {...props} />;
}

function NativeSelectOptGroup({ className, ...props }) {
  return <optgroup data-slot="native-select-optgroup" className={cn("bg-[Canvas] text-[CanvasText]", className)} {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
