# Informe de auditoría web UE/España — A-PECADOSVIP-20260827

## Resumen ejecutivo

- Activo y propietario: repositorio `pecadosvip-web-delivery`; Luis Araujo es la autoridad de aceptación del producto, pero el prestador legal no está identificado.
- Snapshot y entorno: candidato técnico local 98 en el working tree, aún sin commit/manifiesto durable propio. El último checkpoint completo capturado sigue siendo el 95 en `15d56f0e5812a06e03dea781487f7553ce010a5c`, manifiesto SHA-256 `d7f26a8e27ea4789f39cec2855fe376df3daa0b86e138f2e4156a10d35d9bd95`. No existe URL desplegada, tag de release ni aceptación final.
- Fecha de auditoría y observación: 2026-08-27. El candidato actual pasó `pnpm run i18n:validate` con `PASS_WITH_LIMITS` y la suite focalizada i18n con 10/10; la captura durable 95 conserva `release:verify` con 144/144 pruebas, build y subgates verdes. El comprobador offline de frescura se repitió con 52 entradas `FRESH` y 4 `PENDING_VERIFICATION`; no hubo nueva investigación web ni reinterpretación jurídica.
- Objetivo y autorización: medir y mejorar la alineación técnica con controles candidatos de UE/España mediante revisión pasiva y cambios locales reversibles. No se autorizó desplegar, indexar, publicar perfiles, activar contacto ni probar terceros.
- Conclusión limitada: evaluación técnica de controles y riesgos; no es certificación, declaración de conformidad ni dictamen jurídico.
- Decisión de release: **NO-GO**. El incremento local puede continuar, pero publicación, indexación, perfiles reales, formularios y claims comerciales permanecen cerrados.
- Estado técnico por defecto: el último build durable 95 mostró únicamente una pantalla neutral en las rutas probadas mientras el gate agregado estaba bloqueado. El candidato 98 conserva contratos fail-closed para publicación e idiomas, pero todavía requiere `release:verify` y captura sobre commit limpio; una validación de catálogos no prueba el build ni un despliegue.
- Avance de ejecución técnica local: scorecard actual **98/100 (`LOCAL_TARGET_EARNED`)**: 15/15 inventario, 9/10 arquitectura, 45/45 implementación, 24/25 QA y 5/5 handoff. Los tres puntos nuevos cubren solo contrato de rutas/idioma `es`/`en`/`fr`/`it`, paridad determinista de catálogos con veredictos conservadores y SEO internacional fail-closed; aún no están vinculados a un manifiesto 98. Es un proxy de trabajo técnico, no una tasa de controles ni aceptación: solo **2/20 requisitos (10 %)** están `VERIFIED`; 12 están `PARTIAL`, 5 `BLOCKED` y 1 `AT_RISK`. Tampoco es una puntuación de cumplimiento jurídico, aprobación lingüística ni readiness de producción.

Riesgos principales:

1. La actividad contractual y su publicidad no están definidas. Los insumos usan terminología `escort`, pero no prueban la naturaleza jurídica del servicio; se requiere revisión escrita de un abogado en España antes de publicar.
2. No se conocen identidad del prestador, responsable/encargados, bases, retención, derechos, proveedores ni textos de transparencia.
3. No se sabe si el contacto concluye un contrato B2C a distancia ni qué información, cancelación o desistimiento resultan aplicables.
4. La accesibilidad mejoró en semántica, foco, etiquetas, contraste base, reducción de movimiento, tamaños de objetivo y reflow sintético, pero no se completó una auditoría WCAG 2.2 A/AA por criterios ni prueba con lector de pantalla.
5. El contenido, inferencias, escala y proveedores del tratamiento adulto no están congelados; no puede concluirse todavía si existe tratamiento del art. 9 RGPD ni si el art. 35 exige EIPD.
6. El targeting Madrid/Barcelona-Cataluña está observado, pero no se resolvieron establecimiento, lugar de prestación ni inventario dirigido BOE/BOCM/DOGC o municipal.
7. El audit durable de dependencias de producción sobre Next 16.2.11 no encontró vulnerabilidades conocidas, pero SCA permanece `PARTIAL` y el escaneo integrado de alcanzabilidad sigue `FAILED`. El inventario CycloneDX candidato deriva del lockfile y no fue validado contra el schema oficial; no es VEX, provenance ni reachability. De seis observaciones LOW condicionales, dos quedan mitigadas en el alcance local y cuatro parcialmente mitigadas; no hubo pentest ni prueba desplegada.
8. La arquitectura incorpora `es`, `en`, `fr` e `it`, pero la auditoría complementaria es solo de repositorio/catálogos y conserva exactamente: técnico multilingüe `NO DETERMINABLE`, publicación lingüística `PENDIENTE DE REVISIÓN HUMANA` y publicación `NO DETERMINABLE POR FALTA DE EVIDENCIA`. No existe aprobación humana identificada ni prueba de DOM, overflow, navegación, tecnología de apoyo, staging o destino desplegado para los cuatro idiomas.

## Alcance, muestra y cobertura

| Universo | Muestra | Controles ejecutados | NOT_TESTED | NOT_APPLICABLE snapshot | NOT_SELECTED | Incertidumbre |
|---:|---:|---:|---:|---:|---:|---|
| 46 | 20 | 15 | 5 | 16 | 10 | Alta para operador, actividad, formación contractual, tamaño empresarial, región, tecnologías desplegadas y cobertura de asistencia técnica. |

El ledger reproducible está en `coverage-ledger.json`: contiene los 46 IDs únicos del catálogo 2026.08.26, cada uno en una sola clase. La muestra es 15 `EXECUTED` + 5 `NOT_TESTED`; los 16 `NOT_APPLICABLE_CURRENT_SNAPSHOT` tienen trigger de reapertura y los 10 `NOT_SELECTED` no reciben conclusión. `SEC-SCA-REACHABILITY-001` pasó de `NOT_TESTED` a `PARTIAL` por el audit de producción completado; el escáner integrado fallido conserva su propio estado `FAILED/NOT_TESTED`. La auditoría multilingüe complementaria no añade controles ni altera este denominador jurídico/técnico.

Perfiles probados: revisión estática de escritorio/móvil, visitante anónimo, integración local del CMS y smoke de teclado sobre preview exclusivamente sintético en el checkpoint durable 95; comparación de catálogos/rutas `es`, `en`, `fr` e `it` en el candidato 98. El smoke histórico usó Chromium local en 360, 390, 768, 1024, 1440 y 1920 CSS px, más reflow a 320 CSS px equivalente a 400 % sobre una base de 1280 CSS px. No se repitió como matriz renderizada por idioma y no se probó lector de pantalla, datos reales, staging ni runtime desplegado.

### Evaluación multilingüe complementaria

| Eje separado | Estado | Evidencia positiva | Lo que no permite concluir |
|---|---|---|---|
| Aplicabilidad del requisito de producto | `APPLICABLE` | El usuario exige disponibilidad exacta en `es`, `en`, `fr` e `it`. | No activa por sí solo una ley regional/lingüística; ese nexo sigue `UNCERTAIN`. |
| Resultado técnico multilingüe | `NO DETERMINABLE` | 0 findings de catálogo, 0 incidencias del validador local y 10 plantillas de ruta. | La auditoría fuente se limita a repositorio/catálogos; DOM, navegación, overflow, AT, staging y destino desplegado son `NOT_TESTED`. |
| Revisión lingüística | `PENDIENTE DE REVISIÓN HUMANA` / `REQUIRES_HUMAN_REVIEW` | Catálogos asistidos con paridad estructural. | No existe lingüista identificado, manifiesto de revisión ni aprobación de significado, tono o adecuación cultural. |
| Revisión jurídica del copy | `REQUIRES_LEGAL_COUNSEL` | Los bloqueos legales existentes se conservan en todas las variantes. | No hay aprobación de equivalencia jurídica/comercial de los textos por idioma. |
| Decisión de publicación | `NO DETERMINABLE POR FALTA DE EVIDENCIA`; release global `NO-GO` | Gate técnico permanece cerrado. | No autoriza indexación, publicación, perfiles, contacto ni claims en ningún idioma. |

## Delta del retest

| Área | Evidencia anterior | Evidencia actual | Resultado / riesgo residual |
|---|---|---|---|
| Accesibilidad | Smoke de teclado y responsive del borrador | Contratos estáticos, seis viewports regenerados, reflow a 320 CSS px, foco del skip link, consola/orígenes y contrato CSS de forced-colors | Mejora material; `PARTIAL`. Forced-colors real sigue `NOT_TESTED`; faltan auditoría por criterios y lector de pantalla. |
| Privacidad desde diseño | Gates y proyección pública fail-closed | Persistencia versionada, revisiones optimistas, prevención de replay, auditoría sin contenido, roles/origen locales y backup/restore con integridad | Mejora material; `PARTIAL`. El mecanismo local no es backend ni seguridad de producción y no resuelve bases, retención o derechos. |
| Imagen/media | Referencias de derechos en el modelo | Imágenes sintéticas decodificadas bajo límites y normalizadas a variantes WebP; MP4 limitado a `bounded-mp4-container-v1`; hashes, proyecciones y archivo recuperable | Mejora material; `PARTIAL`. MP4 no prueba codec/playback/Range/transcoding; no existe paquete real, antivirus ni revisión jurídica por activo. |
| Calidad local | 65 pruebas en el checkpoint anterior | Captura durable de `release:verify` con lint, tipos, 144/144 pruebas, build, scorecard, inventario, artifact validator y smoke exacto | Mejora material local; no prueba operación, despliegue ni rendimiento de campo. |
| Dependencias y hardening | 14 advisories iniciales (7 HIGH/7 MODERATE) en el grafo previo; escáner integrado fallido | Next 16.2.11, overrides y audit durable sin vulnerabilidades conocidas; inventario CycloneDX estructurado del lockfile y artifact validator candidatos; revisión pasiva 0 CRITICAL/HIGH/MEDIUM, 2 LOW mitigadas localmente y 4 parciales | `PARTIAL`: sin schema CycloneDX oficial, alcanzabilidad, VEX, provenance, pentest ni runtime desplegado; el scanner integrado sigue `FAILED`. |
| Internacionalización/localización | Documento, rutas y superficies en español | Contrato exacto de locales base `es`/`en`/`fr`/`it`, plantillas de ruta equivalentes, selector por endónimo, validación determinista de catálogos y metadatos internacionales detrás del gate | Mejora local `PARTIAL`; la auditoría de catálogos es `NO DETERMINABLE` para el estado técnico del sitio, queda `PENDIENTE DE REVISIÓN HUMANA` lingüística y no prueba DOM/staging/despliegue. |
| Legal/publicación | `NO-GO` | Sin cambio de hechos jurídicos ni runtime público | `NO-GO` se mantiene: no publicar perfiles, contacto, claims, indexación ni datos reales. |

## Matriz de aplicabilidad

| Instrumento | Estado | Fundamento observado | Pregunta abierta |
|---|---|---|---|
| RGPD 2016/679 + LO 3/2018 | `APPLICABLE` al tratamiento planificado; art. 9/EIPD art. 35 `UNCERTAIN` | El modelo contempla datos personales, medios, disponibilidad, evidencias y contacto. La persistencia, auditoría, replay protection y backup locales son controles parciales para datos sintéticos; no definen roles, bases, retención, derechos ni seguridad de producción. El contexto adulto por sí solo no permite concluir categorías especiales ni EIPD obligatoria. | ¿Quién trata qué dato, qué inferencias permite el diseño, con qué base, retención, destinatarios y qué arroja el screening de arts. 9 y 35? |
| LOPDGDD art. 7 / política de edad | `UNCERTAIN` / asesoría requerida | La validación excluye perfiles menores de 18, pero no existe política final de visitante ni age assurance. El art. 7 no se presenta como gate 18+ universal. | ¿Qué control proporcional exige el servicio finalmente clasificado y qué datos recogería? |
| LO 1/1982 + RGPD para imagen | `APPLICABLE` a la publicación planificada | El almacén local exige hash, alt y referencia opaca de derechos, audita mutaciones y adjunta activos con `rightsConfirmed=false`; no hay activos reales ni paquete jurídico que validar. | ¿Qué identidad, consentimiento/licencia, alcance, duración, retirada y takedown existen por persona y activo? |
| LSSI 34/2002 | `UNCERTAIN` | El sitio parece dirigido a España, pero faltan prestador, establecimiento, modelo contractual e inventario tecnológico desplegado. | ¿Qué identidad debe publicarse y qué tecnologías no esenciales se instalan? |
| TRLGDCU 1/2007 | `UNCERTAIN` | No hay checkout ni pago web, pero el contrato podría formarse mediante mensajería o teléfono. | ¿Cuándo se forma el contrato, qué se ofrece, quién cobra y qué régimen de cancelación aplica? |
| Ley 11/2023 + RD 193/2023 | `UNCERTAIN` | El alcance depende del servicio cubierto, tamaño/excepción, categoría y calendario. | ¿Es un servicio cubierto y es el operador una microempresa? |
| WCAG 2.2 AA | `APPLICABLE` como baseline voluntario | El proyecto lo adopta como criterio de calidad, sin presentarlo como ley universal; el retest cubrió contratos estáticos, teclado, seis viewports y reflow sintético a 320 CSS px, sin demostrar conformidad completa. | ¿Qué muestra y tecnologías de apoyo integrarán la aceptación? |
| Ley 34/1988 General de Publicidad | `UNCERTAIN` / asesoría requerida | Las páginas y el SEO promoverían contratación; las notas usan `escort`, pero no permiten clasificar por sí solas la actividad. | ¿Puede asesoría española aprobar la actividad exacta, imágenes, copy, SEO y contacto? |
| DSA 2022/2065 | `UNCERTAIN` | El código no implementa marketplace, intermediación ni UGC, pero no se confirmó si los perfiles son contenido propio o terceros independientes. | ¿Qué rol jurídico y contractual tiene cada perfil? |
| Alcance regional Madrid/Cataluña | `UNCERTAIN` / `PENDING_VERIFICATION` | El targeting está observado. La disponibilidad técnica en `es`, `en`, `fr` e `it` no prueba por sí sola aplicabilidad de una norma territorial o lingüística; faltan prestador, establecimiento, destinatarios, lugar de prestación y actividad clasificada. | ¿Qué búsqueda dirigida en BOE, BOCM, DOGC y, si procede, fuentes municipales corresponde a los hechos finales? |
| NIS2, DORA, CRA y AI Act | `NOT_APPLICABLE` al snapshot observado | No se observó entidad regulada, producto digital comercializado ni sistema de IA operativo. | Reabrir cuando aparezca un rol, producto o componente no visible hoy. |

La justificación completa, supuestos y fuentes está en `applicability-matrix.md`; la salida determinista del resolver está en `resolver-output.json`.

## Selección material no exhaustiva de autoridades, normas y estándares

| Clase | Instrumento/versión | Efecto usado en esta auditoría | URL oficial | Verificado |
|---|---|---|---|---|
| `BINDING_LAW` | RGPD consolidado, arts. 2–9, 12–25, 32 y 35 + LO 3/2018, arts. 6–11 | Deberes de protección de datos dentro de su alcance; art. 9 y EIPD art. 35 quedan como preguntas, no conclusiones. | [EUR-Lex](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:02016R0679-20160504) / [BOE](https://www.boe.es/eli/es/lo/2018/12/05/3/con) | 2026-08-26/27 |
| `BINDING_LAW` | Ley 34/2002 LSSI | Identidad, comunicaciones, contratación y tecnologías terminales dentro del alcance aplicable. | [BOE](https://www.boe.es/eli/es/l/2002/07/11/34/con) | 2026-08-27 |
| `BINDING_LAW` | RDL 1/2007 TRLGDCU | Información y contratación con consumidores solo si los hechos activan su ámbito. | [BOE](https://www.boe.es/eli/es/rdlg/2007/11/16/1/con) | 2026-08-27 |
| `BINDING_LAW` | Ley 34/1988 General de Publicidad, arts. 2–3 | Riesgo de publicidad; la auditoría no resuelve la clasificación de la actividad. | [BOE](https://www.boe.es/buscar/act.php?id=BOE-A-1988-26156) | 2026-08-27 |
| `BINDING_LAW` | Ley 11/2023, título I + RD 193/2023, arts. 14–15 y disposición final sexta | Posibles deberes privados de accesibilidad, sujetos a servicio, empresa, excepciones y calendario. | [BOE Ley 11/2023](https://www.boe.es/eli/es/l/2023/05/08/11/con) / [BOE RD 193/2023](https://www.boe.es/eli/es/rd/2023/03/21/193/con) | 2026-08-26/27 |
| `BINDING_LAW` | LO 1/1982, arts. 2, 7 y 8 | Protección civil del honor, intimidad y propia imagen dentro de su alcance; no prueba por sí sola la suficiencia de un consentimiento futuro. | [BOE](https://www.boe.es/eli/es/lo/1982/05/05/1/con) | 2026-08-27 |
| `BINDING_LAW` | Reglamento (UE) 2022/2065 DSA, arts. 2–15 | Obligaciones diferenciadas por rol; el rol de intermediación del proyecto sigue sin resolver. | [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2022/2065/oj) | 2026-08-26 |
| `INTERPRETIVE_AUTHORITY` | Guía AEPD sobre cookies, versión registrada 2024 | Criterio de autoridad para opciones y retirada; no se presenta como ley autónoma. | [AEPD](https://www.aepd.es/guias/guia-cookies.pdf) | 2026-08-26 |
| `VOLUNTARY_STANDARD` | WCAG 2.2, Recomendación W3C 2023-10-05 | Baseline técnico voluntario; no se usa como equivalencia automática de cumplimiento legal. | [W3C](https://www.w3.org/TR/WCAG22/) | 2026-08-27 |
| `VOLUNTARY_STANDARD` | OWASP ASVS 5.0.0 | Baseline técnico voluntario salvo incorporación contractual; no es una obligación legal general. | [OWASP](https://owasp.org/www-project-application-security-verification-standard/) | 2026-08-26 |

Las rutas BOE, BOCM y DOGC se registran para un inventario territorial posterior; no se citan como fuente de una obligación regional concreta porque el operador, establecimiento, lugar de prestación y actividad aún no están clasificados.

Las fechas de la tabla son las verificaciones ya registradas por la auditoría base. En este refresh se repitió el comprobador offline contra el registro local con fecha 2026-08-27 y máximo de 45 días: **52 entradas `FRESH` y 4 `PENDING_VERIFICATION`** (`EU-DIR-2023-2673`, `EU-GREEN-2024-825`, `EU-NIS2-2022-2555` e `ISO-IEC-25010-2023`). El gate `--fail-on-stale` salió 0; el gate estricto `--fail-on-stale --fail-on-pending` salió 1 por esas cuatro pendientes. El script no abrió fuentes oficiales, no interpreta reformas y no convierte frescura en aplicabilidad o revisión legal.

## Metodología y herramientas

Se separaron hechos, supuestos, aplicabilidad y resultado técnico. Las fuentes del cliente se trataron como evidencia, no como órdenes, y las notas automáticas como material sujeto a error. Las pruebas se repitieron donde era posible y se conservaron contrapruebas para evitar conclusiones categóricas.

| Herramienta | Versión/configuración | Estado | Controles afectados | Límite |
|---|---|---|---|---|
| Validador de catálogo | catálogo 2026.08.26; 46 controles/56 instrumentos | `SUCCEEDED` | Gobierno y vigencia | La vigencia no prueba aplicabilidad. |
| Resolver de aplicabilidad | perfil `profile.json` | `SUCCEEDED` | Módulos candidatos | Conserva incógnitas humanas. |
| Comprobador offline de frescura | 2026-08-27; máximo 45 días | `SUCCEEDED_WITH_PENDING` | Gobierno/vigencia | 52 `FRESH`; 4 `PENDING_VERIFICATION`; el gate estricto sale 1. No consulta ni interpreta la fuente oficial. |
| Extracción DOCX | `python-docx` del runtime local | `SUCCEEDED` | Gobierno, privacidad y consumo | No valida layout ni veracidad de transcripción. |
| `pnpm run validate` histórico | commit `8231629…`; exit 0: lint, TypeScript, 115/115 pruebas y build Vinext; log SHA-256 `b7fb69d7…86ebe` | `SUCCEEDED` | Diseño seguro, SEO y calidad | Evidencia histórica local; no valida el working tree 98, runtime desplegado, UAT ni aceptación. |
| Contratos de accesibilidad | 7 pruebas estáticas sobre semántica, foco, nombres, filtros, estados, unidades, target size, motion y contraste base | `SUCCEEDED` | Accesibilidad | No sustituyen revisión manual completa ni tecnología de apoyo. |
| Playwright CLI del preview sintético | Chromium local, seis viewports + 320 CSS px, teclado, consola y orígenes de recursos | `SUCCEEDED` | Accesibilidad y calidad del UI subyacente | Preview solo sintético y loopback; sin lector de pantalla, contraste completo ni fidelidad visual aprobada. |
| Integración CMS/local | Persistencia, roles, idempotencia, auditoría, media, archivo/restore y backup/restore | `SUCCEEDED` | Privacidad desde diseño y calidad | Mecanismo local dev/test; archivos sin cifrado, bloqueo de un proceso y sin arquitectura de producción. |
| Smoke de producción fail-closed histórico | build durable 95, seis rutas y flags adversariales | `SUCCEEDED` | Publicidad, contacto, SEO y consumo | No cubre la matriz de rutas `es`/`en`/`fr`/`it`; solo prueba el estado bloqueado local anterior, no un despliegue. |
| Reconciliación de cobertura | catálogo 2026.08.26 + ledger v1; 15 `EXECUTED` + 5 `NOT_TESTED` | `SUCCEEDED` | Gobierno/cobertura | Prueba unicidad, set y aritmética; no transforma un control parcial en conformidad. |
| Audit de dependencias de producción | commit `8231629…`; `pnpm audit --prod --audit-level=moderate`; secuencia 14 → 5 → 0 tras Next 16.2.11 y overrides; log SHA-256 `75d58b4a…5acf4` | `SUCCEEDED` | Supply chain | Log durable con exit 0 y “No known vulnerabilities found” en ese momento; no equivale a alcanzabilidad, VEX, provenance, SBOM ni pentest. |
| Revisión manual pasiva | Traversal/symlinks, payloads, proyección interna, origen/CSRF, límites, secretos, XSS/HTML y publicación fail-closed | `SUCCEEDED` | Diseño seguro y calidad | 0 CRITICAL/HIGH/MEDIUM; baseline de 6 LOW: 2 mitigadas en el alcance local y 4 parcialmente mitigadas. Sin exploit, fuzz, carreras ni prueba desplegada. |
| Inventario cookies/storage desplegado | sin runtime | `NOT_RUN` | Cookies/LSSI | Faltan hosting y proveedores. |
| Codex Security integrado / alcanzabilidad | intento único | `FAILED` | Supply chain | Falló al leer un sourcemap anidado; sin `scanId` ni conclusión. No se marca ejecutado ni se sustituyó por el audit de paquetes. |
| `release:verify` durable 95 | commit `15d56f0…`; lint, tipos, 144/144 pruebas, build, scorecard 95, inventario, artifact validator y smoke | `SUCCEEDED` | Calidad y handoff | Última captura completa; no valida los archivos nuevos del working tree 98 ni equivale a despliegue, UAT o aceptación. |
| Validador y contratos locales i18n | `scripts/validate-locales.ts`; `pnpm run i18n:validate`; suite focalizada | `SUCCEEDED_WITH_LIMITS` | Calidad y SEO | Exit 0, 10/10 pruebas: locales exactos `es`/`en`/`fr`/`it`, 0 incidencias de catálogo, 10 plantillas y cierre de contenido dinámico no traducido; mantiene revisión humana pendiente y publicación no determinable. No prueba DOM/staging/despliegue. |
| `auditar-web-multilingue` | `compare_locales.py` 1.0.0; modo repositorio/catálogos | `SUCCEEDED_WITH_LIMITS` | Calidad multilingüe complementaria | 0 hallazgos del paquete, pero veredictos exactos: técnico `NO DETERMINABLE`, lingüístico `PENDIENTE DE REVISIÓN HUMANA`, publicación `NO DETERMINABLE POR FALTA DE EVIDENCIA`. |
| Inventario CycloneDX local | grafo determinista derivado de `pnpm-lock.yaml` | `SUCCEEDED_WITH_LIMITS` | Supply chain | Inventario estructurado; no validación oficial de schema, VEX, provenance, reachability ni attestación. |
| Validador de artefacto `dist` | hashes, requeridos, symlinks, rutas prohibidas, colisiones y presupuestos | `SUCCEEDED` | Packaging/calidad | No es escáner de contenido secreto, firma, pentest ni validación desplegada. |

## Revisión pasiva de seguridad

Este recuento pertenece exclusivamente a la revisión estática manual del código local; no modifica las severidades jurídicas o de release del resto del informe. No se observaron hallazgos `CRITICAL`, `HIGH` ni `MEDIUM`. El retest conserva las seis observaciones `LOW` como IDs de seguimiento: dos están mitigadas en el alcance local y cuatro parcialmente mitigadas, siempre con las limitaciones de una revisión pasiva.

| ID | Estado de retest | Evidencia actual y residual | Rutas principales |
|---|---|---|---|
| `MSR-L01` | `MITIGATED_IN_LOCAL_SCOPE` | Repositorio, media y snapshots de backup/export usan creación exclusiva de locks locales y pruebas multiproceso demuestran contención fail-closed. Es cooperativo, no distribuido; un lock huérfano no se borra automáticamente y exige intervención operativa segura. | `lib/operations/local-file-lock.ts`; `lib/content/persistent-repository.ts`; `lib/media/local-media-store.ts`; `lib/operations/local-backup.ts`; `tests/local-file-lock.test.ts` |
| `MSR-L02` | `PARTIALLY_MITIGATED` | Se rechazan symlinks en ancestros, se revalidan lecturas y el candidato compara identidad del handle. Backup, persistencia y media aún no son operaciones no-follow/handle-relative completas frente a un filesystem local hostil. | `lib/operations/local-backup.ts:161-215,280-303`; `lib/publication/local-publication-candidate.ts:239-251,277-352`; stores locales |
| `MSR-L03` | `PARTIALLY_MITIGATED` | El workbench proyecta respuestas de editor sin referencias de verificación/derechos ni hash/storage/audit. El repositorio interno conserva registros completos y admin los recibe por diseño; todo adaptador futuro debe aplicar la proyección. | `lib/workbench/local-cms-workbench.ts:554-578,829-857,875-1212` |
| `MSR-L04` | `PARTIALLY_MITIGATED` | Release y candidato comparten `isSafePublicMediaUrl`, y el exportador rechaza prefijos locales. El gate general aún admite rutas relativas que solo el candidato clasifica como local-only; la defensa depende de usar ese exportador como frontera final. | `lib/content/validation.ts:42-72`; `lib/publication/local-publication-candidate.ts:29,434-458` |
| `MSR-L05` | `MITIGATED_IN_LOCAL_SCOPE` | Metadata queda limitada a 256 KiB; backup limita 768 MiB agregados, 10.000 entradas y 128 MiB por archivo. Son presupuestos dev/test y no una validación de arquitectura productiva. | `lib/media/local-media-store.ts:85-88,418-435,489-505`; `lib/operations/local-backup.ts:26-29,391-468,613-685` |
| `MSR-L06` | `PARTIALLY_MITIGATED` | Los tokens exigen formato base64url de 43–128 caracteres y diversidad, se almacenan como digest y se comparan en tiempo constante; loopback reduce exposición. Aún faltan generación obligatoria, rotación y throttling. | `lib/workbench/local-cms-workbench.ts:33-37,97-102,124-161,197-231,744-763` |

Controles favorables observados: administración loopback, bearer + origen exacto + POST, replay, límites, renderizado escapado, locks cooperativos locales, backup con integridad y publicación fail-closed. Permanecen `NOT_TESTED`: explotación/fuzz, escritores no cooperativos o filesystem hostil, TLS/cabeceras/CDN/WAF desplegados, ACL/datos reales, imágenes maliciosas, codec/playback MP4, historial Git de secretos, forced-colors real y alcanzabilidad/VEX/provenance completas.

## Hallazgos

| ID | Dominio/control | Resultado | Severidad técnica | Confianza | Prioridad de release/revisión | Revisión |
|---|---|---|---|---|---|---|
| `F-d0ddd59b09a70c2e` | Publicidad / `SECTOR-ADVERTISING-001` | `INCONCLUSIVE` | `CRITICAL` | `HIGH` | P0 release blocker | `REQUIRES_LEGAL_COUNSEL` |
| `F-3f2f2e51be65edb1` | Gobierno / `GOV-APPLICABILITY-001` | `INCONCLUSIVE` | `HIGH` | `HIGH` | P0 release blocker | `REQUIRES_LEGAL_COUNSEL` |
| `F-1b1707ba34e2e4e1` | Privacidad / `PRIV-RGPD-BASES-001` | `PARTIAL` | `HIGH` | `HIGH` | P0 release blocker | `REQUIRES_HUMAN_REVIEW` |
| `F-2f8825c8118094bd` | Consumo / `CONS-PRECONTRACT-001` | `INCONCLUSIVE` | `MEDIUM` | `HIGH` | P0 antes de contacto | `REQUIRES_LEGAL_COUNSEL` |
| `F-7e8fcbac30938098` | Accesibilidad / `A11Y-WCAG22-BASELINE-001` | `PARTIAL` | `MEDIUM` | `HIGH` | P1 antes de release | `REQUIRES_HUMAN_REVIEW` |
| `F-0470ade21d915c0c` | Edad / `AGE-ACCESS-001` | `PARTIAL` | `HIGH` | `HIGH` | P0 release blocker | `REQUIRES_LEGAL_COUNSEL` |
| `F-ab00508cfb2f4f30` | Imagen / `PRIV-IMAGE-RIGHTS-001` | `PARTIAL` | `HIGH` | `HIGH` | P0 por perfil/activo | `REQUIRES_LEGAL_COUNSEL` |
| `F-6890fb5a6df63213` | Cookies / `COOKIE-LSSI-CONSENT-001` | `NOT_TESTED` | `MEDIUM` | `HIGH` | P0 antes de proveedores | `REQUIRES_HUMAN_REVIEW` |
| `F-30b719d32a855cfb` | Seguridad / `SEC-SCA-REACHABILITY-001` | `PARTIAL` | `LOW` | `HIGH` | P1 antes de release | `REQUIRES_HUMAN_REVIEW` |

### Síntesis de remediación

- `F-d0ddd59b09a70c2e`: obtener revisión escrita, específica del alcance, por un abogado en España que identifique operador y servicio y apruebe o rechace actividad, imágenes, copy, SEO, edad y contacto.
- `F-3f2f2e51be65edb1`: identificar prestador, establecimiento, datos registrales, autoridad sectorial y modelo de contratación; producir aviso legal original.
- `F-1b1707ba34e2e4e1`: aprobar mapa responsable/encargados, inventario, finalidades, bases, transparencia, minimización, retención, derechos, contratos y seguridad; reemplazar el mecanismo local por arquitectura de producción adecuada y documentar clasificación art. 9 y screening/EIPD art. 35 antes de tratar datos reales.
- `F-2f8825c8118094bd`: documentar cuándo y cómo se forma el contrato, qué se ofrece, precio, cancelación/desistimiento y servicio al cliente antes de activar canales.
- `F-7e8fcbac30938098`: auditar el release congelado contra criterios WCAG 2.2 A/AA, incluyendo lector de pantalla, contraste, zoom/reflow, errores y tamaño de objetivos.
- `F-0470ade21d915c0c`: aprobar jurídicamente la política de edad e implementar el control accesible y proporcional que corresponda, sin recogida excesiva.
- `F-ab00508cfb2f4f30`: verificar y vincular al release evidencia restringida de edad, consentimiento, derechos de imagen/licencia, alcance y retirada por persona y activo.
- `F-6890fb5a6df63213`: inventariar cookies, storage y requests en los estados sin elección, rechazo, aceptación y retirada sobre el runtime real.
- `F-30b719d32a855cfb`: mantener el audit de producción en cero advisories sobre el candidato congelado y conservar su salida; validar el inventario CycloneDX contra el schema oficial si se va a tratar como SBOM interoperable y completar alcanzabilidad o VEX/provenance compatible. El scanner integrado continúa `FAILED`.

Los JSON individuales conservan método, evidencia/hash, contraprueba, responsable, retest y riesgo residual.

## Matriz de trazabilidad

| Requisito | Control | Prueba | Evidencia | Hallazgo | Corrección / retest |
|---|---|---|---|---|---|
| Identidad y legal | `GOV-APPLICABILITY-001` | Revisión de repositorio e intake | `LEGAL_INPUTS_REQUIRED.md` | `F-3f2f2e51be65edb1` | Identificar prestador; revisión jurídica del texto final. |
| Perfiles/contacto | `PRIV-RGPD-BASES-001` | Tipos, gates, persistencia y auditoría locales | `lib/content/persistent-repository.ts`, `lib/workbench/local-cms-workbench.ts` | `F-1b1707ba34e2e4e1` | Trazar cada dato/proveedor hasta borrado; clasificar art. 9 y screening/EIPD art. 35; probar derechos en staging. |
| Contacto/contrato | `CONS-PRECONTRACT-001` | Documentos y páginas sin POST | `app/(legacy)/contacto/page.tsx`, `app/[locale]/contacto/page.tsx` | `F-2f8825c8118094bd` | Aprobar flujo y verificar información antes de obligación. |
| Publicidad/SEO | `SECTOR-ADVERTISING-001` | Brief + notas automáticas + BOE | evidencia restringida del cliente | `F-d0ddd59b09a70c2e` | Dictamen escrito y revisión del release exacto. |
| Accesibilidad | `A11Y-WCAG22-BASELINE-001` | Contratos + Playwright + teclado/reflow | `tests/accessibility-contract.test.ts`, `output/playwright/final-preview/reflow-320-equivalent-400.png` | `F-7e8fcbac30938098` | Auditoría A/AA y AT sobre artefacto versionado. |
| Mayoría de edad | `AGE-ACCESS-001` | Validación + persistencia de referencia + boundary | `lib/content/validation.ts`, `tests/persistent-repository.test.ts` | `F-0470ade21d915c0c` | Política aprobada, evidencia auténtica, implementación accesible y prueba en staging. |
| Derechos de imagen | `PRIV-IMAGE-RIGHTS-001` | Modelo/gates + media local/auditoría | `lib/media/local-media-store.ts`, `tests/local-cms-workbench.test.ts` | `F-ab00508cfb2f4f30` | Trazar evidencia real por perfil/activo y probar retirada completa. |
| Alcance regional | `GOV-SOURCE-FRESHNESS-001` | Perfil territorial + revisión de incógnitas | `profile.json`, `applicability-matrix.md` | — (`PENDING_VERIFICATION`) | Con hechos finales, ejecutar inventario dirigido BOE/BOCM/DOGC y fuentes municipales materiales; asesoría documenta inclusión/exclusión. |
| Cookies/runtime | `COOKIE-LSSI-CONSENT-001` | Inventario desplegado | `NOT_TESTED` | `F-6890fb5a6df63213` | Captura por cuatro estados después de elegir infraestructura. |
| Dependencias | `SEC-SCA-REACHABILITY-001` | Audit de producción + inventario estructurado del lockfile + artifact validator + revisión pasiva; scanner integrado fallido | `evidence/87-local-checkpoint/evidence-manifest.json`, `scripts/generate-sbom.ts`, `scripts/validate-build-artifact.ts`, `package.json`, `pnpm-lock.yaml` | `F-30b719d32a855cfb` | Capturar el candidato final; validar schema si se reclama SBOM interoperable y completar alcanzabilidad/VEX/provenance antes de release. |
| Multilingüe/SEO | `QUALITY-ISO25010-001`, `SEO-GOOD-PRACTICE-001` | Validador local + comparación determinista de catálogos `es`/`en`/`fr`/`it` | `scripts/validate-locales.ts`, `lib/i18n/locales.ts`, `tests/i18n-contract.test.ts`, `compliance/multilingual/audit.json` | — (`PARTIAL`; auditoría complementaria sin findings) | Revisión humana identificada por idioma y especialista jurídico para copy legal/comercial; luego DOM/overflow/navegación/AT en staging y verificación del grafo canonical/hreflang sobre destinos desplegados. |

## Custodia de evidencia

El manifiesto técnico durable del 95 está en `evidence/95-local-technical-checkpoint/evidence-manifest.json`, SHA-256 `d7f26a8e…bd95`, vinculado a `15d56f0…`; `release-verify.log` SHA-256 `38ae74bc…4e69`, audit SHA-256 `f3a611cd…a402`, inventario SHA-256 `cff0df36…cd7a` y reporte de build SHA-256 `bfd9119e…53a9`. El scorecard 98 y la auditoría multilingüe pertenecen por ahora al working tree y requieren un nuevo manifiesto commit-bound; el checkpoint 87 permanece como evidencia histórica separada. Ninguna ejecución demuestra despliegue, pentest, alcanzabilidad, UAT o aprobación legal, visual o lingüística.

## Roadmap

- Inmediato: conservar `noindex`, sitemap vacío, perfiles/contacto cerrados; resolver identidad, actividad/publicidad y formación contractual; clasificar U-07 (art. 9/EIPD art. 35), U-08 (BOE/BOCM/DOGC/municipal) y U-09 (revisión lingüística/jurídica por idioma); seleccionar visual, aportar derechos y capturar el candidato 98 sobre commit limpio.
- 30 días: cerrar privacidad, edad, derechos de imagen, cookies/tecnologías, textos legales, contenido y proveedores; obtener revisión humana identificada de español, inglés, francés e italiano y revisión jurídica del copy comercial/legal; definir backend/autenticación/cifrado de producción, auditar accesibilidad/DOM por idioma y completar schema SBOM/alcanzabilidad/VEX/provenance. Todo nuevo candidato deberá congelarse con su propio `checkpoint_sha`, `tree_sha` y `effective_at`, repetir el audit de producción con salida retenida y retestar los controles materiales.
- 60–90 días: validar runtime desplegado, cabeceras, cookies, terceros, rendimiento, derechos y operación; retestar por cada cambio material.
- Escalaciones humanas: abogado en España para actividad/publicidad/contratación y copy legal/comercial en los cuatro idiomas; responsable de privacidad; lingüistas identificados para `es`, `en`, `fr` e `it`; revisión independiente de accesibilidad; aceptación visual y comercial del cliente.
