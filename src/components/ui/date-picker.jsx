import * as React from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es as esFechas } from "date-fns/locale";
import { es } from "react-day-picker/locale";
import { cn } from "@/lib/utils";
import { campoClases } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Selector de fecha (Calendar + Popover de shadcn), en español y con la semana
// empezando en lunes. Se usa igual que el <input type="date"> de antes:
// `value` es "AAAA-MM-DD" y `onChange` recibe { target: { value } }, así que
// donde se cambió no hubo que tocar nada más.
const aISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Se arma con la fecha local (no con new Date("AAAA-MM-DD"), que la toma como
// medianoche en Londres y en México cae el día anterior).
const deISO = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : undefined;
};

function DatePicker({ value, onChange, placeholder = "Elegir día", className, disabled }) {
  const [abierto, setAbierto] = React.useState(false);
  const fecha = deISO(value);
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(campoClases, "items-center justify-between gap-2 text-left", !fecha && "text-muted-foreground", className)}
        >
          <span className="truncate first-letter:uppercase">
            {fecha ? format(fecha, "EEE d 'de' MMM yyyy", { locale: esFechas }) : placeholder}
          </span>
          <CalendarDays className="size-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[70] w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Calendar
          mode="single"
          locale={es}
          weekStartsOn={1}
          selected={fecha}
          defaultMonth={fecha}
          onSelect={(d) => {
            if (!d) return;
            onChange?.({ target: { value: aISO(d) } });
            setAbierto(false);
          }}
          className="[--cell-size:2.6rem]"
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
