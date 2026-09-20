# HAKI: interfaz instalada

Interfaz recuperada de HAKI-v27-Android-PORTADA-FIJA.apk y adaptada a PWA.

- La web en `/` mantiene su HTML visual, scripts y estilos originales. Solo incorpora el detector y el manifest.
- `pwa-mode.js` dirige ventanas standalone (incluido `navigator.standalone` en iOS) a `/app/`. Una pestaña normal vuelve a la web, conservando consulta y fragmento.
- `/app/index.html` utiliza `../productos.js` y actualiza desde la misma fuente GitHub que la web. No existe un segundo archivo de productos.
- El carrito conserva `haki_cart_v1` en el mismo origen. iOS puede aislar el almacenamiento de Safari y la app instalada; no se garantiza compartir la bolsa entre ambos contenedores del sistema operativo.
- Preferencias de tema y caché de catálogo de la app son independientes de la web. El tema inicial de la app es oscuro, como la referencia; el selector permite cambiarlo.
- El worker solo controla `/app/`. Guarda los archivos de la interfaz y el último catálogo disponible para consultas sin conexión, pero no guarda pedidos, credenciales ni rutas de administración. Las imágenes externas requieren conexión. Sin conexión se muestra una advertencia de disponibilidad no confirmada.
- Los iconos y la portada proceden de los archivos HAKI existentes. La pantalla de inicio del sistema operativo depende del navegador; no se incorpora código nativo de Android.

## Verificación

Se comprobaron sintaxis de todos los scripts, existencia de recursos locales, manifest, alcance y lista de caché, detección Android/iOS simulada, conservación de enlaces a productos, exclusión del admin, separación de preferencias y que el HTML de la web solo incorpora dos elementos no visuales.

Pendiente de comprobación visual y de interacción en un teléfono real: el navegador remoto de esta sesión no podía abrir el servidor de pruebas local. No se certifica compatibilidad con todos los modelos de teléfono.

## Prueba en teléfono

1. Abrir la web en una pestaña normal: debe conservar la interfaz anterior.
2. Añadir HAKI a la pantalla de inicio y abrir desde ese icono: debe verse la interfaz de la app v27.
3. Abrir una categoría, un producto, escoger una talla disponible y añadir al carrito. Volver y confirmar que la talla y el carrito siguen correctos.
4. Comprobar guía de tallas, imágenes, información de envíos, cotización y regreso del navegador.
5. Cambiar tema en la app y confirmar que no modifica el modo web.

Un acceso directo que abre una pestaña normal seguirá mostrando la web. Si un icono anterior no abre en modo independiente, hay que volver a añadirlo desde el navegador compatible.

## Reversión

Revertir el commit de esta integración devuelve el estado previo, sin tocar productos, imágenes del catálogo, pedidos ni administración. No borrar datos de localStorage para cambiar de interfaz.
