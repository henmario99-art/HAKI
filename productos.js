// ============================================================
// HAKI — ARCHIVO PRINCIPAL PARA EDITAR EL CATÁLOGO
// Gestionado desde /admin/
// true = disponible | false = agotada
// ============================================================

window.HAKI_CONFIG = {
  "marca": "HAKI",
  "instagram": "hakisv1",
  "whatsapp": "50360228002",
  "moneda": "$",
  "portada": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQQJDoakPJ29WsQtVjAq7adW4jMZUXiJ20wuaWxufkRpgc8EyTWqSHRTsy&s=10",
  "portadaRespaldo": "images/hero-fallback.svg",
  "anuncio": "HECHO PARA TU SIGUIENTE NIVEL",
  "pais": "HAKI · EL SALVADOR",
  "frase": "HAKI",
  "subfrase": "Haki I Anime & Sports I EL Salvador "
};

window.HAKI_PRODUCTOS = [
  {
    "id": 1,
    "codigo": "GSCV1-01",
    "nombre": "ONYX NEGRA V1",
    "precio": 26,
    "categoria": "COMPRESIÓN",
    "imagen": "images/ONYXV1NEGRA.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 2,
    "codigo": "GSCV1-06",
    "nombre": "ONYX GRIS V1",
    "precio": 26,
    "categoria": "",
    "imagen": "images/ONYXV1GRIS.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 3,
    "codigo": "GSCV1-03",
    "nombre": "ONYX V1 ROJA",
    "precio": 26,
    "categoria": "",
    "imagen": "images/ONYXV1ROJA.webp",
    "imagenRespaldo": "images/producto.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 4,
    "codigo": "BATC-01",
    "nombre": "BAT NEGRA",
    "precio": 25,
    "categoria": "",
    "imagen": "images/BATC-01.webp",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 5,
    "codigo": "BATC-02",
    "nombre": "BAT BLANCA",
    "precio": 25,
    "categoria": "COMPRESIÓN",
    "imagen": "images/BATC-02.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 6,
    "codigo": "BATC-06",
    "nombre": "BAT GRIS OSCURO",
    "precio": 25,
    "categoria": "",
    "imagen": "images/BATC-06.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 7,
    "codigo": "SUPC-01",
    "nombre": "SUP NEGRA",
    "precio": 25,
    "categoria": "",
    "imagen": "images/SUPC-01.jpeg",
    "imagenRespaldo": "images/shorts.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 8,
    "codigo": "SUPC-03",
    "nombre": "SUP NEGRA-ROJO",
    "precio": 26,
    "categoria": "",
    "imagen": "images/SUPC-03.jpg",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 9,
    "codigo": "HAKI-009",
    "nombre": "Compresión Core",
    "precio": 26,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 10,
    "codigo": "HAKI-010",
    "nombre": "Camiseta Everyday",
    "precio": 25,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 11,
    "codigo": "HAKI-011",
    "nombre": "Compresión Essential 02",
    "precio": 26,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 12,
    "codigo": "HAKI-012",
    "nombre": "Camiseta Training 02",
    "precio": 25,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 13,
    "codigo": "HAKI-013",
    "nombre": "Short Performance 02",
    "precio": 22,
    "categoria": "Shorts",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/shorts.jpg",
    "imagenRespaldo": "images/shorts.svg",
    "tallas": {
      "S": false,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 14,
    "codigo": "HAKI-014",
    "nombre": "Legging Sculpt 02",
    "precio": 28,
    "categoria": "Leggings",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/leggings.jpg",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 15,
    "codigo": "HAKI-015",
    "nombre": "Compresión Long Sleeve 02",
    "precio": 28,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 16,
    "codigo": "HAKI-016",
    "nombre": "Camiseta Motion 02",
    "precio": 24,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 17,
    "codigo": "HAKI-017",
    "nombre": "Short Training 02",
    "precio": 23,
    "categoria": "Shorts",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/shorts.jpg",
    "imagenRespaldo": "images/shorts.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 18,
    "codigo": "HAKI-018",
    "nombre": "Legging Active 02",
    "precio": 27,
    "categoria": "Leggings",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/leggings.jpg",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": false,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 19,
    "codigo": "HAKI-019",
    "nombre": "Compresión Core 02",
    "precio": 26,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 20,
    "codigo": "HAKI-020",
    "nombre": "Camiseta Everyday 02",
    "precio": 25,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 21,
    "codigo": "HAKI-021",
    "nombre": "Compresión Essential 03",
    "precio": 26,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 22,
    "codigo": "HAKI-022",
    "nombre": "Camiseta Training 03",
    "precio": 25,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 23,
    "codigo": "HAKI-023",
    "nombre": "Short Performance 03",
    "precio": 22,
    "categoria": "Shorts",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/shorts.jpg",
    "imagenRespaldo": "images/shorts.svg",
    "tallas": {
      "S": false,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 24,
    "codigo": "HAKI-024",
    "nombre": "Legging Sculpt 03",
    "precio": 28,
    "categoria": "Leggings",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/leggings.jpg",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 25,
    "codigo": "HAKI-025",
    "nombre": "Compresión Long Sleeve 03",
    "precio": 28,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 26,
    "codigo": "HAKI-026",
    "nombre": "Camiseta Motion 03",
    "precio": 24,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 27,
    "codigo": "HAKI-027",
    "nombre": "Short Training 03",
    "precio": 23,
    "categoria": "Shorts",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/shorts.jpg",
    "imagenRespaldo": "images/shorts.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 28,
    "codigo": "HAKI-028",
    "nombre": "Legging Active 03",
    "precio": 27,
    "categoria": "Leggings",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/leggings.jpg",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": false,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 29,
    "codigo": "HAKI-029",
    "nombre": "Compresión Core 03",
    "precio": 26,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 30,
    "codigo": "HAKI-030",
    "nombre": "Camiseta Everyday 03",
    "precio": 25,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 31,
    "codigo": "HAKI-031",
    "nombre": "Compresión Essential 04",
    "precio": 26,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 32,
    "codigo": "HAKI-032",
    "nombre": "Camiseta Training 04",
    "precio": 25,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 33,
    "codigo": "HAKI-033",
    "nombre": "Short Performance 04",
    "precio": 22,
    "categoria": "Shorts",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/shorts.jpg",
    "imagenRespaldo": "images/shorts.svg",
    "tallas": {
      "S": false,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 34,
    "codigo": "HAKI-034",
    "nombre": "Legging Sculpt 04",
    "precio": 28,
    "categoria": "Leggings",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/leggings.jpg",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 35,
    "codigo": "HAKI-035",
    "nombre": "Compresión Long Sleeve 04",
    "precio": 28,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 36,
    "codigo": "HAKI-036",
    "nombre": "Camiseta Motion 04",
    "precio": 24,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 37,
    "codigo": "HAKI-037",
    "nombre": "Short Training 04",
    "precio": 23,
    "categoria": "Shorts",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/shorts.jpg",
    "imagenRespaldo": "images/shorts.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 38,
    "codigo": "HAKI-038",
    "nombre": "Legging Active 04",
    "precio": 27,
    "categoria": "Leggings",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/leggings.jpg",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": false,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 39,
    "codigo": "HAKI-039",
    "nombre": "Compresión Core 04",
    "precio": 26,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 40,
    "codigo": "HAKI-040",
    "nombre": "Camiseta Everyday 04",
    "precio": 25,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 41,
    "codigo": "HAKI-041",
    "nombre": "Compresión Essential 05",
    "precio": 26,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 42,
    "codigo": "HAKI-042",
    "nombre": "Camiseta Training 05",
    "precio": 25,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 43,
    "codigo": "HAKI-043",
    "nombre": "Short Performance 05",
    "precio": 22,
    "categoria": "Shorts",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/shorts.jpg",
    "imagenRespaldo": "images/shorts.svg",
    "tallas": {
      "S": false,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 44,
    "codigo": "HAKI-044",
    "nombre": "Legging Sculpt 05",
    "precio": 28,
    "categoria": "Leggings",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/leggings.jpg",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 45,
    "codigo": "HAKI-045",
    "nombre": "Compresión Long Sleeve 05",
    "precio": 28,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 46,
    "codigo": "HAKI-046",
    "nombre": "Camiseta Motion 05",
    "precio": 24,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 47,
    "codigo": "HAKI-047",
    "nombre": "Short Training 05",
    "precio": 23,
    "categoria": "Shorts",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/shorts.jpg",
    "imagenRespaldo": "images/shorts.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 48,
    "codigo": "HAKI-048",
    "nombre": "Legging Active 05",
    "precio": 27,
    "categoria": "Leggings",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/leggings.jpg",
    "imagenRespaldo": "images/leggings.svg",
    "tallas": {
      "S": false,
      "M": true,
      "L": true,
      "XL": true
    }
  },
  {
    "id": 49,
    "codigo": "HAKI-049",
    "nombre": "Compresión Core 05",
    "precio": 26,
    "categoria": "Compresión",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-black.jpg",
    "imagenRespaldo": "images/tee-black.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": false
    }
  },
  {
    "id": 50,
    "codigo": "HAKI-050",
    "nombre": "Camiseta Everyday 05",
    "precio": 26,
    "categoria": "Camisetas",
    "imagen": "https://haki-sport-catalog.henmario99.chatgpt.site/images/tee-gray.jpg",
    "imagenRespaldo": "images/tee-gray.svg",
    "tallas": {
      "S": true,
      "M": true,
      "L": true,
      "XL": true
    }
  }
];
