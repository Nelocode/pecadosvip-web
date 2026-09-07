# Guía muy fácil para subir PecadosVip

Esta versión publica una **beta sintética, no indexable y sin canales comerciales**. Inicio, seis perfiles ficticios y el catálogo de servicios funcionan en español, inglés, francés e italiano. Contacto, reservas, pagos, analítica y administración continúan cerrados.

## 1. Abrir el proyecto en este PC

1. Descomprime el ZIP en una carpeta nueva.
2. Abre PowerShell dentro de esa carpeta.
3. Ejecuta, una línea cada vez:

       corepack enable
       pnpm install --frozen-lockfile
       pnpm run release:verify
       pnpm run dev

4. Abre `http://localhost:3000/es`. Cambia `es` por `en`, `fr` o `it` para revisar los demás idiomas.
5. Detén el servidor con `Ctrl+C`.

No introduzcas datos, fotografías, teléfonos ni credenciales reales. Las traducciones automáticas son funcionales, pero requieren revisión lingüística humana antes de cualquier oferta comercial.

## 2. Guardar el código en GitHub

Si el repositorio ya existe, la vía segura es clonarlo primero:

    git clone https://github.com/Nelocode/pecadosvip.git
    cd pecadosvip

Copia dentro el contenido descomprimido, revisa los cambios y ejecuta:

    git status --short
    git add .
    git commit -m "Actualizar beta sintética PecadosVip"
    git push origin main

No uses `--force` ni subas archivos `.env`, llaves, copias de seguridad, datos privados o ZIPs. Antes del push confirma el repositorio, la rama y la visibilidad esperada.

Para un repositorio nuevo y vacío:

    git init
    git add .
    git commit -m "Crear beta sintética PecadosVip"
    git branch -M main
    git remote add origin URL_DEL_REPOSITORIO
    git push -u origin main

## 3. Desplegar en EasyPanel con Dockerfile

1. Conecta el repositorio y selecciona la rama/commit exactos.
2. Configura:

       Build context / Root directory: /
       Dockerfile: Dockerfile
       Container port: 3000

3. Despliega y espera a que la construcción y el healthcheck terminen.
4. Comprueba en la URL pública:

   - `/` redirige a `/es`;
   - `/es`, `/en`, `/fr` y `/it` responden correctamente;
   - perfiles y servicios usan rutas limpias, por ejemplo `/es/perfiles/sofia` y `/es/servicios/compania-privada`;
   - `robots.txt` bloquea el rastreo y el sitemap está vacío;
   - `/preview-local-sintetico`, `/admin` y las APIs de contacto, reserva, pago y analítica responden 404;
   - no existen formularios ni botones comerciales habilitados.

El error `open Dockerfile: no such file or directory` significa que EasyPanel está construyendo una rama, commit o directorio raíz que no contiene el `Dockerfile` esperado.

## 4. Qué falta antes de una web comercial

La beta técnica no acredita cumplimiento legal ni aprobación comercial. Antes de activar contacto, reservas, pagos, analítica o indexación deben aprobarse, como mínimo:

- identidad y datos de contacto del operador;
- textos legales y de privacidad aplicables;
- base y mecanismo de consentimiento cuando corresponda;
- derechos de imagen y contenido final;
- disponibilidad, cobertura, precios y condiciones reales;
- revisión lingüística humana ES/EN/FR/IT;
- accesibilidad, seguridad y UAT en el entorno definitivo.

## Regla corta

- Beta sintética pública: habilitada, señalizada y `noindex`.
- Oferta comercial y canales de conversión: desactivados.
- El ZIP: copia local verificable; no despliega por sí solo.
