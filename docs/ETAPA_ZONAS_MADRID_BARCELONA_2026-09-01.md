# Etapa: logotipo ampliado y zonas Madrid / Barcelona

Fecha: 2026-09-01
Estado: validado en preview local; no desplegado ni activado en producción.

## Qué cambió

- El logotipo de la cabecera aumentó de forma responsive: 48 × 48 px en escritorio, 36 × 36 px en móvil y 34 × 34 px en pantallas estrechas.
- La navegación principal enlaza directamente con Madrid y Barcelona.
- La portada reúne cobertura y perfiles en dos zonas completas:
  - Madrid: Madrid, Toledo, Segovia y Guadalajara; Valeria, Lucía y Alicia.
  - Barcelona: Barcelona, Tarragona, Girona y Sitges; Sofía, Julia y Mia.
- En escritorio las zonas aparecen en paralelo. Hasta 900 px se apilan verticalmente; las tarjetas de cada zona usan un rail horizontal en móvil.
- Los filtros mantienen la semántica exacta de ciudad. Por eso `city=barcelona` muestra Sofía, Lucía y Mia, mientras Julia sigue asociada al filtro `city=girona`.
- Si solo se filtra por disponibilidad, un perfil con cobertura dual puede aparecer en ambas zonas; los enlaces Madrid/Barcelona conservan ese filtro al cambiar de zona.
- El catálogo tiene una jerarquía accesible continua: H2 de catálogo, H3 por zona, H4 por bloque y H5 en las tarjetas compactas.

## Cómo revisarlo localmente

1. Abre PowerShell en la raíz del proyecto.
2. Ejecuta `corepack enable`.
3. Ejecuta `pnpm install --frozen-lockfile`.
4. Ejecuta `pnpm run dev:preview`.
5. Abre `http://localhost:3000/preview-local-sintetico?lang=es#inicio`.
6. Prueba también:
   - `http://localhost:3000/preview-local-sintetico?lang=es&city=madrid#zona-madrid`
   - `http://localhost:3000/preview-local-sintetico?lang=es&city=barcelona#zona-barcelona`

## Evidencia

- Portada: `output/audit-20260901-city-zones/after-desktop-1132x754.png`.
- Zonas: `output/audit-20260901-city-zones/after-zones-desktop-1132x754.png`.
- Móvil: `output/audit-20260901-city-zones/after-mobile-390x844.png`.
- Comparación conjunta: `output/audit-20260901-city-zones/reference-vs-city-zones-final-detail.png`.
- Registro de decisiones y QA: `design-qa.md`.

## Validación realizada

- `pnpm run validate`: aprobado.
- ESLint: aprobado.
- TypeScript: aprobado.
- Pruebas: 206/206 aprobadas.
- Build Vinext: cinco entornos aprobados.
- Standalone: generado correctamente.
- Navegador integrado: un `main`, un `h1`, dos zonas etiquetadas, IDs únicos, imágenes sin fallos en los estados revisados y consola sin errores de aplicación.

## Límites que siguen vigentes

- `productionActivation:false`.
- El preview sintético continúa limitado al entorno local, con `noindex` y middleware fail-closed.
- Reserva, contacto, pagos y canales externos permanecen desactivados.
- Las imágenes y perfiles son sintéticos; no representan disponibilidad comercial.
- Siguen pendientes aprobación humana de contenido, derechos, legal, idiomas, accesibilidad, UAT y una autorización separada antes de publicar.
- El tag `v0.1.0-beta.1` no se movió.

## Cómo subir la copia a GitHub

El ZIP de esta etapa incluye `LEEME_PRIMERO_SUBIR_PROYECTO.md` con instrucciones paso a paso. No uses `git push --force`. Si el repositorio remoto ya tiene historial, clónalo primero y copia dentro los archivos extraídos, revisa `git status`, crea un commit nuevo y sube la rama normal.
