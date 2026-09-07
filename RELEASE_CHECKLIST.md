# Checklist de release — PecadosVip Web

Estado actual: **`NO-GO`**. Candidato técnico local: **98/100**. Última reconciliación: 2026-08-28.

Un `[x]` acredita únicamente el control local descrito. No equivale a certificación WCAG, conformidad legal, aceptación contractual, merge, despliegue, operación real ni autorización de indexación.

## Evidencia técnica local disponible

- [x] `pnpm run validate` sobre el commit candidato `8231629f98e4cb2fff4264e9181286cd8dcda466`: lint PASS, typecheck PASS, **115/115** pruebas PASS y build PASS; exit code 0.
- [x] Checkpoint 95 histórico: `pnpm run release:verify` con lint PASS, typecheck PASS, **144/144** pruebas PASS, build PASS, scorecard 95, inventario de lockfile, artefacto `dist` y smoke del holding PASS.
- [x] Candidato 98 local: **155/155** pruebas PASS, typecheck PASS, build PASS y validador i18n PASS; scorecard 98 con dimensiones 15/15, 9/10, 45/45, 24/25 y 5/5.
- [x] Remediación local actual: `release:verify` con **167/167** pruebas, build, SBOM de 612 componentes, artefactos worker/standalone y smoke fail-closed PASS.
- [x] Cierre técnico local final sobre el árbol de trabajo derivado de `35a9f1313c0a044473f8747af415830f469237bc`: `release:verify` con **192/192** pruebas, lint, typecheck, build, i18n, scorecard 98, SBOM de 612 componentes, artefactos worker/standalone y smoke fail-closed PASS. El árbol aún no es un commit candidato.
- [x] Auditoría de cuarta zona Barcelona, favicon transparente y tipografía sobre el árbol local del 2026-08-30: `release:verify` con **204/204** pruebas, lint, typecheck, build, i18n, scorecard 98, SBOM de 612 componentes, artefactos worker/standalone y smoke fail-closed PASS. Los cambios siguen sin commit, despliegue ni aprobación de publicación.
- [x] Captura durable del candidato 98 sobre `73249861acb9874a310e9f112450d00a65a4b1e3`; manifiesto SHA-256 `7EC3DB4BDF77E732E8B22D8EC6E1B5C3646CF27F406E21E5C75F64AE78A7A512`.
- [x] Manifiesto y logs guardados bajo `evidence/87-local-checkpoint/`, con SHA-256 por comando y hash del manifiesto `673FA0FB0CBDB5516C29F446B6A0E9DD0F8AF3079BC2A2E3736583210EDC1E93`.
- [x] Evidencia histórica: `pnpm audit --prod --audit-level=moderate` registró exit code 0 y `No known vulnerabilities found` en su commit; no describe el árbol actual.
- [x] Audit actual: solo permanecen los dos avisos de `image-size@2.0.2` basados en versión. El árbol aplica un parche downstream con hash bloqueado, ejecuta pruebas CJS/ESM y excluye el componente del standalone; véase `SECURITY_ADVISORY_VEX.md`. Esto no se presenta como audit limpio.
- [ ] Codex Security integrado: **FAILED / NOT_TESTED**, sin `scanId`, por fallo de ingesta de un sourcemap anidado; no marcar PASS.
- [x] Revisión estática manual limitada: 0 critical/high/medium y 6 LOW condicionales.
- [x] Evidencia histórica 95 de holding local en modo producción: `/`, `/madrid`, `/barcelona`, `/perfiles` y `/contacto` HTTP 200.
- [x] Evidencia histórica 95 de rutas cerradas: `/legal/privacidad` y `/preview-local-sintetico` HTTP 404.
- [x] `robots.txt` bloquea `/` y el sitemap no contiene `<url>`.
- [x] La raíz entrega CSP, COOP, `Permissions-Policy`, `Referrer-Policy`, `nosniff`, `DENY` y `X-Robots-Tag`; `X-Powered-By` ausente.
- [x] Holding: consola 0 errores/advertencias, 7 requests locales 200 y sin overflow a 1280/320 px.
- [x] Holding: Tab + Enter sobre el skip link enfoca `main-content`.
- [x] Browser multilingüe actual: 16/16 raíces ES/EN/FR/IT a 320/390/768/1440 px, 4/4 legales holding, 4/4 perfiles inexistentes localizados y 4/4 rutas negativas PASS; sin errores inesperados, requests externos ni overflow.
- [x] Preview sintético: 6 perfiles/tarjetas, filtros, estado vacío, ficha de Sofía, galería y error seguro; consola 0 errores/advertencias.
- [x] Preview: 8 imágenes urbanas locales cargadas, sin destinos externos, contacto/reserva desactivados y sin overflow a 1440/1180/780/390 px.
- [x] Preview: Tab + Enter sobre el skip link enfoca `main-content`.
- [x] Exportador local fail-closed con JSON canónico, inventario/SHA, `productionActivation:false` y sin IDs/evidencia/auditoría internos.
- [x] Restore corregido para reconstruir `profiles.json` y `media/` en la raíz de datos activa.
- [x] ZIP del checkpoint 95 generado desde árbol limpio, inventariado, hasheado y reproducido desde una extracción temporal.
- [x] ZIP final de cierre técnico generado con código, insumos, guías y evidencia explícita; 321 entradas verificadas desde una extracción temporal nueva y acompañadas por SHA-256 externo.

Límites: no hubo HAR persistido, lector de pantalla, zoom real 200/400 %, dispositivo físico, SAST integrado exitoso, pentest, UAT ni infraestructura productiva. Los tiempos loopback aproximados (DCL 176 ms/load 294 ms) no son Core Web Vitals.

## Puerta multilingüe ES/EN/FR/IT

- [x] Locales base exactos `es`, `en`, `fr`, `it`; sin regiones inferidas.
- [x] Rutas `/{locale}` equivalentes para portada, ciudades, listado, ficha, contacto y documentos legales.
- [x] Rutas legacy sin prefijo preservadas con `noindex`.
- [x] Catálogos con paridad determinista y 0 hallazgos; placeholders e invariantes validados.
- [x] Metadata localizada y contrato canonical/hreflang sometido a gates de release/indexación.
- [x] Perfiles dinámicos y cuerpos legales no traducidos fallan cerrados fuera de ES; no existe fallback silencioso.
- [x] DOM del holding, legal bloqueado y 404 localizado auditado en los cuatro idiomas sobre standalone loopback.
- [x] Reflow/overflow del holding comprobado por locale a 320/390/768/1440 px; selector y skip link operables.
- [ ] Reflow/overflow y navegación completa comprobados por locale en navegador.
- [ ] Tecnología asistiva y criterios de accesibilidad comprobados por locale.
- [ ] EN/FR/IT revisados por persona competente y segundo revisor independiente.
- [ ] Cuerpos legales localizados y revisados por especialista jurídico/privacidad/consentimiento.
- [ ] Staging multilingüe y recorridos E2E aprobados.

Dictamen técnico local del alcance renderizado: `PASS WITH LIMITS`; lingüístico `PENDIENTE DE REVISIÓN HUMANA` y publicación `NO DETERMINABLE POR FALTA DE EVIDENCIA`. La prueba loopback no cambia los gates legal, humano, staging o despliegue.

## 1. Evidencia, alcance y aceptación

- [ ] Requisitos P0/P1 implementados o excepción aprobada por escrito.
- [ ] `REQUIREMENTS_TRACEABILITY.csv` sin estados obligatorios `OPEN`, `BLOCKED` o `AT_RISK`.
- [ ] Diseño controlador seleccionado, versionado y aprobado; `design-qa.md` permanece BLOCKED ante tres mockups distintos.
- [ ] Contenido, cobertura y copy con versión y aprobación.
- [ ] Perfiles y medios reales con mayoría de edad, consentimiento y derechos vigentes.
- [ ] Documentación legal y clasificación de actividad/publicidad aprobadas por asesor competente.
- [ ] Dominio, contacto, infraestructura, analítica y responsables confirmados.
- [ ] Acta de UAT y aceptación contractual firmada.

## 2. Artefacto y operación

- [ ] Commit y tag candidatos inmutables; árbol Git limpio.
- [x] `Dockerfile` multi-stage local con Node `24.19.0-bookworm-slim` fijado al digest multi-plataforma oficial observado el 2026-08-28, runtime no-root, puerto 3000, healthcheck loopback y etiqueta de revisión por `GIT_SHA`; contrato estático probado.
- [x] Contexto Docker con deny-all/allowlist; excluye evidencia, inventarios del cliente, datos CMS, archivos de entorno, Git, ZIP y recursos sintéticos fuente.
- [x] Artefactos worker y standalone inventariados por separado; el standalone exige `server.js`, manifests, peers runtime `react`, `react-dom` y `scheduler`, más Vinext y su `prod-server`.
- [x] Digest inmutable de la imagen base registrado y aplicado al Dockerfile; falta comprobar la construcción efectiva en un motor Docker Linux.
- [x] `node dist/standalone/server.js` probado en loopback con 41 rutas holding, headers, robots cerrado, sitemap vacío y 6 rutas negativas/legacy 404.
- [ ] Imagen construida y ejecutada con un motor Docker Linux; Docker no está disponible en este equipo.
- [ ] Build/deploy de EasyPanel ligado al SHA candidato, healthcheck y smoke externo verificados.
- [x] Lockfile congelado e instalación offline reproducible sobre la copia extraída del checkpoint 95; `release:verify` terminó con exit code 0.
- [x] `pnpm run release:verify` histórico capturado sobre `15d56f0e5812a06e03dea781487f7553ce010a5c`; 144/144 y todos los subgates PASS.
- [x] `release:verify` repetido sobre el árbol final local con 192/192 pruebas y todos sus subgates PASS.
- [x] ZIP definitivo extraído en una carpeta temporal nueva; `VALIDAR_ARCHIVO.ps1` verificó las 321 entradas y las evidencias finales obligatorias antes de eliminar solo la extracción temporal.
- [x] Gate público fail-closed y preview local inaccesible en el build de producción local.
- [x] Exportador de candidato local genera activación productiva falsa, inventario y SHA.
- [x] Inventario y hashes internos del checkpoint 95 verificados.
- [x] Inventario y hashes internos del ZIP final verificados; el SHA-256 externo se recalcula y comunica fuera del ZIP para evitar autorreferencia.
- [ ] Configuración candidata revisada sin secretos.
- [ ] Backup y restore ensayados sobre el entorno candidato, no solo en fixtures locales.
- [ ] Procedimiento de rollback probado en la infraestructura autorizada.
- [ ] Observabilidad, alertas y runbooks de producción aprobados.

## 3. Calidad funcional, visual y seguridad

- [ ] E2E público completo: portada → ciudad → listado → ficha → contacto con contenido aprobado.
- [x] Estados sintéticos de disponibilidad, vacío y error representados en harness aislado.
- [ ] Estados reales de no disponible, filtros inválidos, 404, error de red y fallback probados end-to-end.
- [x] Capturas del holding histórico en 320/1920, del preview en escritorio/móvil completo y del holding/404/legal multilingüe actual en 320/390/1440.
- [ ] Reflow y zoom real 200/400 % sobre la experiencia pública candidata.
- [ ] Navegación completa con teclado y orden de foco en flujos reales; el skip link sí pasó Tab + Enter.
- [ ] NVDA, JAWS o VoiceOver sobre flujos críticos.
- [ ] Contraste completo, forced-colors, texto alternativo, labels, errores y target size en estados reales.
- [ ] Comparación visual con una referencia controladora aprobada.
- [x] Consola observada sin errores ni advertencias en holding y preview sintético.
- [ ] Conservar HAR del sitio público candidato y verificar terceros/CSP en infraestructura real.
- [ ] Performance y Core Web Vitals medidos sobre build desplegado.
- [ ] El SCA basado en versión aún reporta dos advisories de `image-size@2.0.2`; existe parche downstream fijado y VEX, y el componente se excluye del standalone, pero no se presenta como auditoría limpia.
- [ ] SAST integrado exitoso y hallazgos reconciliados; el intento actual falló sin scan.
- [ ] Análisis de alcanzabilidad y pentest según riesgo.
- [ ] CMS autenticado: identidad real, roles, concurrencia, medios, recuperación y multiusuario.

## 4. SEO, privacidad y datos

- [x] Estado negativo local: release sin indexación, robots cerrado y sitemap público vacío.
- [x] Harness sintético 404 en modo producción local.
- [ ] Origen canónico HTTPS verificado.
- [ ] Metadata, headings, breadcrumbs, schema, enlaces, robots y sitemap auditados sobre release abierto aprobado.
- [ ] Solo rutas aprobadas, canónicas y útiles son indexables.
- [ ] Formularios reales minimizan datos y muestran información de privacidad aprobada.
- [ ] CMP acepta, rechaza, configura y revoca; cero tracking antes del consentimiento.
- [ ] Analítica usa allowlist y no contiene PII, perfiles ni contacto.
- [ ] Legal, cookies, edad y procedimientos de derechos aprobados.
- [ ] Evidencia de red durable del release mediante HAR o equivalente.

## 5. Gates externos separados

- [ ] Aceptación formal del release por Luis Araujo.
- [ ] Autorización de merge.
- [ ] Autorización de despliegue y ventana operativa.
- [ ] Smoke postdespliegue y observabilidad PASS.
- [ ] Autorización de indexación.
- [ ] Search Console y analítica configuradas y verificadas, si aplican.

No marcar un gate por evidencia de otro: un build no es UAT; un preview sintético no es el producto; una captura no es certificación WCAG; SCA limpia no es pentest; un merge no es despliegue; un despliegue no autoriza indexación.

La verificación estricta permanece en **2/20** y el candidato 98 no autoriza push, merge, despliegue, dominio, indexación ni datos reales.
