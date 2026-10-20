# Calculadora de costos NIO

Calculadora estática (GitHub Pages) de costos **directos e indirectos** para NIO. Sustituye a la calculadora Flask de [`niocalculator`](https://github.com/sebastiux/niocalculator) y corre 100% en el navegador.

## Qué calcula

| Pestaña | Contenido |
| --- | --- |
| Resumen | Ingresos, costos directos/indirectos, utilidad neta, economía por licencia |
| Directos e indirectos | Desglose anual editable: nómina con carga social, herramientas, costos por licencia |
| IA · Grok | Costo por solicitud con precios xAI (grok-4.3 por defecto), caché, razonamiento, contexto largo ≥ 200k y tope de crédito por usuario |
| Railway | Modelo por recursos (vCPU, RAM, egress, volumen) por servicio, plan Hobby/Pro y calibración con tu factura real |
| Fiscal | RESICO PF, PF Actividad Empresarial y Persona Moral en base anual + IVA |
| Equilibrio y escenarios | Punto de equilibrio (bruto, neto, recuperar inversión), gráfica ingresos vs costos y tabla de escenarios |

La configuración se guarda en el navegador; **Compartir** copia un enlace con todos los parámetros y **CSV** exporta el desglose.

## Cómo se calcula Railway

En lugar de un costo fijo por cada 100 usuarios, cada servicio (MySQL, servicio Grok, Auth, frontend) tiene:

- vCPU y RAM en reposo por réplica (de la pestaña *Metrics* sin tráfico),
- ms de CPU por request y MB de RAM por usuario simultáneo,
- requests por usuario al día y por solicitud de IA,
- KB de egress por request y KB almacenados por usuario/interacción.

Con el tráfico (DAU, días con clases, horas de actividad, minutos por sesión) se calculan requests, usuarios simultáneos (ley de Little) y consumo. Precios: $20/vCPU-mes, $10/GB RAM-mes, $0.05/GB egress, $0.15/GB volumen; factura = cuota del plan + max(0, uso − crédito incluido).

**Calibración:** captura el costo real por recurso de un mes del panel *Usage* y los usuarios activos de ese mes; el modelo se escala para reproducir esa factura exacta.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas del motor de cálculo (Vitest)
npm run build    # genera dist/
```

Stack: Vite 7 · React 19 · TypeScript · Tailwind CSS 4 · Recharts. El motor de cálculo está en `src/lib/` y no depende de React.

## Publicar en GitHub Pages

1. En el repo: **Settings → Pages → Source: GitHub Actions**.
2. Haz push a `main` (o ejecuta el workflow *Deploy a GitHub Pages* desde la pestaña Actions).
3. El sitio queda en `https://sebastiux.github.io/calculadoranio/`.
