# HANDOFF / CLOSEOUT — PecadosVip Web

Estado: **EN EJECUCIÓN — NO ES ENTREGA FINAL — `NO-GO` PÚBLICO**.

Última reconciliación técnica: 2026-08-27 — candidato multilingüe 98.

Este archivo se cerrará al congelar un release. Verificación técnica local, certificación WCAG, conformidad legal, aceptación contractual, merge, despliegue, indexación y operación real son estados independientes.

## Resumen ejecutivo

Existe un checkpoint privado recuperable con gate público fail-closed, holding de producción local, harness sintético aislado, contratos automatizados, persistencia/medios/workbench locales, backup/restore corregido y exportación candidata local bloqueada para activación productiva.

La base técnica local alcanzó **98/100 (`LOCAL_TARGET_EARNED`)**: 15/15 en inventario y evidencia, 9/10 en arquitectura, 45/45 en implementación e integración, 24/25 en QA y correcciones, y 5/5 en empaquetado/handoff. Registra una captura durable con lint, typecheck, build, validador i18n y **155/155 pruebas PASS**. El ZIP se genera como handoff externo; contenido real, derechos/consentimientos, revisión humana de traducciones, revisión legal, DOM/navegador/AT/overflow multilingüe, infraestructura, staging, UAT y despliegue siguen pendientes. Nada de lo observado autoriza publicación.

## Resultado técnico confirmado

La captura durable anterior sobre `8231629f98e4cb2fff4264e9181286cd8dcda466` ejecutó `pnpm run validate`: lint PASS, typecheck PASS, **115/115 pruebas PASS** y build PASS; exit code 0. Después ejecutó `pnpm audit --prod --audit-level=moderate` con exit code 0 y `No known vulnerabilities found`.

Evidencia durable histórica: `evidence/87-local-checkpoint/evidence-manifest.json`, SHA-256 `673FA0FB0CBDB5516C29F446B6A0E9DD0F8AF3079BC2A2E3736583210EDC1E93`. El manifiesto registra ambiente, comandos, tiempos, códigos de salida y hashes de ambos logs. No es el manifiesto de los candidatos 95 o 98 y no debe presentarse como tal.

La captura durable del checkpoint 98 sobre `73249861acb9874a310e9f112450d00a65a4b1e3` ejecutó `pnpm run release:verify` y el audit productivo con exit code 0. Evidencia: `evidence/98-local-technical-checkpoint/evidence-manifest.json`, SHA-256 `7EC3DB4BDF77E732E8B22D8EC6E1B5C3646CF27F406E21E5C75F64AE78A7A512`; log de release SHA-256 `D484CFBC41B35A07FE2642B6665B936639E41CC9793F9B8FEC7EA11B5FA2E9AC`; log de audit SHA-256 `AB49A74F6919CAFC65A62432459355A0791A7DE0D785F02313169AF4CE60EE07`. El checkpoint 95 conserva su evidencia histórica separada.

## Estado multilingüe del candidato 98

- Locales exactos: `es`, `en`, `fr`, `it`, con rutas prefijadas y selector por endónimos.
- Las rutas heredadas sin prefijo se conservan como compatibilidad `noindex`.
- Los catálogos presentan 0 hallazgos deterministas; no acreditan calidad lingüística en contexto.
- Perfiles dinámicos y cuerpos legales quedan cerrados fuera de ES si no existe traducción aprobada; no hay fallback silencioso.
- Dictamen técnico multilingüe: `NO DETERMINABLE`.
- Dictamen lingüístico: `PENDIENTE DE REVISIÓN HUMANA`.
- Dictamen de publicación: `NO DETERMINABLE POR FALTA DE EVIDENCIA`.
- Faltan DOM/navegador/tecnología asistiva/overflow, revisión humana independiente, especialista legal, staging y despliegue.

Dependencias y seguridad:

- Next.js actualizado a `16.2.11`.
- `pnpm audit --prod --audit-level=moderate`: exit code 0, `No known vulnerabilities found`.
- Codex Security integrado: **FAILED / NOT_TESTED**; falló antes de crear `scanId` por un sourcemap anidado de Babel bajo `node_modules/.pnpm`.
- Revisión estática manual limitada: 0 hallazgos críticos, altos o medios y 6 LOW condicionales.
- SCA: `PARTIAL`. El audit de advisories fue favorable en su captura, pero no existe alcanzabilidad integral.
- Inventario CycloneDX local: grafo estructurado derivado de `pnpm-lock.yaml`; no fue validado contra el esquema oficial y no es VEX, provenance, reachability ni attestación.
- Validador de `dist`: PASS preliminar para inventario SHA-256, requeridos, symlinks, nombres/rutas prohibidos, colisiones y presupuestos; no es escaneo de contenido, firma ni pentest.
- Excepción de tooling: `next` 16.2.11 convive con `eslint-config-next` 16.2.6; lint pasa, pero no se declara alineación exacta de versiones.

El resultado de advisories, el inventario del lockfile, el validador de artefacto y la revisión manual no sustituyen SAST integrado, alcanzabilidad, pentest ni validación de una infraestructura productiva.

## Valor entregado en el checkpoint

- Publicación e indexación bloqueadas por defecto.
- Holding y rutas públicas protegidos con headers defensivos; `X-Powered-By` desactivado.
- Preview sintético con cuatro perfiles/estados, vacío y error, sin contenido ni contacto reales.
- Contratos y pruebas para contenido, permisos, revisiones, disponibilidad, orden de medios y auditoría.
- Persistencia JSON, almacenamiento local de medios, workbench loopback y backup/restore para desarrollo/pruebas.
- Imágenes sintéticas normalizadas bajo límites a variantes WebP con metadatos eliminados; no hay antivirus, CDN ni validación de derechos reales.
- MP4 local limitado al contrato estructural `bounded-mp4-container-v1`; no se acredita codec, decodificación, playback, Range ni transcodificación.
- Lock de archivo local cooperativo para repositorio, medios y snapshots de backup/export; no es un lease distribuido y un lock obsoleto no se elimina automáticamente: bloquea la operación de forma fail-closed.
- Restore corregido para recuperar `profiles.json` y `media/` en la raíz activa.
- Exportador local fail-closed con JSON canónico, inventario/SHA-256, `productionActivation:false` y sin IDs, evidencia ni auditoría internas.
- Auditoría técnica UE/España y decisión pública `NO-GO`; no sustituye asesoramiento jurídico.

## Evidencia de navegador histórica del checkpoint 95

### Producción local 95 — puerto 4320

- `/`, `/madrid`, `/barcelona`, `/perfiles` y `/contacto`: HTTP 200.
- `/legal/privacidad` y `/preview-local-sintetico`: HTTP 404 mientras los gates permanecen cerrados.
- `robots.txt`: HTTP 200 y `Disallow: /`; sitemap HTTP 200 sin `<url>`.
- Headers en raíz: CSP, COOP, `Permissions-Policy`, `Referrer-Policy`, `nosniff`, `DENY` y `X-Robots-Tag`; `X-Powered-By` ausente.
- Consola: 0 errores y 0 advertencias.
- Red: 7 requests locales, todos HTTP 200.
- Navegación loopback aproximada: DCL 176 ms/load 294 ms; no son CWV.
- Sin overflow horizontal a 1280/320 px.
- Tab + Enter sobre el skip link enfocó `main-content`.

Capturas versionables: `output/playwright/pv95/production-holding-320.png` y `output/playwright/pv95/production-holding-1920.png`.

### Preview sintético local 95 — puerto 4330

- Cuatro perfiles/tarjetas sintéticos, más vacío y error seguro.
- Consola: 0 errores y 0 advertencias; únicamente información de React DevTools.
- 120 requests locales de desarrollo.
- Sin formularios, botones ni inputs; el skip link fue el único enlace interactivo observado.
- Sin overflow horizontal a 1920/320 px; altura móvil observada 3962 px.
- Tab + Enter sobre el skip link enfocó `main-content`.

Capturas versionables: `output/playwright/pv95/synthetic-preview-1920.png` y `output/playwright/pv95/synthetic-preview-320-full.png`.

Los hashes y límites se registran en `QA_EVIDENCE.md`.

## Calidad visual

`design-qa.md` permanece **BLOCKED**. Los tres mockups aportados difieren materialmente en navegación, hero, tarjetas, cobertura y servicios; no existe selección aprobada de una referencia controladora. El preview observado es legible y sin overflow en los viewports medidos, pero no se declara fidelidad ni aceptación visual.

## Qué no prueba esta evidencia

- No certifica WCAG ni EN 301 549.
- No acredita lector de pantalla, zoom real 200/400 %, ejecución real de forced-colors o dispositivo físico. Solo existe un contrato estático CSS para forced-colors.
- No valida contenido, perfiles, contacto, pagos, analítica, cookies ni operación reales.
- No prueba fidelidad contra un mockup controlador aprobado.
- No demuestra SAST integrado exitoso, alcanzabilidad, pentest, rendimiento público o Core Web Vitals.
- No equivale a UAT ni aceptación contractual.
- No autoriza merge, despliegue o indexación.

## Paquete ZIP por etapa

Como antecedente, el empaquetador del checkpoint 95 se ejecutó sobre un árbol limpio y el paquete pasó la verificación interna de sus **172 archivos**, incluyó los **8 insumos requeridos** y excluyó `.git`, dependencias, caches, secretos y datos locales del CMS. La copia extraída instaló sus dependencias offline y ejecutó `pnpm run release:verify` con 144/144 pruebas.

El ZIP del candidato 98 se generará solo después de un commit documental limpio, captura durable y verificación desde una extracción nueva. Su ruta, tamaño y SHA-256 se comunicarán externamente para evitar una referencia circular. `LEEME_PRIMERO.md` y `repository/SUBIR_PROYECTO.md` deben mantener instrucciones sencillas de validación y GitHub privado, sin ejecutar ni autorizar push o despliegue. El ZIP completo es **CONFIDENCIAL** porque contiene insumos del cliente; no debe publicarse ni subirse como release.

## Instrucciones de operación local

Consultar `README.md`, `OPERATIONS_RUNBOOK.md` y `STAGE_ARCHIVE_GUIDE.md`. El preview sintético es solo para desarrollo loopback y debe continuar devolviendo 404 en build de producción.

La configuración local no es un diseño productivo: no hay proveedor de identidad externo, cifrado en reposo, multiusuario probado, storage gestionado, alta disponibilidad ni observabilidad de producción.

## Herramientas y versiones

- Node.js requerido: `>=22.13.0`.
- pnpm: `11.19.0`.
- Next.js: `16.2.11`.
- React: `19.2.6`.
- Vinext: `1.0.0-beta.3`.
- Vite: `8.0.13`.

## Inventario del paquete

- aplicación y preview: `app/`;
- contratos, persistencia, medios, publicación candidata, workbench y preview: `lib/`;
- launchers, backup, restore, exportación y empaquetado: `scripts/`;
- pruebas: `tests/`;
- evidencia local: `.playwright-cli/` y `output/playwright/` cuando aplique;
- auditorías: `compliance/ue-es/` y `compliance/multilingual/`;
- control y handoff: archivos Markdown/CSV de la raíz.

El inventario interno, los hashes por archivo y las exclusiones se verifican con `VALIDAR_ARCHIVO.ps1`. Cuando se genere el ZIP 98, su SHA-256 externo deberá entregarse junto con la ruta local en el cierre de etapa.

## Resultado por requisito

Consultar `REQUIREMENTS_TRACEABILITY.csv`. Un resultado de 155/155 pruebas no convierte automáticamente un requisito en `PASS`; cada requisito necesita criterio de aceptación y evidencia asociada. La verificación estricta permanece en **2/20**.

Las métricas de avance ponderado son proxies de ejecución y se mantienen separadas de la aceptación contractual. Este documento no recalcula ni certifica el porcentaje del proyecto.

## Riesgos residuales y pasos externos

Pendientes principales:

- referencia visual controladora y aceptación de diseño;
- contenido, cobertura, derechos y consentimientos;
- clasificación jurídica española de actividad/publicidad y textos legales;
- dominio, hosting, DB, identidad, cifrado y almacenamiento productivos;
- canales, privacidad, CMP, analítica y Search Console;
- QA con tecnología asistiva, SAST integrado, alcanzabilidad, pentest, performance y UAT;
- autorizaciones separadas de merge, despliegue e indexación.

No se almacenarán secretos ni datos personales reales en este documento o en los fixtures.

## Rollback

El repositorio y la rama permiten recuperar el checkpoint. El procedimiento de release deberá incluir copia del artefacto anterior, restauración verificada y rollback documentado sin `git reset --hard` ni borrados amplios.

Las pruebas locales de backup/restore no acreditan recuperación en infraestructura de producción.

## Estado final

**NO CUMPLIDO** mientras existan requisitos obligatorios abiertos o bloqueados. Solo cambiará a `LISTO PARA ACEPTACIÓN` después de verificar todos los criterios P0/P1. `ACEPTADO Y CERRADO` requiere aceptación formal del cliente y no puede inferirse de pruebas automatizadas.

## Lecciones aprendidas

- El preview debe permanecer separado del gate público y probarse como 404 en producción.
- Una captura responsive prueba el estado observado, no fidelidad ni aceptación.
- Un advisory scan limpio no reemplaza un scanner integrado ni un pentest.
- Un inventario CycloneDX derivado del lockfile no reemplaza validación oficial de esquema, VEX, provenance o reachability.
- Un contrato CSS de forced-colors no acredita su ejecución en navegador o tecnología asistiva.
- Los tiempos de loopback no equivalen a rendimiento público ni Core Web Vitals.
- El ZIP por etapa solo existe cuando fue generado, inventariado, hasheado y revisado.
- Un control local verde no amplía la autorización de publicación.
