# Insumos legales y de privacidad requeridos — PecadosVip Web

Estado: checklist de intake, no asesoría jurídica ni texto listo para publicar. El sitio permanece bloqueado para indexación, perfiles, contacto y analítica hasta que el responsable aporte y apruebe estos insumos.

## Identificación del prestador

Entregar en un canal seguro y versionado:

- Nombre o denominación social y nombre comercial autorizado.
- NIF/CIF u otro identificador aplicable.
- Domicilio o establecimiento permanente aplicable.
- Correo y otro medio de contacto directo y efectivo.
- Datos registrales y códigos de conducta, si aplican.
- Titular del dominio y relación con el prestador.
- Responsable jurídico que aprueba la publicación.

La [Ley 34/2002, artículo 10](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758&p=20230509&tn=0) exige acceso permanente, fácil, directo y gratuito a determinada información del prestador. La lista final y su aplicabilidad deben validarse jurídicamente para la entidad y actividad concretas.

## Servicio, contratación y consumidor

- Descripción exacta y lícita del servicio; confirmar expresamente que no existe local abierto al público.
- Ciudades y zonas realmente atendidas, horarios, restricciones y responsable operativo.
- Flujo de consulta/reserva, momento de confirmación y qué no constituye una reserva.
- Política de precios o forma de información, impuestos, desplazamiento y moneda, si aplica.
- Cancelación, cambios, no disponibilidad, reembolsos y resolución de disputas, si aplican.
- Reglas de uso, conducta prohibida, seguridad y canal de reclamaciones.
- Política 18+ y mecanismo de control de acceso aprobado.

No se publicarán tarifas, garantías, condiciones ni afirmaciones sanitarias inferidas de competidores o reuniones.

## Privacidad y protección de datos

Para cada colectivo —visitantes, personas que contactan, personas de perfiles y usuarios CMS— definir:

- Responsable y, si aplica, representante o DPO.
- Categorías de datos y origen.
- Finalidades separadas y base jurídica de cada finalidad.
- Carácter obligatorio/opcional y consecuencia de no facilitar datos.
- Destinatarios, encargados, proveedores y transferencias internacionales.
- Plazo o criterio de conservación y procedimiento de borrado/revisión.
- Derechos, canal de ejercicio y autoridad de control.
- Decisiones automatizadas o elaboración de perfiles, si existieran.
- Medidas de seguridad, control de acceso y respuesta a incidentes.

Los artículos 13 y 14 del [RGPD en EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj/spa) describen información que debe facilitarse según el origen de los datos. La AEPD recomienda información clara y por capas; véase su explicación sobre [el deber de informar](https://www.aepd.es/prensa-y-comunicacion/blog/la-importancia-de-la-informacion-por-capas-en-el-reglamento-general-de).

## Perfiles, edad, consentimiento e imagen

Por cada perfil real se requiere evidencia separada y revocable de:

- Identidad y mayoría de edad verificadas por un responsable autorizado.
- Consentimiento para el tratamiento y publicación de los datos concretos.
- Derechos de uso de cada foto y vídeo, territorio, canales, plazo y transformaciones permitidas.
- Aprobación del nombre público, biografía, medidas, idiomas, servicios, cobertura y disponibilidad.
- Fecha, responsable, referencia documental y vencimiento/revisión.
- Procedimiento de retirada, rectificación, archivo y despublicación urgente.

Las evidencias no se almacenan en URLs públicas, analítica ni bitácoras de contenido. El repositorio actual solo modela referencias; no es un almacén documental autorizado.

## Cookies y analítica

- Inventario de cookies/SDKs por proveedor, finalidad, duración y tercero.
- Categorías esenciales y no esenciales.
- CMP, interfaz de aceptar/rechazar/configurar y mecanismo permanente de revocación.
- Proveedor de analítica, región, contrato/DPA, retención, acceso y transferencias.
- Versión y fecha de las políticas enlazadas al consentimiento.

La [guía de cookies de la AEPD](https://www.aepd.es/recurso-multimedia/guia-sobre-el-uso-de-las-cookies) debe revisarse con el responsable legal. El contrato técnico de `MEASUREMENT_SPEC.md` no activa ni legitima un proveedor.

## Documentos a producir tras el intake

1. Aviso legal.
2. Política de privacidad por capas.
3. Política y panel de cookies.
4. Términos del servicio/contacto, si aplican.
5. Política 18+ y control de acceso.
6. Formularios/actas de consentimiento y derechos de imagen.
7. Registro de tratamientos y encargados aplicables.
8. Procedimiento de derechos, retirada de contenido, incidentes y conservación.

Todos requieren propietario, versión, fecha, fuente jurídica y aprobación. No se copiarán textos de terceros.

## Gate de publicación

Hasta completar y aprobar el intake:

- `robots.txt` bloquea crawling y las páginas emiten `noindex`.
- Sitemap, canonicales y JSON-LD públicos permanecen deshabilitados.
- No se cargan perfiles ni medios personales.
- Contacto y analítica permanecen vacíos/deshabilitados.
- Ningún build, test o PR cambia este estado.
