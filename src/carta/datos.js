// ---------------------------------------------------------------------
// De dónde saca la carta la página pública.
//
// Fuente real: la tabla `carta_publica` de Supabase, que la app actualiza
// cada vez que Pepe guarda el menú en Ajustes. Así los precios de la página
// y los de la app nunca se separan.
//
// Si la nube no responde (o todavía no se ha publicado nada), se usa la
// copia de abajo. Vale más una carta un poco vieja que una página rota
// cuando alguien la abre desde el celular en mitad de un evento.
// ---------------------------------------------------------------------

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

// A propósito NO se usa el cliente de Supabase aquí: son 366 kB para dos
// llamadas HTTP. La página la abre gente con datos móviles desde la calle,
// así que se habla con la API directo por fetch.
const api = (ruta, opciones = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "content-type": "application/json",
      ...(opciones.headers || {}),
    },
  });

const hayNube = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const CARTA_FALLBACK = {
  negocio: {
    nombre: "Pepe Andaluz",
    claim: "Paella valenciana a la leña, hecha el mismo día de tu evento",
    descripcion:
      "Cocinamos por encargo para comidas en casa, cumpleaños, bodas y eventos de empresa. " +
      "Tú eliges la paella y para cuántos; nosotros llegamos con todo listo.",
    telefono: "",
    zona: "Ciudad de México y área metropolitana",
    horario: "Pedidos con 48 horas de anticipación",
    instagram: "",
  },
  mostrarPrecios: true,
  paellas: [
    { id: "mar_tierra", nombre: "Mar y Tierra", precioKg: 480, descripcion: "Pollo, cerdo, camarón y mejillón. La de siempre, la que nunca falla." },
    { id: "de_carnes", nombre: "De Carnes", precioKg: 380, descripcion: "Pollo, conejo y chorizo, con judía verde y garrofón." },
    { id: "mariscos", nombre: "Mariscos", precioKg: 450, descripcion: "Camarón, mejillón, almeja y calamar en fondo de pescado." },
    { id: "negra", nombre: "Negra", precioKg: 400, descripcion: "Arroz con tinta de calamar y alioli aparte." },
    { id: "vegetariana", nombre: "Vegetariana", precioKg: 320, descripcion: "Alcachofa, pimiento, ejote y garrofón. Sin ingredientes de origen animal." },
    { id: "fideua", nombre: "Fideuá", precioKg: 360, descripcion: "Como la paella pero con fideo fino en lugar de arroz." },
  ],
  extras: [
    { id: "croquetas", nombre: "Croquetas", unidad: "ración de 6", precio: 120, categoria: "entrada", descripcion: "De jamón serrano, hechas a mano." },
    { id: "hogaza", nombre: "Hogaza", unidad: "pieza", precio: 60, categoria: "platillo", descripcion: "Pan de masa madre para acompañar." },
    { id: "alioli", nombre: "Alioli", unidad: "frasco", precio: 70, categoria: "platillo", descripcion: "Ajo y aceite de oliva, emulsionado a mano." },
    { id: "tarta_chica", nombre: "Tarta de Santiago chica", unidad: "pieza", precio: 180, categoria: "postre", descripcion: "Almendra y limón. Rinde para 6." },
    { id: "tarta_grande", nombre: "Tarta de Santiago grande", unidad: "pieza", precio: 320, categoria: "postre", descripcion: "La misma receta, rinde para 12." },
  ],
  extrasPaella: [
    { id: "extra_langosta", nombre: "Langosta", precio: 250 },
    { id: "extra_chorizo", nombre: "Chorizo", precio: 80 },
    { id: "extra_camaron", nombre: "Camarón extra", precio: 120 },
  ],
};

// Une lo publicado con el respaldo, campo por campo: si la carta publicada
// trae paellas pero se le olvidó el teléfono, se rellena con el respaldo en
// lugar de quedarse con medio dato.
const fusionar = (publicada) => {
  if (!publicada || typeof publicada !== "object") return CARTA_FALLBACK;
  const listaOVacio = (a, respaldo) => (Array.isArray(a) && a.length > 0 ? a : respaldo);
  return {
    negocio: { ...CARTA_FALLBACK.negocio, ...(publicada.negocio || {}) },
    mostrarPrecios: publicada.mostrarPrecios !== false,
    paellas: listaOVacio(publicada.paellas, CARTA_FALLBACK.paellas),
    extras: listaOVacio(publicada.extras, CARTA_FALLBACK.extras),
    extrasPaella: listaOVacio(publicada.extrasPaella, CARTA_FALLBACK.extrasPaella),
  };
};

export const cargarCarta = async () => {
  if (!hayNube) return CARTA_FALLBACK;
  try {
    const r = await api("carta_publica?id=eq.1&select=datos");
    if (!r.ok) return CARTA_FALLBACK;
    const filas = await r.json();
    return fusionar(filas && filas[0] && filas[0].datos);
  } catch {
    return CARTA_FALLBACK;
  }
};

// Deja la solicitud en la tabla que lee la app. Si truena, se avisa hacia
// arriba: quien llama decide qué hacer (aquí, seguir con el WhatsApp igual).
export const enviarSolicitud = async (solicitud) => {
  if (!hayNube) throw new Error("Sin conexión con la nube");
  const r = await api("solicitudes_web", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(solicitud),
  });
  if (!r.ok) throw new Error(await r.text());
};

/* ---------------------------- Formato ---------------------------- */

const moneyFmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
export const money = (n) => moneyFmt.format(n || 0);

// Al cliente se le habla en personas, no en kilos — igual que en la app.
// 1 kg de paella ≈ 2 personas comiendo.
export const KG_POR_PERSONA = 0.5;
export const kgParaPersonas = (personas) => Math.max(1, Math.round(personas * KG_POR_PERSONA * 2) / 2);
export const personasDeKg = (kg) => Math.max(1, Math.round(kg * 2));

export const CATEGORIAS = [
  { id: "entrada", label: "Para empezar" },
  { id: "platillo", label: "Para acompañar" },
  { id: "postre", label: "Para terminar" },
];

// Las fotos viven en `public/fotos/<id>.jpg` y se nombran con el id del
// producto. Mientras no exista el archivo, la tarjeta muestra su marco de
// papel en vez de una imagen rota (ver `manejarFotoFaltante`).
export const rutaFoto = (item) => item.foto || `fotos/${item.id}.jpg`;
