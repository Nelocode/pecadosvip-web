# Etapa: boundary público seguro

Fecha local: 2026-09-01

Estado técnico: candidato validado; publicación de contenido y demo pública no autorizadas.

## Resultado

Esta etapa corrige dos regresiones heredadas antes de integrar el diseño:

1. El origen web público ya no compila las maquetas administrativas duplicadas bajo `/admin/**` y `/api/admin/**`. También se retiraron sus endpoints de login y el backend huérfano que inicializaba usuarios mediante credenciales definidas en el código. La herramienta administrativa soportada sigue siendo `pnpm run cms:local`, un proceso separado y limitado a loopback.
2. `/preview-local-sintetico` vuelve a exigir simultáneamente desarrollo, flag exacto `1`, servidor enlazado a `127.0.0.1` y `Host` loopback válido. Las cinco rutas de medios aplican la misma decisión y responden con caché privada, `no-store` y `noimageindex`.
3. Se eliminó el rewrite que enviaba `/` al preview. Mientras `productionActivation` permanezca en `false`, `/` muestra el holding y el preview responde 404 en producción.

## Invariantes comprobados

- Un `Host` ausente, ambiguo, con controles, externo o no analizable no habilita el preview.
- Los medios de perfiles, ciudades, servicios, hero y filigrana no eluden el guard de la página.
- `GET /admin`, `/admin/login`, `/admin/kyc`, `/api/admin` y los dos antiguos endpoints POST de login responden 404 en el standalone de producción.
- El preview local legítimo sigue respondiendo 200 con `pnpm run dev:preview`; sus imágenes conservan tipo y bytes esperados.
- La raíz pública no se activa por variables de preview.

## Validación ejecutada

`pnpm run release:verify` terminó con exit code 0:

- 208/208 pruebas;
- TypeScript y build aprobados;
- auditoría estructural ES/EN/FR/IT `PASS_WITH_LIMITS`;
- scorecard técnico local 98/100, separado de aceptación y cumplimiento;
- SBOM de 612 componentes;
- artefactos worker y standalone con 0 violaciones;
- smoke fail-closed de producción aprobado.

La prueba positiva de desarrollo se realizó en `127.0.0.1`: home, retrato, hero y filigrana respondieron 200. La misma superficie con `Host: preview.example.com` fue bloqueada.

## Evidencia histórica restaurada

Se restauró íntegramente `output/playwright/pv95/` desde el checkpoint histórico: resumen más cuatro capturas. El JSON conserva su fecha y sus hashes originales. Sirve únicamente para reproducir el scorecard histórico; no valida este candidato ni un despliegue actual.

## Límite operativo

Esta etapa no habilita reservas, contacto, indexación, contenido real, CMS productivo ni demo pública. Para mostrar el preview en un dominio externo se necesita una decisión aparte: hostname canónico aprobado, flag explícito de demo, política de proxy/Host, smoke externo y revisión de que no se abran canales de conversión.

Las instrucciones versionadas de instalación, GitHub y EasyPanel están en `SUBIR_PROYECTO.md` y `STAGE_ARCHIVE_GUIDE.md`. Cada ZIP completo añade además un `LEEME_PRIMERO.md`, un inventario y un verificador generados para esa copia concreta. Nunca se deben subir `.env`, tokens, credenciales, bases de datos, copias privadas ni datos personales.
