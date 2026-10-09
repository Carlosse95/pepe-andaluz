// Guardián de la escala de espacios (lo mismo que hace stylelint-scales, pero
// para los estilos de la app, que viven dentro de AzafranApp.jsx y no en un
// archivo .css que stylelint pueda leer).
//
// Todo relleno, margen y separación va en múltiplos de 4 px:
//   4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64
// (más 1 y 2 px para líneas finas). Si aparece otro valor, avisa y falla.
import { readFileSync } from "node:fs";

const ESCALA = new Set([0, 1, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64]);
const PROPS = ["padding", "margin", "gap", "row-gap", "column-gap",
  ...["padding", "margin"].flatMap((p) => ["top", "bottom", "left", "right"].map((l) => `${p}-${l}`))];

const archivo = "src/AzafranApp.jsx";
const texto = readFileSync(archivo, "utf8");
const inicio = texto.indexOf("const AZAFRAN_CSS");
const css = texto.slice(inicio);
const lineaBase = texto.slice(0, inicio).split("\n").length - 1;

const patron = new RegExp(`(?<![\\w-])(${PROPS.sort((a, b) => b.length - a.length).join("|")}): ?([^;}]+)`, "g");
const fuera = [];
for (const m of css.matchAll(patron)) {
  for (const v of m[2].matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
    if (!ESCALA.has(Math.abs(parseFloat(v[1])))) {
      const linea = lineaBase + css.slice(0, m.index).split("\n").length;
      fuera.push(`${archivo}:${linea}  ${m[1]}: ${m[2].trim()}  ← ${v[1]}px no está en la escala`);
    }
  }
}
if (fuera.length) {
  console.error(`✗ ${fuera.length} espacio(s) fuera de la escala de 4 px:\n` + fuera.join("\n"));
  process.exit(1);
}
console.log("✓ Todos los espacios están en la escala de 4 px.");
