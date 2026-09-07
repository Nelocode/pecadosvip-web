# Mapa funcional de referencia

Captura técnica del 2026-08-29. Este documento describe patrones observables para orientar una implementación original de PecadosVip; no constituye permiso para copiar la identidad, el contenido o los activos del sitio de referencia.

## Inventario

- 751 rutas internas únicas normalizadas.
- 732 rutas con fuente primaria en sitemap.
- 19 rutas adicionales observadas únicamente en los enlaces renderizados.
- 81 rutas también visibles como enlaces en la captura renderizada.
- Consultas y anclas se consideran estados o interacciones, no páginas independientes.

| Familia | Rutas |
| --- | ---: |
| blog | 119 |
| contact | 4 |
| faq | 4 |
| first-visit-guide | 1 |
| home | 4 |
| legal | 3 |
| profiles-and-discovery | 480 |
| rates | 1 |
| services | 110 |
| technical | 1 |
| venue-information | 24 |

El detalle máquina-legible está en `docs/reference/felina-route-inventory.json`. El inventario documenta el referente; no es una lista automática de funcionalidades aprobadas ni un backlog de publicación.

## Patrones que sí se pueden adaptar de forma original

- Navegación localizada con selector de idioma y equivalencia entre español, inglés, francés e italiano.
- Página índice de servicios y plantilla de detalle con breadcrumb, jerarquía editorial, contenido relacionado y llamada a la acción protegida.
- Directorio de perfiles con fichas, filtros, estados de disponibilidad y rutas de detalle propias.
- Páginas informativas separadas para preguntas frecuentes, tarifas orientativas, guía de primera visita, contacto y textos legales.
- Cabecera y menú móvil accesibles, tarjetas responsivas, estados de foco, avisos persistentes y consentimiento de cookies.
- Flujos de búsqueda, filtrado, navegación relacionada y retorno al índice con estados vacíos y errores claros.
- Metadatos SEO, alternancias de idioma, sitemap y breadcrumbs generados desde el catálogo propio.
- Mapas o indicaciones solo cuando PecadosVip aporte y autorice sus propios datos operativos.

## Elementos que no se deben copiar

- Marca, logotipo, nombres comerciales, tono textual, titulares, descripciones o cualquier otro texto del referente.
- Fotografías, vídeo, iconos, tipografías licenciadas, hojas de estilo, scripts, HTML o componentes propietarios.
- Teléfonos, correos, direcciones, coordenadas, horarios, tarifas, identificadores de analítica o integraciones del referente.
- Identidad, biografía, material visual o datos de perfiles publicados por terceros.
- Slugs y páginas masivas de captación SEO como taxonomía de producto; el inventario sirve únicamente para estudiar arquitectura.
- Enlaces directos o hotlinks a recursos del dominio de referencia.

## Reglas para PecadosVip

- Crear rutas, textos, diseño y recursos propios usando únicamente contenido aprobado y perfiles sintéticos declarados.
- Mantener la publicación, contacto, reserva y datos de ubicación detrás de las compuertas ya definidas para el proyecto.
- Conservar avisos de mayoría de edad, privacidad, cookies y transparencia sobre contenido sintético, sujetos a revisión legal humana.
- Validar paridad lingüística y navegación real en los cuatro idiomas antes de considerar una ruta lista para producción.
