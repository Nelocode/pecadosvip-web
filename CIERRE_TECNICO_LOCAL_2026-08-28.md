# Cierre técnico local verificable — PecadosVip Web

Fecha de corte: 2026-08-28 (America/Bogota)  
Árbol base: `35a9f1313c0a044473f8747af415830f469237bc` más cambios locales aún no confirmados en Git  
Estado de publicación: **NO-GO**  
Preview local: `http://localhost:3000/preview-local-sintetico`

## Resultado

Se completó el máximo alcance técnico que puede verificarse de forma local sin inventar aprobaciones, datos comerciales, asesoría jurídica, infraestructura ni aceptación del cliente. Esto cierra al 100% la etapa técnica local ejecutable, pero **no significa que el producto completo esté al 100% de producción**. El scorecard contractual conservador continúa en 98/100 y la puerta estricta de release permanece en 2/20.

## Evidencia final

- `pnpm run release:verify`: PASS, exit code 0.
- Lint y TypeScript: PASS.
- Pruebas automáticas: **192/192 PASS**.
- Build Vinext/Vite: PASS.
- Validación ES/EN/FR/IT: `PASS_WITH_LIMITS`; catálogos con paridad técnica y revisión lingüística humana pendiente.
- SBOM CycloneDX: 612 componentes; SHA-256 `4bd0c6b7c8f44f9e5dcc8c75c90a9921fe66d1697e5d3a55c983e1cc363a43a9`.
- Artefacto worker: PASS, 134 archivos, 0 violaciones.
- Artefacto standalone: PASS, 2392 archivos, 0 violaciones; `image-size` ausente por política recursiva.
- Smoke del standalone: PASS; holding público cerrado, robots bloqueado, sitemap vacío y preview sintético inaccesible en producción.
- Playwright local: portada y ficha de Sofía en escritorio/móvil; filtros, estado vacío, reset, navegación a detalle y barra móvil operables; 7 imágenes completas, 0 errores de consola y 0 overflow horizontal a 1440 y 390 px.
- El middleware del preview ahora responde 400 ante una URL malformada en vez de terminar el servidor; la regresión queda cubierta por prueba.

## Alcance funcional integrado

- Preview premium negro/dorado con hero, navegación, cobertura, servicios, controles y pie.
- Seis identidades sintéticas: Valeria, Sofía, Lucía, Julia, Mia y Alicia.
- Medios públicos reutilizables con imagen móvil, video opcional, MIME explícito y encuadre `contain / center top` para no cortar rostros.
- Catálogo, filtros deterministas, estado sin resultados, tarjetas, detalle y galería.
- Siete ciudades: Madrid, Barcelona, Girona, Tarragona, Toledo, Guadalajara y Segovia.
- Rutas equivalentes ES/EN/FR/IT y cinco rutas de ciudad adicionales concretas.
- Fuente de contenido runtime validada y activación doble fail-closed.
- Contacto preparado para Telegram o POST HTTPS únicamente cuando snapshot, privacidad y configuración exacta estén aprobados; en el preview permanece desactivado.
- CSP, cabeceras, noindex, accesibilidad contractual, Docker multi-stage con digest inmutable y validación de artefactos.

## Auditoría multilingüe

La auditoría técnica de catálogos registra 0 hallazgos, pero la auditoría HTTP completa conserva un dictamen **NO APTO** con 120 hallazgos mayores:

- 56 por ausencia de canonical.
- 56 por ausencia de hreflang autorreferente.
- 4 por tratar el marcador contractual `/perfiles/{slug}` como URL literal.
- 4 de cobertura asociados a ese marcador.

La ausencia de canonical/hreflang es deliberada mientras el release y la indexación están cerrados; no debe “corregirse” publicando metadata prematuramente. El marcador dinámico no representa un perfil real aprobado. La revisión lingüística humana independiente de ES/EN/FR/IT continúa pendiente.

## Auditoría UE/España

La actualización pasiva resolvió 2 materias `APPLICABLE`, 7 `UNCERTAIN` y 6 `NOT_APPLICABLE`. El catálogo quedó íntegro (56 instrumentos, 46 controles, 56 referencias y 48/48 fuentes vinculantes completas). La frescura estricta quedó fail-closed con 52 fuentes `FRESH`, 0 `STALE` y 4 `PENDING_VERIFICATION`. El resultado continúa en **NO-GO** y no constituye certificación ni asesoría jurídica.

## Seguridad y suministro

- React/React DOM/RSC, Vite, Cloudflare Workers SDK, Wrangler, Undici, WebSocket y esbuild se actualizaron al conjunto revisado.
- Los dos advisories por versión de `image-size@2.0.2` permanecen visibles en SCA. El repositorio aplica un parche downstream fijado por SHA-256, prueba CJS/ESM y excluye recursivamente el componente del standalone. La justificación y sus límites están en `SECURITY_ADVISORY_VEX.md`; no se afirma “cero vulnerabilidades”.
- La imagen base Docker está fijada por etiqueta y digest multi-plataforma. La construcción real no se probó porque no existe un motor Docker Linux disponible en este equipo.

## Dependencias externas que impiden afirmar 100% de producción

1. Faltan al menos dos identidades para cumplir el mínimo de ocho perfiles del brief; las seis actuales siguen siendo material sintético de preview, no publicación autorizada.
2. Faltan mayoría de edad, consentimientos, derechos de imagen, procedencia y aprobación individual verificables para contenido real.
3. Faltan identidad jurídica del operador, clasificación exacta de actividad/servicios/publicidad, textos legales y revisión profesional aplicable en España/UE.
4. Faltan traducción y doble revisión humana independiente de contenido comercial y legal en ES/EN/FR/IT.
5. Faltan destinos reales de contacto, aviso de privacidad, reglas de retención y aprobación de los flujos de reserva.
6. Falta seleccionar y aprobar una referencia gráfica controladora y acreditar los derechos de marca/logo.
7. Faltan dominio, TLS, hosting, CMS/IdP productivo, almacenamiento/CDN, observabilidad, backup/restore y rollback sobre infraestructura autorizada.
8. Faltan build Docker real, despliegue EasyPanel ligado a un SHA, smoke externo, UAT, tecnología asistiva, Core Web Vitals y aceptación formal de Luis Araujo.

## Límites y autorización

No se realizó commit, push, merge, despliegue, indexación, configuración de dominio ni activación de datos/contactos reales. El servidor local se deja activo para visualización. Cualquier publicación requiere autorización separada y cierre verificable de los gates anteriores.

## Entregables de evidencia

- `output/release/standalone-artifact-report.json`
- `output/release/build-artifact-report.json`
- `output/release/sbom.cdx.json`
- `output/playwright/final-100-preview-desktop.png`
- `output/playwright/final-100-preview-mobile.png`
- `output/playwright/final-100-sofia-desktop.png`
- `output/playwright/final-100-sofia-mobile.png`
- `output/audit-20260828-final/multilingual-site/audit.json`
- `output/audit-20260828-final/multilingual-site/report.md`
- `output/audit-20260828-final/ue-es/README.md`
- `output/audit-20260828-final/ue-es/MANIFEST.sha256`

