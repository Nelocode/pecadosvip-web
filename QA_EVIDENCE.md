# QA EVIDENCE — PecadosVip Web

Última reconciliación documental: 2026-09-01 — cierre del boundary público, preview sintético fail-closed y candidato 98.

Estado del checkpoint: **98/100 `LOCAL_TARGET_EARNED`, `PASS_WITH_LIMITS` técnico local, captura durable registrada y `NO-GO` público**.

Esta evidencia no constituye certificación WCAG, dictamen legal, aceptación contractual, UAT, autorización de merge/despliegue/indexación ni prueba de operación en producción. Todas las comprobaciones de navegador descritas se hicieron exclusivamente en loopback.

## Cierre del boundary público — 2026-09-01

| Control | Resultado observado | Evidencia y límite |
|---|---|---|
| Puerta completa del candidato integrado | PASS | `pnpm run release:verify`; exit code 0: lint, typecheck, **208/208** pruebas, build, i18n, scorecard, SBOM, artefactos worker/standalone y smoke de producción. El único aviso preexistente de lint se corrigió y `pnpm run lint` volvió a terminar con exit code 0 sin avisos. |
| Rutas administrativas abandonadas | PASS LOCAL | El árbol público ya no contiene `app/admin/**` ni `app/api/admin/**`; también se retiraron el inicializador SQLite y la autenticación huérfana con credenciales iniciales definidas en código. El workbench soportado permanece como proceso separado de loopback mediante `pnpm run cms:local`. |
| Smoke negativo de administración | PASS LOCAL | El standalone devolvió HTTP 404 para `GET /admin`, `/admin/login`, `/admin/kyc`, `/api/admin` y para `POST /api/admin/auth/login` y `/admin/auth/login`. Es una prueba local del artefacto construido, no del hosting. |
| Preview sintético y medios | PASS LOCAL | En producción, preview y medios devuelven HTTP 404. En desarrollo con flag exacto y loopback, home y tres familias de medios comprobadas devolvieron HTTP 200 con `private, no-store` y `noimageindex`; un `Host` externo fue bloqueado. |
| Artefacto worker | PASS | 167 archivos, 3.221.421 bytes y 0 violaciones; reporte SHA-256 `3EBD0C608BB28AF6333412B9F97B552847F84A7BCB074A1DE554EFA3C09BF573`. |
| Artefacto standalone Node | PASS | 2.426 archivos, 29.065.614 bytes y 0 violaciones; reporte SHA-256 `D12319CDCDE3D06D9428F13E543570AD1184D791D1BBA05CBAEEB7ADB5B98B05`. |
| SBOM local | PASS WITH LIMITS | 612 componentes; SHA-256 `69A3F61B3BB6BA19A73A48F6AE8234C7053859701AED60844918141B033BB0A6`. No es attestación, VEX, análisis de alcanzabilidad ni pentest. |
| Demo EasyPanel | NO VERIFICADA | El bypass que publicaba el preview y el rewrite de `/` fueron retirados. Sin una aprobación separada y una política de demo pública, el contrato esperado en producción es holding en `/` y 404 para `/preview-local-sintetico`; no se activó ni disparó un despliegue desde esta comprobación. |

## Remediación local EasyPanel — 2026-08-28

| Control | Resultado observado | Evidencia y límite |
|---|---|---|
| Puerta completa del árbol modificado | PASS | `pnpm run release:verify`: lint, typecheck, **204/204** pruebas, build, i18n, scorecard, SBOM, dos validadores de artefacto y smoke standalone; exit code 0 tras integrar Sitges, el favicon transparente y la corrección tipográfica del 2026-08-30. |
| Artefacto worker | PASS | 154 archivos, 3.137.693 bytes, 0 violaciones; reporte local SHA-256 `7027A34B0A8AEB8C1E46C7F003823C99721C4DB0E116A83CD41B349518F9306A`. |
| Artefacto standalone Node | PASS | 2.412 archivos, 28.920.664 bytes, peers `react`, `react-dom`, `scheduler`, Vinext y su `prod-server` exigidos, 0 violaciones; reporte local SHA-256 `8BC48BF74063710BED32A614CA1C025756089953548EF92017C3785029F3A0A2`. |
| Entry point usado por Docker | PASS WITH LIMITS | `node dist/standalone/server.js` respondió en loopback: 41 rutas holding HTTP 200, headers defensivos, robots cerrado, sitemap vacío y 6 rutas negativas/legacy HTTP 404. No prueba kernel Linux, imagen o proxy. |
| Contrato Docker/contexto remoto | PASS WITH LIMITS | Pruebas estáticas exigen etiqueta Node de versión exacta, multi-stage, usuario no-root, healthcheck, puerto 3000, copia exclusiva del standalone y deny-all/allowlist del contexto. La base está fijada por digest inmutable; las pruebas todavía no construyen una imagen Docker Linux. |
| Build y ejecución de imagen Docker | NOT_TESTED | No hay `docker`, `podman` ni `nerdctl` disponibles en este equipo. Debe verificarse en EasyPanel u otro host Docker y registrarse digest, usuario, healthcheck y smoke. |
| Deploy EasyPanel y URL externa | NOT_TESTED | No se hizo push, deploy, cambio de rama, proxy/TLS ni smoke externo en esta etapa local. El SHA remoto observado en el error (`013307a...`) no contenía `Dockerfile`. |

## Resultado reproducible del árbol local

| Control | Resultado observado | Evidencia y límite |
|---|---|---|
| Lint checkpoint 87 histórico | PASS | `pnpm run lint`; exit code 0 en la captura ligada al commit `8231629f98e4cb2fff4264e9181286cd8dcda466`. |
| Typecheck checkpoint 87 histórico | PASS | `pnpm run typecheck`; exit code 0 en la misma captura histórica. |
| Suite completa checkpoint 98 histórica | PASS | `pnpm run release:verify`: **155/155** pruebas dentro de la captura durable original del 98. La remediación local actual amplía la suite a 167 pruebas. |
| Typecheck candidato 98 | PASS | `pnpm run typecheck`; comprobación local del árbol candidato. |
| Build candidato 98 | PASS | `pnpm run build`; comprobación local del árbol candidato. No prueba hosting ni despliegue. |
| Validador i18n | PASS | Catálogos, locales, rutas, placeholders y contratos deterministas ES/EN/FR/IT. No equivale a revisión humana o prueba de UI renderizada. |
| Puerta integrada durable anterior | PASS | `pnpm run validate`; 115/115, exit code 0. Log SHA-256 `B7FB69D762A222801671C6B99314FFFB70505FDE34543F5DC97522040E486EBE`. Pertenece al checkpoint 87. |
| `release:verify` checkpoint 95 histórico | PASS | Lint, typecheck, 144/144 pruebas, build, scorecard 95, inventario de lockfile, validador de `dist` y smoke del holding; log SHA-256 `38AE74BCC711FCC641B05984B6CAB432C6D0C32CEEBDE5EB638FEEF3ED544E69`. |
| SCA de producción | PASS WITH LIMITS | `pnpm audit --prod --audit-level=moderate`; exit code 0: `No known vulnerabilities found`. Log checkpoint 98 SHA-256 `AB49A74F6919CAFC65A62432459355A0791A7DE0D785F02313169AF4CE60EE07`. Es un resultado de advisory/dependencias, no alcanzabilidad ni pentest. |
| Codex Security integrado | FAILED / NOT_TESTED | La herramienta falló antes de crear `scanId` por un sourcemap anidado bajo `node_modules/.pnpm/.../read-input-source-map-file-browser.js.map`. No existe resultado integrado que pueda declararse PASS. |
| Revisión estática manual | PASS WITH LIMITS | En el alcance local revisado: 0 hallazgos críticos, altos o medios y 6 observaciones LOW condicionales. No sustituye SAST integrado, análisis de alcanzabilidad ni pentest. |
| Inventario de dependencias actual | PASS WITH LIMITS | CycloneDX estructurado y determinista derivado de `pnpm-lock.yaml`: 612 componentes, Vinext clasificado `required`, SHA-256 `183D88965F58E8502907D425C0A3BAF05414C2F69851F64E258C628CD76A1976`; no se validó contra el schema oficial y no es VEX, provenance, reachability ni attestación. |
| Validadores de artefacto actuales | PASS | Worker y standalone verifican inventario, requeridos, symlinks, rutas/nombres prohibidos, colisiones y presupuestos; hashes de reporte `97D50B...D9D05` y `531BB4...69E46`. No escanean contenido secreto, no firman y no prueban el despliegue. |
| Forced-colors | STATIC_CONTRACT_ONLY / NOT_TESTED | Existe un contrato estático sobre CSS con colores de sistema, foco y bordes. No se ejecutó un navegador en forced-colors ni tecnología asistiva. |
| Drift de tooling | ACCEPTED_WITH_LIMITS | `next` está en 16.2.11 y `eslint-config-next` en 16.2.6; lint pasa, pero la alineación exacta queda pendiente de una actualización de dependencias separada. |

Manifiesto reproducible del checkpoint 98: `evidence/98-local-technical-checkpoint/evidence-manifest.json`, SHA-256 `7EC3DB4BDF77E732E8B22D8EC6E1B5C3646CF27F406E21E5C75F64AE78A7A512`. Vincula el commit `73249861acb9874a310e9f112450d00a65a4b1e3`, Windows, Node `v24.16.0`, pnpm `11.19.0`, comandos y hashes. `release:verify` tiene log SHA-256 `D484CFBC41B35A07FE2642B6665B936639E41CC9793F9B8FEC7EA11B5FA2E9AC`; el audit productivo, `AB49A74F6919CAFC65A62432459355A0791A7DE0D785F02313169AF4CE60EE07`. Los checkpoints 87/95 se conservan como históricos separados.

## Evidencia multilingüe del candidato 98

| Alegación | Resultado | Límite expreso |
|---|---|---|
| Locales admitidos | PASS | Conjunto exacto `es`, `en`, `fr`, `it`; no se inventan regiones. |
| Rutas equivalentes prefijadas | PASS | `/{locale}` y familias de ciudad, perfiles, contacto y legal; las rutas sin prefijo son legacy y `noindex`. |
| Paridad determinista de catálogos | PASS | 0 hallazgos de catálogo; no prueba calidad lingüística en contexto. |
| Metadata internacional | PASS WITH LIMITS | Canonical/hreflang y metadata localizada quedan sometidos a los gates de release/indexación. |
| Contenido dinámico no localizado | FAIL-CLOSED | Perfiles dinámicos y cuerpos legales quedan cerrados fuera de ES; no se usa español como fallback silencioso. |
| Dictamen técnico multilingüe local | PASS WITH LIMITS | Catálogos y runtime standalone se recorrieron en Chromium para ES/EN/FR/IT a 320/390/768/1440 px; faltan despliegue, dispositivos físicos y tecnología asistiva. |
| Dictamen lingüístico | PENDIENTE DE REVISIÓN HUMANA | EN/FR/IT son borradores asistidos; no existe manifiesto de lingüistas/revisores competentes. |
| Publicación multilingüe | NO DETERMINABLE POR FALTA DE EVIDENCIA | No hay revisión humana, legal, staging ni despliegue verificable. |

## Navegador — runtime standalone multilingüe, evidencia actual 98

Playwright CLI inspeccionó el build standalone local en `127.0.0.1:4327` después de las correcciones:

- matriz raíz: 4 locales × 4 anchos (`320`, `390`, `768`, `1440`) = 16/16 observaciones PASS;
- 16/16 con HTTP 200, `html lang`, título, H1 holding, selector de cuatro idiomas, metadatos/header `noindex` y ausencia de overflow correctos;
- skip link: 4/4 recorridos con Tab + Enter enfocaron `main-content`;
- `/es|en|fr|it/legal/privacidad`: 4/4 HTTP 200 con holding localizado y selector equivalente;
- perfiles inexistentes: 4/4 HTTP 404 con copy y retorno al inicio localizados;
- `/de`, `/es-ES`, `/ES` y `/preview-local-sintetico`: 4/4 HTTP 404; el servidor respondió luego `/es` con HTTP 200;
- 0 `pageerror`, 0 errores inesperados de consola, 0 fallos de request, 0 requests externos y 0 respuestas HTTP inesperadas;
- los ocho mensajes de consola 404 fueron efectos esperados de navegar documentos deliberadamente inexistentes y están separados en la evidencia;
- el chunk cliente del 404 quedó reducido a 1.502 bytes y no contiene titulares del catálogo completo no publicado.

Evidencia versionada: `output/playwright/pv98-i18n/smoke-summary.json` y función reproducible `browser-smoke-function.js`.

| Vista | Archivo | SHA-256 |
|---|---|---|
| Holding ES móvil 320 px | `output/playwright/pv98-i18n/holding-es-320.png` | `BA7BC9F7931B9BB9CBE4E9BFBE08F8D2449D29BB408C8B93E319B2D30DE58645` |
| Holding ES escritorio 1440 px | `output/playwright/pv98-i18n/holding-es-1440.png` | `F3C2E3FE111DDA4138AE038B3B8452E354F94BAFB2DAA966F7295E4134399664` |
| 404 IT móvil 390 px | `output/playwright/pv98-i18n/not-found-it-390.png` | `54BD3893FDC96A12B417748814AE652D45AF448C0DCE6F1C5F550A20D1AFD69C` |
| Legal IT holding 1440 px | `output/playwright/pv98-i18n/legal-it-1440.png` | `F816878A842C7D5D9E5DF9AB31A4430684983432FECCCB27F5847B50A20C1442` |

La ejecución es local, no sustituye revisión lingüística humana, tecnología asistiva, UAT ni smoke desplegado. No existe hoy un slug público real para probar la ruta positiva de perfil.

## Matriz atómica de alegaciones

| Alegación | Fuente | Resultado | Límite expreso |
|---|---|---|---|
| El sitio público local permanece cerrado | Build servido en modo producción en `127.0.0.1:4320` | PASS | Solo loopback; no demuestra despliegue ni red pública. |
| Las rutas públicas permitidas responden y las sensibles permanecen cerradas | Smoke HTTP sobre rutas públicas, legal y preview | PASS WITH LIMITS | Estado local observado; debe repetirse sobre cada artefacto candidato y despliegue autorizado. |
| La raíz entrega headers defensivos y no expone `X-Powered-By` | Respuesta HTTP del holding | PASS | No prueba comportamiento de CDN, proxy ni hosting futuros. |
| El preview sintético representa cuatro perfiles, vacío y error seguro | Snapshot, conteos y capturas Playwright en desarrollo | PASS | Usa fixtures sintéticos; no prueba CMS, perfiles ni contacto reales. |
| No hay desbordamiento horizontal en los viewports observados | Medición de viewport en holding multilingüe y preview | PASS WITH LIMITS | Incluye 320/390/768/1440 px en ES/EN/FR/IT; no equivale a zoom real 200/400 %, dispositivo físico ni aceptación visual. |
| El salto al contenido funciona con teclado | Tab + Enter y foco observado en `main-content` | PASS WITH LIMITS | No se recorrió con teclado toda una experiencia pública real. |
| Las sesiones observadas no contactaron orígenes externos | Inventario de 7 requests en holding y 120 requests de desarrollo en preview, todos locales | PASS WITH LIMITS | No se conservó HAR y el preview incluye recursos del servidor de desarrollo. |
| El diseño implementado reproduce una referencia aprobada | `design-qa.md` | BLOCKED | Existen tres mockups materialmente distintos y no hay selección controladora aprobada. |
| Existe conformidad WCAG completa | No existe auditoría criterio por criterio ni lector de pantalla | NOT_TESTED | No debe afirmarse. |
| Existe aceptación del cliente o cumplimiento contractual | No existe acta de aceptación | NOT_TESTED | Las pruebas técnicas no sustituyen aceptación. |
| Las imágenes locales se normalizan de forma acotada | Store y tests sintéticos JPEG/PNG → variantes WebP | PASS WITH LIMITS | Sin antivirus, moderación, CDN, datos ni derechos reales. |
| El MP4 local es reproducible en navegador | Solo contrato `bounded-mp4-container-v1` y fixture estructural | NOT_TESTED | Se validan contenedor/límites y rechazo de fragmentación; no codec, decodificación, playback, Range ni transcodificación. |
| Operaciones locales concurrentes quedan coordinadas | Lock cooperativo y pruebas multiproceso de contención | PASS WITH LIMITS | No es distribuido, no protege contra escritores no cooperativos y los locks huérfanos permanecen para fallar cerrado. |

## Navegador — holding de producción local, evidencia histórica 95

Playwright inspeccionó el build local en modo producción, servido en el puerto 4320:

- `/`, `/madrid`, `/barcelona`, `/perfiles` y `/contacto`: HTTP 200.
- `/legal/privacidad`: HTTP 404 mientras el gate público/legal permanece cerrado.
- `/preview-local-sintetico`: HTTP 404 en producción, como exige el aislamiento del harness.
- `robots.txt`: HTTP 200 y `Disallow: /`.
- `sitemap.xml`: HTTP 200 y sin elementos `<url>`.
- La raíz presentó CSP, COOP, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `X-Robots-Tag`; `X-Powered-By` estuvo ausente.
- Consola: 0 errores y 0 advertencias.
- Red observada: 7 solicitudes locales, todas HTTP 200.
- Navegación local aproximada: `DOMContentLoaded` 176 ms y `load` 294 ms. Estas cifras no son Core Web Vitals ni un benchmark de producción.
- No se observó overflow horizontal a 1280 ni 320 px.
- El primer Tab enfocó “Saltar al contenido principal”; Enter movió el foco a `main-content`.

Capturas locales de esta ejecución:

| Vista | Archivo | SHA-256 |
|---|---|---|
| Holding móvil 320 px | `output/playwright/pv95/production-holding-320.png` | `b9ced8c898b1c11b56ad38baa00fc718dde8319f047391d41fcc18e5c79384b3` |
| Holding escritorio 1920 px | `output/playwright/pv95/production-holding-1920.png` | `a849f8f15ba9630ef59d81c7bd3feafcf99e85f0269c04cef6e988ee462c71dd` |

Estas copias se conservaron como evidencia versionable bajo `output/playwright/pv95/`. La prueba negativa del preview y la ausencia de indexación no abren ninguna puerta de publicación.

## Navegador — preview sintético aislado, evidencia histórica 95

El harness se ejecutó únicamente en desarrollo local, servido en `localhost:4330`:

- cuatro perfiles sintéticos y estados vacío/error seguro;
- cuatro tarjetas visibles;
- consola: 0 errores y 0 advertencias; solo información de React DevTools;
- 120 solicitudes observadas, todas a recursos locales de desarrollo;
- no existen formularios, botones ni inputs; el único enlace interactivo observado fue el skip link;
- no se observó overflow horizontal a 1920 ni 320 px;
- altura total móvil observada: 3962 px;
- Tab + Enter sobre el skip link movió el foco a `main-content`.

Capturas locales de esta ejecución:

| Vista | Archivo | SHA-256 |
|---|---|---|
| Preview escritorio | `output/playwright/pv95/synthetic-preview-1920.png` | `7e8336c5019aff124b6cfe91c8011362c396848de6b7064bb381db37902889df` |
| Preview móvil completo | `output/playwright/pv95/synthetic-preview-320-full.png` | `7d0449a4e320c77c951aef7d38e2bb4d8d79e17fca4e650b4b0516d80d890818` |

El resultado visual es legible y no desborda en los anchos observados. La fidelidad permanece **BLOCKED** porque los tres mockups aportados difieren materialmente y ninguno fue designado como referencia controladora.

## Publicación candidata, CMS y recuperación local

- El exportador de candidato local opera fail-closed, genera JSON canónico, inventario y SHA-256, fija `productionActivation:false` y excluye IDs, evidencia, auditoría y referencias internas.
- La restauración fue corregida para recuperar `profiles.json` y `media/` directamente en la raíz de datos activa, manteniendo `cms/state.json` dentro del payload de backup.
- Persistencia, medios, workbench, roles y backup/restore siguen siendo componentes locales para desarrollo/pruebas; no acreditan identidad externa, cifrado en reposo, multiusuario real, storage gestionado ni recuperación productiva.
- La persistencia, el store de medios y los snapshots de backup/export usan un lock de archivo local por creación exclusiva. Coordina procesos cooperativos sobre el mismo filesystem; no es un lock distribuido y no elimina automáticamente locks obsoletos.
- Las imágenes admitidas se decodifican bajo límites y producen variantes WebP; MP4 permanece limitado a verificación estructural acotada y no se declara reproducible.
- El empaquetador ZIP pasó una reproducción histórica del checkpoint 95 sobre árbol limpio. El ZIP 98 se genera como handoff externo después del commit documental que incorpora esta captura durable; su ruta y SHA-256 no se autorreferencian dentro del repositorio.

## Cobertura y criterios pendientes

| Área | Estado | Límite restante |
|---|---|---|
| Gate público fail-closed | PASS WITH LIMITS | Probado localmente; falta repetir sobre artefacto desplegado autorizado. |
| Preview sintético | PASS WITH LIMITS | Aislado y útil para estados; no representa contenido, contacto ni CMS reales. |
| Reflow | PASS WITH LIMITS | ES/EN/FR/IT sin scroll horizontal a 320/390/768/1440 px; no hubo zoom real 200/400 % ni dispositivo físico. |
| Accesibilidad semántica | PARTIAL | Contratos, skip link y contrato CSS de forced-colors; faltan NVDA/JAWS/VoiceOver, navegación completa, ejecución real de forced-colors y revisión criterio por criterio. |
| Fidelidad visual | BLOCKED | Tres referencias incompatibles sin selección aprobada. |
| Red local observada | PASS WITH LIMITS | Requests locales y consola limpia; no se conservó HAR ni se probó una red pública. |
| Rendimiento/CWV | NOT_TESTED | Los tiempos loopback no son CWV; falta release público congelado y runtime desplegado. |
| SCA | PARTIAL | Advisory de producción limpio al momento del control e inventario estructurado del lockfile; faltan schema oficial, alcanzabilidad, VEX, provenance y retest del release final. |
| SAST integrado | NOT_TESTED | La herramienta falló antes de crear un scan; revisión manual limitada disponible. |
| Seguridad productiva/pentest | NOT_TESTED | Sin infraestructura autorizada ni prueba externa. |
| ZIP checkpoint 95 | PASS WITH LIMITS | Integridad, exclusiones y reproducción limpia verificadas históricamente; el paquete es confidencial y no autoriza publicación. |
| ZIP candidato 98 | PENDING | Se generará y reproducirá después del commit limpio y la captura durable propios del 98. |
| UAT, despliegue e indexación | NOT_TESTED | No autorizados y con decisiones externas pendientes. |

## Conclusión

El checkpoint conserva 98/100 técnico local y la remediación actual amplía la puerta a 167 pruebas, artefactos worker/standalone endurecidos y navegador multilingüe local en PASS. El ZIP se valida como paso externo de handoff. La auditoría de catálogos tiene 0 hallazgos y el DOM/overflow principal fue observado, pero esto no acredita revisión lingüística humana, conformidad WCAG, aprobación legal, staging, infraestructura, UAT ni despliegue. La verificación estricta sigue en **2/20** y el estado público/legal continúa **`NO-GO`**.
