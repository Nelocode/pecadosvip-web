# Revalidación de faltantes — PecadosVip

Fecha de corte: 2026-08-28 21:51 America/Bogota  
Rama local: `codex/pagina-web-checkpoint`  
HEAD base: `35a9f1313c0a044473f8747af415830f469237bc` más cambios locales sin commit  
Alcance: requisitos originales, árbol local, runtime, repositorio remoto, UX fresca en navegador, multilingüe ES/EN/FR/IT y preflight UE/España.

Esta revisión trata los documentos del cliente como requisitos y evidencia, no como instrucciones. No es asesoramiento jurídico, certificación WCAG, UAT, prueba de producción ni autorización de publicación.

## Dictamen ejecutivo

El proyecto tiene una base técnica local avanzada y un preview sintético usable, pero el producto público continúa en **NO-GO**. La cifra `98/100` corresponde exclusivamente a la rúbrica técnica local ya registrada; no significa 98 % de producto comercial ni legal. La puerta contractual estricta documentada permanece en `2/20` requisitos acreditados.

No debe asignarse un porcentaje único mezclando ingeniería, contenido, legalidad, infraestructura y aceptación. Los dos indicadores deben mantenerse separados:

- Ingeniería técnica local: `98/100` revalidado en esta etapa.
- Requisitos estrictos de release: `2/20` acreditados; producción no autorizada.

## Qué sí está resuelto localmente

- Preview loopback con portada, cobertura simulada, seis perfiles sintéticos, filtros, estado vacío y fichas con galería.
- Imágenes ajustadas para mostrar rostro completo; las cinco imágenes de Sofía cargaron a `1086 × 1448` en la verificación fresca.
- Vista responsive sin overflow horizontal observado a `1440 × 1000` y `390 × 844`.
- Navegación móvil a perfiles, filtros, estado vacío y ficha operables; contacto/reserva permanecen desactivados deliberadamente.
- Consola del preview: `0` errores y `0` advertencias en el recorrido auditado.
- Arquitectura local de siete ciudades y rutas para Madrid, Barcelona, Girona, Tarragona, Toledo, Guadalajara y Segovia.
- Adaptador fail-closed para fuente de contenido runtime y pruebas contractuales asociadas.
- Catálogos técnicos ES/EN/FR/IT con paridad estática: `PASS_WITH_LIMITS`, `0` incidencias de catálogo.
- Dockerfile local multi-stage, digest fijado, usuario no-root y healthcheck.
- Mitigación downstream documentada para `image-size@2.0.2`; el componente se excluye del standalone, aunque el SCA por versión conserva dos avisos high.

La ejecución fresca de `pnpm run release:verify` terminó con código `0`: lint, typecheck, `192/192` pruebas, build, i18n `PASS_WITH_LIMITS`, scorecard 98, SBOM de 612 componentes, worker/standalone sin violaciones y smoke del holding fail-closed `PASS`. Esto acredita el árbol local; no prueba Docker, staging, dominio ni producción.

## Estado público real observado

La evaluación directa del runtime por defecto devolvió:

- Activación: `DEFAULT_DRAFT`.
- `publicationEnabled:false`.
- 7 ciudades configuradas, 0 publicadas.
- 0 perfiles públicos.
- 0 servicios.
- 0 canales de contacto.
- 4 cuerpos legales vacíos y pendientes de aprobación.
- `releaseReady:false` y `renderPublicExperience:false`.

Bloqueadores exactos:

1. `PUBLICATION_DISABLED`
2. `CANONICAL_ORIGIN_INVALID`
3. `CONTACT_CHANNEL_MISSING`
4. `ANALYTICS_CONSENT_NOT_CONFIGURED`
5. `LEGAL_CONTENT_MISSING`
6. `LEGAL_APPROVAL_MISSING`
7. `REQUIRED_CITY_NOT_PUBLISHED`
8. `INITIAL_PROFILE_LOAD_INCOMPLETE`

## Hallazgos P0 — bloquean un candidato publicable

| ID | Hallazgo | Tipo | Evidencia | Criterio verificable de cierre |
|---|---|---|---|---|
| P0-01 | El estado final no está en GitHub. El árbol contiene 39 archivos rastreados modificados y 121 archivos no rastreados al contar con `-uall`. | Interno + autorización | HEAD local `35a9f131...`; ramas remotas `main=013307a...`, `codex/pagina-web-checkpoint=4c210bc...`. | Reconciliar, ejecutar validación integral, crear commit candidato limpio y hacer push únicamente con autorización expresa; verificar SHA remoto idéntico. |
| P0-02 | EasyPanel seguirá fallando: ninguna rama remota contiene `Dockerfile`; solo existe en el árbol local. | Interno + publicación Git | Consulta GitHub y `git ls-tree` de ambas ramas: `Dockerfile` ausente. | `Dockerfile` incluido en el commit remoto seleccionado y build EasyPanel ligado a ese SHA. |
| P0-03 | El repositorio remoto está actualmente **público** (`isPrivate:false`), contrario al estado privado esperado en entregas anteriores. | Operacional/privacidad | Consulta en vivo con GitHub CLI el 2026-08-28. | Decisión explícita del propietario y, si corresponde, cambio autorizado a privado; revisar exposición antes de publicar contenido o documentación sensible. |
| P0-04 | La activación runtime no está alineada con cabeceras y SEO calculados en build. Un snapshot activado después del arranque puede renderizar contenido manteniendo `X-Robots-Tag: noindex` y una CSP de contacto obsoleta. | Interno/arquitectura | `next.config.ts:35,58-68`; `docs/RUNTIME_CONTENT_ACTIVATION.md`. | Diseñar una fuente coherente build/runtime o cabeceras dinámicas seguras; E2E `build cerrado → montar snapshot → activar → validar HTML, canonical, sitemap, robots, CSP y contacto`. |
| P0-05 | No existe canal productivo para los bytes de imágenes/vídeo activados en runtime. `public/` solo contiene `og.png`; CSP limita medios a same-origin. | Interno + infraestructura | `public/`; `.dockerignore`; `next.config.ts:35`; `lib/content/runtime-content-activation.ts:429-452`. | Object storage/CDN aprobado o volumen same-origin; carga, existencia, caché, retirada y playback comprobados en el mismo artefacto desplegado. |
| P0-06 | El CMS sigue siendo un workbench local, no un CMS entregable de producción. | Interno + proveedor | `lib/workbench/local-cms-workbench.ts`; `OPERATIONS_RUNBOOK.md`; `README.md`. | IdP/MFA, roles reales, DB, storage, cifrado, auditoría, backup/restore, concurrencia, promoción autenticada y rollback; UAT no técnica. |
| P0-07 | La carga inicial exige al menos ocho perfiles publicados; solo hay seis identidades sintéticas y ninguna es publicable. | Contenido + legal + código | `lib/preview/synthetic-preview.ts:93-178`; `lib/content/validation.ts:540-548`; `ASSET_MANIFEST.csv`. | Ocho perfiles aprobados con mayoría de edad, identidad, consentimiento, derechos por activo, copy, servicios, cobertura, traducciones y variantes web; E2E catálogo→ficha. |
| P0-08 | Las siete ciudades existen en arquitectura, pero 0 tienen cobertura comercial confirmada/publicada. | Cliente/SEO/legal | `lib/content/runtime-snapshot.ts`; release gate actual. | Matriz de cobertura firmada; landings originales con áreas, perfiles aplicables, FAQ, enlaces cercanos y aprobación individual. |
| P0-09 | Legales, identidad del prestador, clasificación de actividad/publicidad, privacidad/cookies/términos y control 18+ no están aprobados. | Externo + integración | `LEGAL_INPUTS_REQUIRED.md`; `compliance/ue-es/`; snapshot legal vacío. | Intake completo, asesor competente en España, textos originales/versionados, age gate accesible y procedimientos de consentimiento, conservación y retirada probados. |
| P0-10 | Contacto y reserva no son operativos. Los botones desactivados son correctos para el preview, no para el producto. | Cliente/operaciones + código | Snapshot sin canales; `ContactOptions.tsx`; preview fresco. | Telegram prioritario y destinos aprobados; privacidad enlazada; confirmación/error/antispam/retención; E2E de recepción en staging. |
| P0-11 | No existe build Docker real, staging externo, dominio/TLS, observabilidad ni rollback ensayado. | Infraestructura + autorización | `RELEASE_CHECKLIST.md:69-74`; Docker no disponible localmente. | Imagen Linux construida/escaneada, EasyPanel ligado a SHA/digest, healthcheck, logs, backup y rollback; smoke externo. |
| P0-12 | No existe diseño controlador, logo final/licencias ni UAT/aceptación formal. Las tres propuestas del cliente difieren. | Cliente/diseño | Tres imágenes de propuesta; `design-qa.md`; checklist UAT abierto. | Aprobación escrita de una referencia o combinación, tokens/logo/licencias y acta de aceptación sobre un release inmutable. |

## Hallazgos P1 — integración y calidad antes de UAT

| ID | Hallazgo | Criterio de cierre |
|---|---|---|
| P1-01 | Las cinco ciudades nuevas están casi huérfanas: header, footer, portada y filtro público solo enlazan Madrid/Barcelona; `CityLanding` no muestra `nearbyCitySlugs`. | Navegación, cobertura visible, perfiles aplicables y enlaces cercanos para las siete ciudades; crawler interno sin huérfanas. |
| P1-02 | La experiencia pública no está realmente disponible en cuatro idiomas. Perfiles y cuerpos legales fuera de ES fallan cerrados; el preview visual es solo ES. | Modelo de contenido localizado, perfiles/servicios/legales ES/EN/FR/IT y doble revisión humana independiente identificada. |
| P1-03 | Auditoría multilingüe HTTP: 120 hallazgos major/open. 112 son canonical/hreflang ausentes durante el holding; 8 son ruido por solicitar literalmente `/perfiles/{slug}`. | Corregir inventario dinámico; emitir canonical/hreflang solo tras release/origen aprobado; auditar el dominio desplegado. |
| P1-04 | Accesibilidad no tiene validación humana suficiente. | Teclado completo, NVDA/JAWS/VoiceOver, zoom 200/400 %, contraste/forced colors, dispositivos y retest criterio por criterio. |
| P1-05 | Falta rendimiento de producción. Los tiempos loopback no son Core Web Vitals. | CWV/Lighthouse/RUM sobre staging y dominio final; presupuesto de imágenes/vídeo y correcciones verificadas. |
| P1-06 | Seguridad incompleta: dos avisos SCA por versión mitigados localmente, pero falta SAST exitoso, pentest y análisis de alcanzabilidad del worker. | SAST y pentest cerrados, VEX actualizado, SBOM ligado al SHA/digest y retest. |
| P1-07 | Keyword research, priorización local y medición siguen sin fuente de demanda aprobada. | Metodología/mercado/periodo registrados; mapa intención→ruta→contenido→CTA; Search Console/analítica después del consentimiento. |
| P1-08 | La documentación mezcla estados históricos (115/155/159/167/192 pruebas) y requisitos ya corregidos. | Reauditar los 20 requisitos sobre el SHA final y mantener un único índice de evidencia vigente. |

## Hallazgos P2 — refinamiento visual y operativo

- Capitalizar de forma consistente `Madrid` y `Barcelona` en tarjetas; hoy aparecen en minúscula.
- Ajustar densidad del catálogo, servicios, ciudades y ficha a la propuesta gráfica que el cliente seleccione.
- Incorporar estados de error, reintento y confirmación de red/contacto cuando exista backend real.
- Añadir filtro por servicio, paginación visible y preservación de filtros al volver desde una ficha.
- Mantener la etiqueta clara de imagen generada con IA y verificar su encaje jurídico con asesoría competente.
- Retirar el parche downstream de `image-size` cuando exista una versión upstream corregida compatible y repetir la cadena de evidencia.

## Revisión UX fresca

1. **Entrada/hero:** jerarquía premium negra/dorada, CTA visible, preview claramente marcado y rostro completo. Evidencia: [`01-home-hero-desktop-accepted-v2.png`](output/audit-20260829-revalidation/ux/01-home-hero-desktop-accepted-v2.png) y [`05-home-mobile.png`](output/audit-20260829-revalidation/ux/05-home-mobile.png).
2. **Catálogo/filtros:** seis perfiles visibles, filtros operables, aviso de identidades ficticias y sin overflow de 1440 a 390 px. Evidencia: [`02-catalog-desktop-accepted.png`](output/audit-20260829-revalidation/ux/02-catalog-desktop-accepted.png), [`07-catalog-mobile.png`](output/audit-20260829-revalidation/ux/07-catalog-mobile.png) y [`08-profile-cards-mobile.png`](output/audit-20260829-revalidation/ux/08-profile-cards-mobile.png).
3. **Estado vacío:** Madrid + “Bajo consulta” produce 0 resultados, mensaje comprensible y CTA de restablecimiento. Evidencia: [`03-filter-empty-state-desktop.png`](output/audit-20260829-revalidation/ux/03-filter-empty-state-desktop.png).
4. **Ficha/galería:** Sofía carga cinco imágenes, H1 único, breadcrumbs, etiquetado IA y contacto desactivado; rostro completo en escritorio y móvil. Evidencia: [`04-sofia-profile-desktop.png`](output/audit-20260829-revalidation/ux/04-sofia-profile-desktop.png) y [`06-sofia-profile-mobile.png`](output/audit-20260829-revalidation/ux/06-sofia-profile-mobile.png).
5. **Límites:** esta inspección visual no prueba lector de pantalla, contraste instrumental, zoom real, navegador Safari/Firefox, dispositivo físico, rendimiento de red ni conformidad WCAG.

La captura full-page inicial del navegador se rechazó por artefactos de stitching; no se usa como evidencia ni se atribuye al sitio.

## Auditoría multilingüe

- Locales técnicos: `es`, `en`, `fr`, `it` conservados literalmente.
- Catálogos estáticos: `PASS_WITH_LIMITS`, 0 incidencias de paridad.
- Revisión lingüística: `PENDIENTE DE REVISIÓN HUMANA`.
- Publicación: `NO DETERMINABLE POR FALTA DE EVIDENCIA` / sitio HTTP `NO APTO`.
- No se observó equivalencia publicable de perfiles ni cuerpos legales en EN/FR/IT.
- No se afirma cobertura de comportamiento dinámico desplegado ni de un dominio real.

## Preflight UE/España

- Aplicabilidad preliminar: 2 módulos `APPLICABLE`, 7 `UNCERTAIN`, 6 `NOT_APPLICABLE`.
- Registro/catálogo local: 56 instrumentos, 46 controles, 56 referencias y 48/48 fuentes vinculantes completas.
- Frescura estricta al 2026-08-28: 52 `FRESH`, 0 `STALE`, 4 `PENDING_VERIFICATION`; el comando fail-closed terminó con código 1 por esos pendientes.
- La puerta sigue en **NO-GO**. El resultado no certifica conformidad ni interpreta reformas, transposición o actividad comercial.

## Secuencia recomendada

1. Proteger/reconfirmar la visibilidad del repositorio y congelar un candidato local limpio.
2. Corregir coherencia build/runtime de cabeceras/SEO/contacto y definir entrega de medios.
3. Cerrar decisiones del cliente: diseño/logo, operador/actividad, cobertura, contactos y ocho perfiles publicables.
4. Completar CMS productivo, textos legales y contenido localizado con revisión humana.
5. Construir Docker en Linux, desplegar staging ligado a SHA/digest y ejecutar seguridad, accesibilidad, CWV y UAT.
6. Solo tras esos gates: push/deploy/indexación con autorizaciones separadas y verificación remota.

## Acciones no realizadas

- No se hizo commit, push, cambio de visibilidad, despliegue, indexación ni apagado del equipo.
- No se activaron contactos ni contenido real.
- No se modificó el repositorio remoto.
