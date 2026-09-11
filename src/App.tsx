import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Campos = lazy(() => import('./pages/Campos'))
const Trabajadores = lazy(() => import('./pages/Trabajadores'))
const Inventario = lazy(() => import('./pages/Inventario'))
const Actividades = lazy(() => import('./pages/Actividades'))
const ProductosCrud = lazy(() => import('./pages/ProductosCrud'))
const Ordenes = lazy(() => import('./pages/Ordenes'))
const OrdenDetalle = lazy(() => import('./pages/OrdenDetalle'))
const NuevaOrden = lazy(() => import('./pages/NuevaOrden'))
const Nomina = lazy(() => import('./pages/Nomina'))
const CostosCampo = lazy(() => import('./pages/CostosCampo'))

const Clima = lazy(() => import('./pages/Clima'))
const Sanidad = lazy(() => import('./pages/Sanidad'))
const Riego = lazy(() => import('./pages/Riego'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Clientes = lazy(() => import('./pages/Clientes'))
const EfectivoBanco = lazy(() => import('./pages/EfectivoBanco'))
const Proveedores = lazy(() => import('./pages/Proveedores'))
const Contabilidad = lazy(() => import('./pages/Contabilidad'))
const ActivosFijos = lazy(() => import('./pages/ActivosFijos'))
const Compras = lazy(() => import('./pages/Compras'))
const Presupuesto = lazy(() => import('./pages/Presupuesto'))
const Configuracion = lazy(() => import('./pages/Configuracion'))
const Administracion = lazy(() => import('./pages/Administracion'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
        <p style={{ fontSize: 15 }}>Cargando...</p>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PermissionRoute({ children, modulo = '', permisos = [] }: { children: any; modulo?: string; permisos?: string[] }) {
  const { isAuthenticated, hasModule, hasPermission } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const allowed = permisos
    ? permisos.some((p) => hasPermission(p))
    : modulo
      ? hasModule(modulo)
      : true
  if (!allowed) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center',
      }}>
        <div style={{ fontSize: 42 }}>🔒</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Sin acceso</h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
          No tienes permisos para acceder a este módulo.
        </p>
        <Navigate to="/" replace />
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="campos" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="campos"><Campos /></PermissionRoute></Suspense>} />
          <Route path="trabajadores" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="trabajadores"><Trabajadores /></PermissionRoute></Suspense>} />
          <Route path="productos" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="productos"><ProductosCrud /></PermissionRoute></Suspense>} />
          <Route path="inventario" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="inventario"><Inventario /></PermissionRoute></Suspense>} />
          <Route path="actividades" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="actividades"><Actividades /></PermissionRoute></Suspense>} />
          <Route path="ordenes" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="ordenes"><Ordenes /></PermissionRoute></Suspense>} />
          <Route path="ordenes/nueva" element={<Suspense fallback={<PageLoader />}><PermissionRoute permisos={['ordenes.create', 'ordenes.update']}><NuevaOrden /></PermissionRoute></Suspense>} />
          <Route path="ordenes/:editId/editar" element={<Suspense fallback={<PageLoader />}><PermissionRoute permisos={['ordenes.create', 'ordenes.update']}><NuevaOrden /></PermissionRoute></Suspense>} />
          <Route path="ordenes/:id" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="ordenes"><OrdenDetalle /></PermissionRoute></Suspense>} />
          <Route path="nomina" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="nomina"><Nomina /></PermissionRoute></Suspense>} />
          <Route path="costos" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="costos"><CostosCampo /></PermissionRoute></Suspense>} />

          <Route path="clima" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="clima"><Clima /></PermissionRoute></Suspense>} />
          <Route path="sanidad" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="sanidad"><Sanidad /></PermissionRoute></Suspense>} />
          <Route path="riego" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="riego"><Riego /></PermissionRoute></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="analytics"><Analytics /></PermissionRoute></Suspense>} />
          <Route path="clientes" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="clientes"><Clientes /></PermissionRoute></Suspense>} />
          <Route path="efectivo-banco" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="efectivo_banco"><EfectivoBanco /></PermissionRoute></Suspense>} />
          <Route path="proveedores" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="proveedores"><Proveedores /></PermissionRoute></Suspense>} />
          <Route path="compras" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="compras"><Compras /></PermissionRoute></Suspense>} />
          <Route path="contabilidad" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="contabilidad"><Contabilidad /></PermissionRoute></Suspense>} />
          <Route path="activos-fijos" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="activos_fijos"><ActivosFijos /></PermissionRoute></Suspense>} />
          <Route path="presupuesto" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="presupuesto"><Presupuesto /></PermissionRoute></Suspense>} />
          <Route path="configuracion" element={<Suspense fallback={<PageLoader />}><PermissionRoute modulo="configuracion"><Configuracion /></PermissionRoute></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<PageLoader />}><PermissionRoute permisos={['admin.read', 'admin.create', 'admin.update', 'admin.delete']}><Administracion /></PermissionRoute></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}