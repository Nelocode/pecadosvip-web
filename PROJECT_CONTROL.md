# PROJECT CONTROL — PecadosVip Web

Última actualización: 2026-08-27 — candidato multilingüe 98
Fecha límite dirigida por el usuario: 2026-08-29 22:00 America/Bogota
Patrocinador y autoridad de aceptación: Luis Araujo
Estado actual: **98 % DE EJECUCIÓN TÉCNICA LOCAL VERIFICABLE / ALERTA ROJA PARA PUBLICACIÓN**

## Propósito, valor y éxito

Entregar un único sitio público de PecadosVip para Madrid, Barcelona y cobertura local escalable, con imagen premium y discreta, descubrimiento de perfiles, contacto privado y administración de contenidos sin tocar código.

El éxito técnico requiere trazabilidad completa de requisitos P0/P1, build reproducible, funcionamiento responsive, SEO técnico, accesibilidad, ausencia de defectos críticos y handoff reproducible. La aceptación comercial y visual pertenece a Luis y no se infiere de un build aprobado técnicamente.

## Enfoque y tailoring PMBOK 8

Enfoque híbrido de nivel 2:

- Predictivo para fecha límite, gates, seguridad, alcance obligatorio, trazabilidad, release y aceptación.
- Adaptativo para interfaz, contenido provisional, iteraciones visuales y correcciones.
- Elaboración progresiva para SEO local, CMS e infraestructura aún no confirmados.

Las Focus Areas de Initiating, Planning, Executing, Monitoring and Controlling y Closing se superponen. Se usan solo los artefactos que mejoran decisión, coordinación, control o aprendizaje.

## Alcance

### Incluido

- Arquitectura pública escalable por ciudad, localidad y perfil.
- Inicio, hubs geográficos, listado de perfiles, ficha de perfil, contacto/reserva sin checkout e información legal.
- SEO técnico, metadata, canonical, sitemap, robots, breadcrumbs y schema aplicable.
- Experiencia responsive y accesible.
- Modelo de CMS con estados, disponibilidad, roles, auditoría, preview y borrado lógico.
- Gestión de fotos y vídeo con contrato de almacenamiento/optimización documentado.
- Pruebas, evidencia, release y guía de operación.

### Excluido o condicionado

- Pago y reserva online en esta fase.
- Promesas de posición SEO o permanencia en rankings.
- Publicación externa, compra de dominio, hosting, cuentas de analítica o servicios pagados sin autorización.
- Carga pública de perfiles o multimedia sin contenido, consentimiento, prueba de mayoría de edad y derechos de uso.
- Textos legales copiados de terceros.

## Gobernanza

- Luis Araujo: aprueba diseño, contenido, cobertura, legal, presupuesto y aceptación final.
- Codex principal: integra requisitos, código, pruebas, release y control de cambios.
- Subagentes: análisis documental, auditoría de archivos y análisis visual en solo lectura; no cierran el proyecto.
- Cambios P0/P1, publicación, gasto, credenciales o decisiones irreversibles se escalan a Luis.
- Gates: evidencia base → arquitectura → incremento vertical → integración → QA independiente → release → aceptación.

## Stakeholders

- Luis Araujo: patrocinador, propietario del producto y aceptación.
- Carlos/equipo de desarrollo: entrega técnica, según las reuniones.
- Nelson: infraestructura/costos mencionados, autoridad concreta pendiente.
- Asistente/secretario: usuario operativo previsto del CMS.
- Personas mostradas en perfiles: consentimiento, mayoría de edad, privacidad y derechos de imagen pendientes.
- Proveedores de dominio, hosting, almacenamiento, analítica y mensajería: no seleccionados.

## Recursos

- Base reutilizable: Next.js 16.2.11, React 19.2.6, Vinext 1.0.0-beta.3, Vite 8.0.13 y pnpm 11.19.0.
- Repositorio original preservado: `pecadosvip-web`, commit `013307a`.
- Repositorio de integración aislado: `pecadosvip-web-delivery`.
- Checkpoint remoto privado: `Artoto45/pecadosvip-web-delivery`, PR borrador #1, rama `codex/pagina-web-checkpoint`.
- Copia fuera de OneDrive: `C:\Users\artot\AppData\Local\CodexWork\Pagina_Web-20260826-2111`.
- Existe un workbench CMS persistente exclusivamente local con roles, auditoría, medios, respaldo y restauración; no sustituye proveedor de identidad, DB, almacenamiento de objetos ni operación productiva.
- Faltan: proveedor CMS/DB/objetos, credenciales productivas, dominio confirmado, contenido real, activos licenciados y aprobación visual/legal.

## Finanzas

- Presupuesto mencionado: 600 EUR, aceptación condicionada en la evidencia.
- Supuesto de control: cero gasto externo nuevo sin autorización.
- Desarrollo, hosting, almacenamiento multimedia, dominio, analítica y SEO mensual se controlan por separado.
- La preparación SEO inicial no incluye garantía ni mantenimiento recurrente.

## Medición de avance

El ledger atómico `LOCAL_TECHNICAL_SCORECARD.json` declara **98/100 (`LOCAL_TARGET_EARNED`)** para ejecución técnica local. La captura durable quedó ligada al commit `73249861acb9874a310e9f112450d00a65a4b1e3`; su manifiesto está en `evidence/98-local-technical-checkpoint/evidence-manifest.json`, SHA-256 `7EC3DB4BDF77E732E8B22D8EC6E1B5C3646CF27F406E21E5C75F64AE78A7A512`:

| Dimensión | Puntos |
|---|---:|
| Inventario y evidencia | 15/15 |
| Arquitectura | 9/10 |
| Implementación e integración | 45/45 |
| QA y correcciones | 24/25 |
| Empaquetado y handoff | 5/5 |

El total es **98/100**. La regla concede puntos indivisibles por criterios técnicos completados y conserva sus límites explícitos. Los tres puntos incorporados desde el checkpoint 95 corresponden al contrato de rutas/locales/selector, la paridad determinista de catálogos sin fallback y la metadata internacional localizada. Esta métrica es un proxy de ejecución técnica local, no de requisitos aceptados. La verificación estricta permanece en **2/20 requisitos (10 %)**: 2 `VERIFIED`, 12 `PARTIAL`, 5 `BLOCKED` y 1 `AT_RISK`. Tampoco mide conformidad legal, accesibilidad completa, operación ni readiness de producción.

El checkpoint durable 98 registra **155/155 pruebas PASS**, typecheck PASS, build PASS y validador i18n PASS. La remediación local EasyPanel del 2026-08-28 amplía el árbol de trabajo a **159/159** pruebas PASS y añade artefacto standalone, validación separada y smoke de su entrypoint; todavía no es una nueva captura durable ni cambia el score 98. Cubre locales base exactos `es`, `en`, `fr`, `it`, rutas prefijadas, rutas legacy `noindex`, metadata localizada y cierre explícito de perfiles dinámicos/cuerpos legales no traducidos fuera de ES. La comparación de catálogos produjo 0 hallazgos, pero su dictamen técnico es `NO DETERMINABLE`, el lingüístico `PENDIENTE DE REVISIÓN HUMANA` y el de publicación `NO DETERMINABLE POR FALTA DE EVIDENCIA`.

Como antecedentes durables, el checkpoint 95 sobre `15d56f0e5812a06e03dea781487f7553ce010a5c` conserva su manifiesto SHA-256 `D7F26A8E27EA4789F39CEC2855FE376DF3DAA0B86E138F2E4156A10D35D9BD95`, y el checkpoint 87 permanece separado. Esos hashes históricos no se reutilizan como evidencia del 98.

Las mejoras candidatas incluyen normalización acotada de imágenes a variantes WebP; MP4 limitado a validación estructural `bounded-mp4-container-v1`, sin decodificación de codec, playback, Range, transcodificación ni antivirus; y locks locales cooperativos para repositorio, medios y snapshots de backup. Esos locks no son distribuidos y un lock huérfano se conserva para fallar cerrado hasta intervención operativa segura.

El 2 % fuera del objetivo local y, sobre todo, los 18 requisitos estrictos no verificados se concentran en decisiones o evidencias no sustituibles por pruebas sintéticas: diseño/activos aprobados, contenido y derechos reales, revisión humana EN/FR/IT, cuerpos legales y clasificación jurídica española, validación multilingüe en DOM/navegador/tecnología asistiva/overflow, infraestructura productiva, dominio/canales, staging, seguridad/rendimiento desplegados y UAT/aceptación formal. El estado público y legal continúa **`NO-GO`**.

## Pronóstico y alerta roja

Estimación para una entrega de producción completa con la evidencia disponible:

- Frontend público y responsive: 30–45 h.
- Perfiles, filtros, detalle y contenido provisional: 18–28 h.
- Adaptación del CMS local a identidad, DB y almacenamiento productivos: 45–80 h.
- SEO local, legal, contenido y configuración externa: 20–40 h más dependencias humanas.
- QA, correcciones, release y handoff: 20–30 h.

La línea base original era 130–215 h. El avance local reduce incertidumbre técnica, pero la alerta roja permanece: las dependencias humanas y la conversión a CMS operacional, contenido, legal y QA de aceptación todavía pueden exceder la capacidad disponible sin aumentar recursos, ampliar fecha o aceptar excepciones explícitas.

## Cronograma hacia atrás

| Hito | Fecha objetivo | Gate de salida |
|---|---|---|
| Línea base de evidencia y arquitectura | 27/08 02:00 | 100 % de archivos inventariados; requisitos y bloqueos trazados |
| Incremento vertical público | 27/08 18:00 | Inicio → listado → perfil → contacto ejecutable |
| CMS local y rutas SEO prioritarias | 28/08 14:00 | Contratos CRUD/estados y rutas/metadata verificados; preview operativo aún pendiente |
| Integración y congelamiento de alcance | 29/08 07:00 | P0/P1 implementados o excepción explícita |
| Reserva QA/release/handoff | 29/08 07:00–22:00 | regresión, correcciones, paquete, hashes y smoke final |

Ruta crítica: selección visual → activos/contenido → incremento público → contrato CMS/persistencia → integración → QA visual/navegador → release. La selección visual, contenido real, legal e infraestructura son dependencias externas activas.

## EDT / backlog de valor

1. Gobierno y evidencia
   1.1 Inventario y hashes
   1.2 Matriz de requisitos
   1.3 Riesgos, decisiones y cambios
2. Arquitectura pública
   2.1 Sistema visual y navegación
   2.2 Inicio, hubs y cobertura
   2.3 Listado/filtros y ficha de perfil
   2.4 Contacto y legales
3. Administración
   3.1 Modelo de datos y estados
   3.2 Roles, permisos, auditoría y preview
   3.3 Multimedia, orden, optimización y almacenamiento
4. SEO y medición
   4.1 Metadata/canonical/schema/breadcrumbs
   4.2 Sitemap/robots/enlazado
   4.3 Analítica/Search Console condicionadas a cuentas
5. Calidad y transición
   5.1 Lint/typecheck/build
   5.2 Responsive/accesibilidad/navegador/seguridad
   5.3 Release, hashes, rollback y guía

## Estado por dominio

- Governance: autoridad y gates definidos; aprobación visual/comercial pendiente.
- Scope: 20 requisitos normalizados; REQ-010 y REQ-011 están verificados en contrato; REQ-008 y REQ-020 mejoraron pero siguen parciales por ser locales; CMS productivo e infraestructura conservan decisiones abiertas.
- Schedule: alerta roja activa; reserva final protegida.
- Finance: cero gasto nuevo; 600 EUR no confirmado como alcance cerrado.
- Stakeholders: roles principales identificados; datos de responsables externos pendientes.
- Resources: stack, clon, remoto privado, workbench local, candidato multilingüe con 155 pruebas y captura durable 98 verificados localmente; contenido, activos y servicios externos siguen pendientes.
- Risk: exposición global alta por alcance/tiempo, legal, contenido y diseño no aprobado.

## Próximo hito

El flujo público localizado, las rutas legales, el CMS persistente local, medios, backup/restore, exportador de candidato, preview sintético, accesibilidad de ingeniería, SEO/contacto, cabeceras y el boundary de producción fail-closed están integrados y capturados en evidencia durable. El ZIP 98 es un paso de handoff externo al historial. Para publicación todavía se necesitan revisión lingüística humana, cuerpos legales localizados por especialista, prueba DOM/navegador/AT/overflow, staging y las decisiones externas sobre actividad/publicidad española, identidad legal, privacidad/edad/derechos, contenido, visual, infraestructura y canales.
