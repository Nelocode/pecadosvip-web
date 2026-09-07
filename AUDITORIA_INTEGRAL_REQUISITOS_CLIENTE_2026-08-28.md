# Auditoría integral de requisitos del cliente — PecadosVip

Fecha de corte: 2026-08-28 (America/Bogota)  
Repositorio: `pecadosvip-web-delivery`  
HEAD auditado: `35a9f1313c0a044473f8747af415830f469237bc`  
Rama local: `codex/pagina-web-checkpoint`  
Tipo de revisión: documental, código fuente, artefacto local, navegador, multilingüe y preflight UE/España. No es asesoramiento jurídico, certificación WCAG, UAT ni prueba de producción.

## Dictamen ejecutivo

El repositorio contiene una base de ingeniería local avanzada, pero todavía no satisface integralmente el encargo del cliente y no es apto para publicación. La puntuación `98/100` existente mide ejecución técnica local. La matriz contractual vigente solo acredita `2/20` requisitos: 2 `VERIFIED`, 12 `PARTIAL`, 5 `BLOCKED` y 1 `AT_RISK`.

La ruta pública localizada muestra únicamente un holding de “Contenido en preparación”. Los seis perfiles sintéticos funcionan en un preview loopback separado, pero no existe un adaptador que importe/promueva el candidato CMS al snapshot consumido por el sitio público. Por ello, el catálogo, las fichas, el contacto, los legales y la experiencia de marca no conforman todavía un producto público integrado.

Decisión: **NO-GO público, legal, operacional y de aceptación del cliente**.

## Fuentes de requisitos revisadas

- `PecadosVip_Brief_Diseno_SEO.docx`, páginas 1–6.
- `Puntos_a_confirmar_PecadosVip.docx`, páginas 1–2.
- Notas de reunión 15:57, páginas 1–8.
- Notas de reunión 16:57, páginas 1–30. Son notas automáticas de Gemini y pueden contener errores; se trataron como contexto que requiere corroboración.
- Tres propuestas gráficas del cliente.
- `Páginas_Web.txt`: dos enlaces abreviados de Google no resolubles desde el auditor y `felinabcn.com` como referencia, no como fuente autorizada para copiar.
- Solicitud inicial pegada: misión, inventario, trazabilidad P0/P1, QA, release, handoff y aceptación final de Luis Araujo.
- Código, pruebas, documentación y artefactos del HEAD auditado.

## Evidencia técnica refrescada

- `pnpm run release:verify`: PASS.
- Lint: PASS.
- TypeScript: PASS.
- Pruebas: **169/169 PASS**.
- Build Vinext y preparación standalone: PASS.
- Catálogos ES/EN/FR/IT: validación interna PASS WITH LIMITS.
- Scorecard local: 98/100, válido según su rúbrica interna.
- SBOM: 612 componentes.
- Artefactos worker y standalone: PASS.
- Smoke de producción local: holding fail-closed, 41 rutas verificadas, preview ausente del artefacto productivo.
- El audit inicial de este documento reportó 6 avisos. El retest del árbol actualizado eliminó React, Vite, Cloudflare, Undici y WS de la lista; permanecen únicamente dos avisos high basados en la versión `image-size@2.0.2`.
  - No existe una publicación upstream `image-size@2.0.3` verificable a 2026-08-28. Se aplica un parche downstream reproducible con hash bloqueado, pruebas CJS/ESM y exclusión obligatoria del standalone; véase `SECURITY_ADVISORY_VEX.md`.
  - El audit conserva resultado no cero y no se presenta como «limpio»; la mitigación y sus límites se validan por separado.
- La evidencia durable 98 del repositorio está ligada a un commit anterior y la documentación conserva cifras de 155/159/167 pruebas; debe regenerarse sobre el SHA final.

Un build exitoso no neutraliza advisories, ni demuestra alcance o explotación. Antes de release se debe actualizar el grafo compatible o documentar una evaluación de alcanzabilidad reproducible por cada advisory.

## Brechas P0 — bloquean el producto solicitado

| ID | Brecha | Evidencia principal | Criterio de cierre |
|---|---|---|---|
| P0-01 | No hay vía CMS/candidato → runtime público. | `lib/content/runtime-snapshot.ts:58-77`; `ARCHITECTURE.md:68-72` | Adaptador versionado, promoción autenticada, rollback y prueba E2E con snapshot aprobado. |
| P0-02 | El público recibe holding; los perfiles viven en un micrositio técnico aislado. | `/es`; `/preview-local-sintetico` | Home, catálogo, detalle, ciudades, contacto, legales y locales unidos por una navegación pública coherente. |
| P0-03 | El snapshot activo contiene 0 perfiles, 0 servicios, legales vacíos y `publicationEnabled:false`. | `lib/content/runtime-snapshot.ts:58-73` | Contenido aprobado y release gate satisfecho con el mismo payload que se renderiza. |
| P0-04 | El release exige 7 ciudades y 8 perfiles, pero hay 2 rutas de ciudad y 6 identidades sintéticas. | `lib/content/validation.ts:525-548` | Rutas reales o plantilla genérica segura, cobertura confirmada, mínimo 8 perfiles publicables. |
| P0-05 | Falta contenido y cobertura real de Girona, Tarragona, Toledo, Guadalajara, Segovia, distritos/municipios y localidades priorizadas. | Brief; `REQUIREMENTS_TRACEABILITY.csv` | Matriz de cobertura aprobada, landings únicas, enlaces cercanos, FAQs y perfiles aplicables. |
| P0-06 | Contacto no operacional; no existe formulario público y Telegram no está priorizado. | `app/components/ContactOptions.tsx:6-20`; configuración vacía | Destinos aprobados; Telegram primero; formulario propio o CSP/adaptador compatible; privacidad visible. |
| P0-07 | CMS local no es CMS entregable de producción. | `ARCHITECTURE.md:62-90`; workbench loopback | IdP/MFA, roles reales, DB, storage/CDN, cifrado, auditoría, backup, concurrencia, operación móvil y UAT no técnica. |
| P0-08 | Flujo editorial incompleto: campos, idiomas, servicios, ciudades, legales, preview, publicación, sustitución de medios y vídeo. | UI del workbench y contratos | UX completa crear/editar/duplicar/archivar/restaurar; save seguro; preview; orden/reemplazo; vídeo probado. |
| P0-09 | Legales, identidad del prestador, privacidad, cookies, términos, clasificación de actividad/publicidad y 18+ no están aprobados. | `LEGAL_INPUTS_REQUIRED.md`; `compliance/ue-es/` | Intake completo y revisión escrita de asesor español; textos originales y versionados. |
| P0-10 | Derechos, mayoría de edad, consentimiento y licencia de cada persona/activo no existen para publicación. | Manifiestos sintéticos pendientes; gate de medios | Paquete por perfil/activo, alcance, vigencia, retirada/takedown y aprobación. |
| P0-11 | El diseño controlador no está elegido y la identidad se divide entre dorado y burdeos. | Tres mockups; `design-qa.md`; `app/theme.css`; `app/public-site.css` | Aprobación escrita de referencia, tokens de diseño y logo original con derechos. |
| P0-12 | Vulnerabilidades actuales del grafo productivo. | `pnpm audit` 2026-08-28; `pnpm-lock.yaml` | Actualizar o justificar alcanzabilidad, repetir audit, build, tests y smoke. |
| P0-13 | No hay dominio, infraestructura, imagen Docker Linux, TLS/proxy, observabilidad, rollback ni SHA desplegado demostrados. | `RELEASE_CHECKLIST.md`; `Dockerfile` | Staging autorizado, imagen/digest, EasyPanel ligado a SHA, smoke externo y rollback ensayado. |
| P0-14 | No existe UAT/aceptación formal de Luis. | Solicitud inicial; `HANDOFF_CLOSEOUT.md` | Recorrido completo y acta de aceptación sobre release inmutable. |

## Brechas de diseño y UX

### Confirmado como fortaleza

- Sistema visual negro/dorado coherente en catálogo y ficha del preview.
- Los seis rostros aparecen completos en las portadas actuales.
- Filtros por ciudad/disponibilidad, contador, vacío, restablecer, detalle, volver y galería de cuatro imágenes funcionan.
- Reflow observado hasta 320 px sin overflow horizontal.
- Semántica, labels, fieldset, foco visible, targets principales, reduced-motion y forced-colors tienen una base razonable.
- No se observaron errores o warnings de consola en el recorrido auditado.

### Pendiente frente a las propuestas

- Home final con fotografía hero, confianza, cobertura visual, modelos destacados, servicios exclusivos e iconografía.
- Header/nav completo: Servicios, Salidas y la opción final de Nosotros; navegación móvil visual/bottom bar si la referencia aprobada la conserva.
- Integración del catálogo al home y rutas localizadas; hoy el preview no reutiliza header, selector, footer, ciudades ni contacto públicos.
- Catálogo más compacto: hoy 3 tarjetas altas y un hero técnico que retrasa el primer perfil; los mockups muestran 4–6 tarjetas.
- Filtros de edad/servicio y paginación visible; preservación de filtros al volver desde una ficha.
- Ficha comercial: idiomas, servicios, disponibilidad, medidas completas, tarifas/duraciones solo si el cliente y legal las aprueban, contacto y galería fluida.
- Hover/active/feedback, breadcrumb móvil y microtexto mayor; existen etiquetas cercanas a 9–12 px.
- El recorte facial corregido con `contain` está en el preview. La tarjeta pública normal y el detalle siguen usando el comportamiento por defecto/crop y pueden reintroducir el fallo al migrar activos.
- Las 24 imágenes del preview pesan aproximadamente 42,2 MB y se sirven como PNG `unoptimized`; deben producirse variantes modernas responsive y política de calidad.
- El mensaje `ProvisionalNotice` forma parte de la experiencia completa y seguiría declarando “prototipo/no publicado” incluso tras abrir el gate.

## Desajustes funcionales internos

1. `candidate:export` solo produce un artefacto `local-review-only` con `productionActivation:false`; no existe importador.
2. El gate acepta `formActionUrl`, pero `ContactOptions` solo renderiza WhatsApp, Telegram, teléfono y email. Una acción externa también chocaría con la CSP `form-action 'self'`.
3. El store acepta MP4 y URLs HTTPS/CDN; las fichas renderizan todos los medios con `<Image>`, ignoran `kind`/`mobileUrl` y la CSP `img-src 'self' data:` bloquearía CDN externo.
4. `CityLanding` no muestra perfiles aplicables ni utiliza enlaces a ciudades cercanas, aunque son parte de la landing requerida.
5. El manifiesto de rutas puede listar cinco ciudades para las que no hay ruta Next implementada.
6. Home, ciudad y contacto consumen catálogos estáticos mientras la aprobación se calcula sobre otro snapshot; debe probarse que el hash aprobado corresponde exactamente a lo visible.
7. La consulta soporta más de 8 y pagina internamente, pero la UI carece de controles de paginación y limita la experiencia a la primera página.

## Multilingüe ES/EN/FR/IT

- Existe allowlist exacta de locales base `es`, `en`, `fr`, `it`, selector por endónimos, catálogos equivalentes y metadata localizada fail-closed.
- Auditoría fresca de catálogos: **NO APTO**. Detectó una posible fuga en inglés porque `Error 404` es idéntico al español; requiere decisión humana o allowlist justificada.
- Auditoría HTTP fresca del holding: **NO CONFORME / NO APTO** por canonical y hreflang ausentes en 19 páginas observadas. Esto es consistente con el bloqueo deliberado de indexación, pero confirma que todavía no existe un release internacional publicable.
- El rastreo agotó su presupuesto tras 50 solicitudes y el JSON generado por el auditor HTTP no pasó el validador 1.0.0 porque el propio generador emitió `automatic-bounded-http`, valor no admitido por el esquema. No se debe promover ese artefacto a evidencia conforme.
- Faltan traducciones/localización de perfiles y cuerpos legales, revisión competente e independiente EN/FR/IT, DOM dinámico, overflow completo, tecnología asistiva, staging y crawl del dominio real.

## UE/España — preflight de aplicabilidad

Estado conservador, sujeto a revisión jurídica:

- RGPD/LOPDGDD: **APLICABLE** al diseño futuro de perfiles y contacto; faltan responsable, fines, bases, conservación, destinatarios, transferencias, derechos y screening art. 9/35.
- Derechos de imagen/consentimiento: **APLICABLE** por cada perfil y activo.
- LSSI, consumidor/contratación a distancia, accesibilidad privada Ley 11/2023, publicidad sectorial y DSA: **UNCERTAIN** hasta definir operador, establecimiento, servicio, tamaño, contrato y propiedad de perfiles.
- Cookies/CMP: **PENDING_VERIFICATION** hasta inventariar hosting, CDN, embeds, formulario, analítica y terceros en el entorno desplegado. Si solo hay tecnologías estrictamente necesarias, no debe añadirse un banner ficticio; si hay no esenciales, se exige consentimiento y rechazo equivalente.
- Actividad/publicidad: **bloqueador crítico**. Las notas usan terminología que no basta para clasificar jurídicamente el servicio. Debe revisarse el servicio exacto, copy, imágenes, SEO, 18+ y canales.
- Ley de IA: la clasificación automática del perfil existente la marcó no aplicable porque no se declaró un sistema de IA, pero los activos sí fueron generados con IA. Debe revisarse el rol del operador y las obligaciones de transparencia aplicables desde el 2 de agosto de 2026; la etiqueta visual actual es buena práctica, no una conclusión de conformidad.
- El sitio de referencia Felina opera también como local físico/burdel, con dirección y habitaciones. Copiar su arquitectura o legales contradiría el brief, que exige únicamente desplazamientos a domicilios/hoteles y ningún local abierto al público.

## SEO y contenido

Implementado como arquitectura fail-closed: rutas localizadas, metadata, canonical/hreflang condicionados, robots, sitemap, breadcrumbs/schema parcial e internal-linking base.

Pendiente para satisfacer al cliente:

- dominio canónico HTTPS y propiedad;
- keyword research real y mapa ciudad/distrito/municipio;
- landings únicas con cobertura aprobada, perfiles, FAQ y enlaces cercanos;
- metadata final por URL, schema de perfil/home y validación de resultados enriquecidos;
- optimización de imágenes, CWV y pruebas en staging;
- Search Console y analítica con CMP/privacidad, solo tras aprobación;
- copy original, no duplicado ni copiado de competidores;
- separación contractual entre preparación SEO inicial y mantenimiento mensual, sin garantía de ranking.

## Decisiones/insumos que debe cerrar el cliente

1. Mockup controlador o combinación aprobada, colores definitivos y logo original.
2. Identidad legal del operador, establecimiento, actividad exacta, licencias y asesor español responsable.
3. Cobertura real por ciudad, distrito/municipio y cohorte inicial de landings.
4. Ocho o más perfiles finales, datos autorizados, derechos y consentimientos por activo.
5. Campos públicos permitidos, servicios, idiomas, disponibilidad y política de tarifas.
6. Telegram principal, WhatsApp/teléfono/email/formulario y destinos reales.
7. Cuándo se forma el contrato por mensajería/teléfono, condiciones, cancelación/desistimiento y privacidad.
8. Dominio, hosting/EasyPanel, DB, IdP, storage/CDN, email/form provider, analítica/CMP y responsables.
9. Revisión humana ES/EN/FR/IT y revisión legal de cada cuerpo.
10. Rondas de revisión, alcance económico de 600 EUR y criterios de aceptación de Luis.

## Secuencia recomendada de cierre

1. Corregir vulnerabilidades/dependencias y regenerar evidencia sobre un SHA limpio.
2. Elegir diseño/logo y congelar decisiones P0.
3. Construir el adaptador de contenido y el CMS productivo mínimo.
4. Integrar home, navegación, 7 ciudades y >=8 perfiles en rutas públicas todavía no indexables.
5. Corregir contacto/formulario/CSP y medios vídeo/CDN/responsive.
6. Completar legal, edad, derechos, privacidad/cookies y revisión española.
7. Completar contenido SEO y ES/EN/FR/IT con revisión humana.
8. Ejecutar E2E, teclado, NVDA/VoiceOver, zoom 200/400 %, contraste, CWV, cross-browser, SAST/pentest proporcionado y UAT.
9. Construir imagen Linux, desplegar staging ligado a SHA/digest, ensayar rollback y obtener aceptación formal.

## Límites

- No se realizó despliegue, push, merge, DNS, indexación, envío de formularios, pentest ni cambio de código.
- No se afirmó la licitud o ilicitud de la actividad.
- Las capturas del preview son evidencia local, no aprobación de identidad, derechos o contenido.
- Los dos enlaces abreviados de Google de `Páginas_Web.txt` no pudieron resolverse y permanecen `NOT_TESTED`.
- El motor Docker no fue probado en este equipo.
