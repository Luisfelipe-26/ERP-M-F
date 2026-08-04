# CORVUS ERP — Frontend

Sistema de Gestión de Finca de Aguacates. Frontend del ERP para Inversiones Corvus, Rancho Arriba.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 19 |
| Build | Vite 8 |
| Estilos | Tailwind CSS 4 |
| Gráficos | Recharts |
| Router | React Router 7 |
| HTTP | Axios |
| Iconos | Lucide React |
| Notificaciones | react-hot-toast |

## Estructura

```
src/
├── main.jsx                 # Punto de entrada
├── App.jsx                  # Rutas + PrivateRoute (JWT)
├── api.js                   # Axios instance + interceptors
├── index.css                # Estilos globales + utilidades
├── components/
│   └── Layout.jsx           # Sidebar + navegación
└── pages/
    ├── Login.jsx            # Autenticación JWT
    ├── Dashboard.jsx        # KPIs, clima, sanidad, riego, gráficos
    ├── Campos.jsx           # CRUD de campos/bloques
    ├── Trabajadores.jsx     # Gestión de trabajadores
    ├── ProductosCrud.jsx    # CRUD de productos (inventario)
    ├── Inventario.jsx       # Movimientos de inventario
    ├── Actividades.jsx      # Catálogo de actividades
    ├── Ordenes.jsx          # Órdenes de trabajo (tabla, filtros, exportación)
    ├── NuevaOrden.jsx       # Crear/editar/duplicar OT
    ├── OrdenDetalle.jsx     # Detalle de OT
    ├── Nomina.jsx           # Nómina de jornales
    ├── CostosCampo.jsx      # Matriz, detalle y gráficos de costos
    ├── Compras.jsx          # Órdenes de compra (OC)
    ├── Clima.jsx            # Datos meteorológicos
    ├── Sanidad.jsx          # Manejo Integrado de Plagas (MIP)
    ├── Riego.jsx            # Gestión de riego
    └── Analytics.jsx        # Analíticas avanzadas
```

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

Crear archivo `.env` con la URL de la API:

```
VITE_API_URL=https://api.corvus.do
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (HMR) |
| `npm run build` | Build de producción |
| `npm run preview` | Previsualizar build |
| `npm run lint` | ESLint |

## API

El frontend consume una API REST con autenticación JWT. Endpoints principales:

| Ruta | Descripción |
|---|---|
| `POST /auth/login` | Login (email + password → token) |
| `GET /dashboard/stats` | KPIs del dashboard |
| `GET /dashboard/briefing` | Resumen clima/sanidad/riego |
| `GET /dashboard/campo-status` | Estado por campo |
| `GET /dashboard/nomina-mensual` | Nómina del mes |
| `CRUD /campos` | Gestión de campos |
| `CRUD /productos` | Gestión de productos |
| `CRUD /ordenes` | Órdenes de trabajo |
| `CRUD /compras` | Órdenes de compra |
| `GET /reportes/costos-campo-actividad` | Matriz de costos |

El interceptor de Axios inyecta automáticamente el token JWT en cada request y redirige al login si recibe un 401.

## Licencia

Privado — Inversiones Corvus.