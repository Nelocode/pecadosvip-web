# Etapa: beta pública sintética

Fecha de cierre técnico local: `2026-09-02T07:31:33Z`.

## Resultado de la etapa

El artefacto de producción deja de mostrar únicamente el holding y publica una beta sintética navegable en español, inglés, francés e italiano:

- `/` redirige a `/es`;
- `/{locale}` muestra la portada alineada con la referencia visual;
- `/{locale}/perfiles` y las seis fichas sintéticas son navegables;
- `/{locale}/servicios` expone un catálogo filtrable de 34 rutas y sus detalles;
- 70 recursos sintéticos revisados técnicamente se entregan mediante familias `/beta-media/*` con allowlist;
- la ruta interna `/preview-local-sintetico` sigue respondiendo 404 en producción.

La beta es una capa editorial separada del modelo de publicación comercial. Los campos `public_path` de los manifiestos fuente permanecen vacíos y las revisiones humana, lingüística, de derechos y legal siguen pendientes. La entrega beta usa rutas derivadas y una allowlist propia; no promueve esos activos a contenido comercial aprobado.

## Controles conservados

- `noindex, nofollow, noarchive` en metadatos y cabeceras;
- `robots.txt` con `Disallow: /` y sitemap vacío;
- sin canonicales ni datos estructurados promocionados;
- contacto, reservas, pagos, checkout y analítica sin APIs activas;
- administración y workbench fuera del artefacto público;
- botones comerciales deshabilitados y sin enlaces externos de conversión;
- medios confinados a rutas conocidas, sin symlinks y con límite de 4 MiB por archivo.

## Evidencia técnica local

- lint: `PASS`;
- TypeScript: `PASS`;
- pruebas: `219/219 PASS`;
- build Vinext y preparación standalone: `PASS`;
- validador i18n estructural: `PASS_WITH_LIMITS`, cero problemas de catálogo;
- SBOM CycloneDX: 612 componentes;
- artefacto worker: 174 archivos, 3,327,182 bytes, cero violaciones;
- artefacto standalone: 2,502 archivos, 76,671,029 bytes, cero violaciones;
- smoke HTTP standalone: cuatro raíces localizadas y 16 rutas limpias `200`, rutas internas/transaccionales bloqueadas, cero controles de conversión habilitados;
- Playwright: portada móvil 390 px sin solapamientos; catálogo francés filtrado de 34 a 1 resultado y navegación a la ficha, cero errores o advertencias de consola.

## Auditoría multilingüe

La muestra automática cubrió 24 variantes HTTP (seis rutas por cuatro idiomas). `lang`, UTF-8, selector, rutas localizadas y cierre de indexación resultaron coherentes. El dictamen de puerta completa permanece:

- técnico multilingüe: `NO CONFORME` para un lanzamiento indexable y comercial;
- lingüístico: `PENDIENTE DE REVISIÓN HUMANA`;
- publicación comercial: `NO APTO`.

Hallazgo principal: las variantes localizadas de privacidad son un estado de preparación y no una política material. Canonicales/hreflang permanecen deliberadamente ausentes mientras la beta sea `noindex`.

## Auditoría pasiva UE/España

La auditoría local distingue tres resultados:

- beta técnica observada: `PARTIAL`;
- conformidad legal UE/España: `INCONCLUSIVE`;
- autorización legal/comercial de publicación: `NOT_ASSESSED_AND_NOT_GRANTED`.

La evidencia confirma el cierre técnico de indexación y conversión, pero no resuelve la identidad del operador, los deberes LSSI, el inventario RGPD de logs/proveedores, la clasificación del almacenamiento terminal del aviso, el rol y calendario aplicable del AI Act, los derechos/licencias de activos, la aplicabilidad de accesibilidad ni el régimen sectorial de servicios adultos en Madrid, Cataluña y los municipios correspondientes. Esos puntos requieren hechos del negocio, fuentes vigentes y revisión especializada; esta auditoría no es una certificación legal.

## Pendientes fuera del alcance de esta beta

- identidad y datos de contacto verificables del operador;
- textos legales y de privacidad aprobados para el modelo real;
- revisión lingüística humana ES/EN/FR/IT;
- derechos, consentimientos y contenido definitivo;
- precios, disponibilidad, cobertura y condiciones reales;
- accesibilidad con tecnología asistiva, seguridad especializada y UAT comercial;
- activación separada de contacto, reservas, pagos, analítica e indexación.

Esta evidencia acredita el contrato técnico local de la beta sintética. No acredita conformidad legal, aprobación lingüística, disponibilidad comercial ni el estado del despliegue remoto.
