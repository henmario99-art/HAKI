# HAKI — Catálogo para GitHub Pages

Este proyecto es una versión estática e independiente del catálogo HAKI. No necesita React, Next.js, base de datos ni créditos de ChatGPT Sites.

## Archivos que normalmente editarás

- `productos.js`: productos, precios, códigos, tallas, WhatsApp, Instagram y portada.
- `images/`: sube aquí tus imágenes cuando quieras dejar de depender de las imágenes del sitio anterior.
- `styles.css`: colores, tamaños y diseño visual.
- `index.html`: textos/estructura general.

## Disponibilidad de tallas

En `productos.js`, cada producto incluye:

```js
"tallas": {
  "S": true,
  "M": true,
  "L": true,
  "XL": false
}
```

`true` = disponible. `false` = agotada/no seleccionable.

## Cambiar imagen de un producto

1. Sube la foto a la carpeta `images` (por ejemplo `haki-001.jpg`).
2. En `productos.js`, cambia `imagen` a `images/haki-001.jpg`.
3. Guarda el cambio.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo, por ejemplo `haki-catalogo`.
2. Sube TODOS los archivos de esta carpeta a la raíz del repositorio.
3. En el repositorio entra a **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Elige la rama **main** y la carpeta **/(root)**.
6. Pulsa **Save**.

La dirección normalmente será `https://TU-USUARIO.github.io/haki-catalogo/`.

## Importante sobre las imágenes iniciales

Para conservar la apariencia inicial, `productos.js` apunta a las imágenes del catálogo anterior alojado en ChatGPT Sites. Si ese sitio deja de servirlas, el catálogo mostrará automáticamente imágenes de respaldo. Lo ideal es subir tus fotos a `images/` y cambiar las rutas en `productos.js`.
