# Etapa: logotipo XL sin reflujo de la portada

Fecha de cierre local: 2026-09-01

## Cambio realizado

- El lockup de cabecera gana presencia únicamente en escritorio y tableta amplia.
- El isotipo pasa de 60 a 80 px y el nombre `PecadosVip` de 33.6 a 60.8 px en escritorio amplio.
- Entre 1101 y 1179 px el nombre usa 56 px para proteger la navegación completa; con la navegación compacta vuelve a 60.8 px.
- El subtítulo aumenta de 8.32 a 8.96 px para conservar su proporción visual.
- La cabecera permanece en 82 px y no cambia el tamaño ni la posición del hero, la navegación, los botones, la franja de confianza o las zonas.
- En 780 px o menos el isotipo usa 56 px y el nombre 27.2 px; en 360 px o menos bajan a 48 y 24 px para proteger la reserva y el menú.
- El recurso transparente real `app/icon.png` se solicita a 96 × 96 px para que el aumento conserve nitidez.

## Alcance

El cambio se limita al preview local y no activa reservas, contacto, pagos, analítica ni indexación. `productionActivation:false` permanece vigente.

## Cómo abrir el proyecto

1. Instala Node.js 22 y pnpm.
2. Abre PowerShell en la carpeta del proyecto.
3. Ejecuta `pnpm install --frozen-lockfile`.
4. Ejecuta `pnpm run dev:synthetic`.
5. Abre `http://localhost:3000/preview-local-sintetico?lang=es#inicio`.

Para GitHub o EasyPanel, sigue `LEEME_PRIMERO_SUBIR_PROYECTO.md` dentro del ZIP de esta etapa.

## Validación final

- Auditoría visual equivalente: 1916, 1180, 1179, 1132, 1101, 1100, 902, 781, 780, 390, 360 y 320 px.
- Solapamientos observados entre la marca y el siguiente control: 0.
- Cabecera: 82 px en escritorio y 70 px en móvil, sin cambios.
- Hero: conserva su posición inmediatamente después de la cabecera.
- ESLint focal y TypeScript completo: aprobados.
- Pruebas: 206/206 aprobadas.
- Build: cinco entornos Vinext aprobados; standalone generado y runtime preparado.
