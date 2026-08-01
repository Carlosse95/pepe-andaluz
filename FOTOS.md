# Fotos para la página pública

La sesión de fotos alimenta `carta.html`. Mientras no haya archivos, la página
no se rompe: cada hueco muestra un marco de papel que dice "Foto en camino".
Se pueden ir subiendo de una en una.

## Dónde van y cómo se llaman

Todas en la carpeta **`public/fotos/`**. El nombre del archivo tiene que ser el
id del platillo, en `.jpg`:

```
public/fotos/portada.jpg        ← la grande del inicio
public/fotos/mar_tierra.jpg
public/fotos/de_carnes.jpg
public/fotos/mariscos.jpg
public/fotos/negra.jpg
public/fotos/vegetariana.jpg
public/fotos/fideua.jpg
public/fotos/croquetas.jpg
public/fotos/hogaza.jpg
public/fotos/alioli.jpg
public/fotos/tarta_chica.jpg
public/fotos/tarta_grande.jpg
```

Esos son los platillos que trae la app de fábrica. Si se agregó uno nuevo desde
la app, su id es distinto: **la app te dice el nombre exacto**. Está en
`Ajustes → Menú`, debajo de cada platillo: *"Su foto: `fotos/xxxx.jpg`"*.

## Qué encuadre pedir

| Foto | Proporción | Cómo se ve en la página |
|---|---|---|
| `portada.jpg` | **vertical 4:5** (ej. 1600 × 2000) | Ocupa media pantalla en la computadora. Es la primera impresión: la paella entera, humeando, con la leña o las manos de Pepe dentro del cuadro. |
| Cada paella | **horizontal 4:3** (ej. 1600 × 1200) | Cenital o casi cenital, paella completa y centrada. Que se distingan los ingredientes que menciona su descripción. |
| Extras (croquetas, alioli, tartas…) | **horizontal 4:3** | En el celular salen chiquitas, a la izquierda del texto. Que el platillo llene el cuadro: los planos abiertos no se leen a ese tamaño. |

Recomendaciones prácticas para el día del shoot:

- **Luz natural, de lado.** El flash de frente aplana el arroz y apaga el color
  del azafrán, que es justo lo que hay que ver.
- **Deja aire alrededor del plato.** La página recorta a lo ancho o a lo alto
  según el dispositivo; si el platillo llega al borde exacto, se corta.
- **Fondo mate y oscuro o de madera.** El mantel blanco brillante rebota luz y
  se come el contraste del arroz.
- Toma **una vertical y una horizontal de cada cosa**. Cuesta un minuto más y
  evita repetir la sesión si cambia el diseño.

## Antes de subirlas

Bájales el peso: las fotos que salen de la cámara pesan 5–10 MB cada una y en
datos móviles la página tardaría muchísimo. Con exportarlas a **1600 px de lado
largo y calidad 80%** quedan en ~200 KB y se ven igual en pantalla.

Después: copiar los archivos a `public/fotos/`, y

```bash
git add public/fotos && git commit -m "Fotos de los platillos" && git push
```

En un par de minutos aparecen solas en la página.
