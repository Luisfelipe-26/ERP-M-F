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
const Presupuesto = lazy(() => import('./pages/Presupuesto'))

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

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="campos" element={<Suspense fallback={<PageLoader />}><Campos /></Suspense>} />
          <Route path="trabajadores" element={<Suspense fallback={<PageLoader />}><Trabajadores /></Suspense>} />
          <Route path="productos" element={<Suspense fallback={<PageLoader />}><ProductosCrud /></Suspense>} />
          <Route path="inventario" element={<Suspense fallback={<PageLoader />}><Inventario /></Suspense>} />
          <Route path="actividades" element={<Suspense fallback={<PageLoader />}><Actividades /></Suspense>} />
          <Route path="ordenes" element={<Suspense fallback={<PageLoader />}><Ordenes /></Suspense>} />
          <Route path="ordenes/nueva" element={<Suspense fallback={<PageLoader />}><NuevaOrden /></Suspense>} />
          <Route path="ordenes/:editId/editar" element={<Suspense fallback={<PageLoader />}><NuevaOrden /></Suspense>} />
          <Route path="ordenes/:id" element={<Suspense fallback={<PageLoader />}><OrdenDetalle /></Suspense>} />
          <Route path="nomina" element={<Suspense fallback={<PageLoader />}><Nomina /></Suspense>} />
          <Route path="costos" element={<Suspense fallback={<PageLoader />}><CostosCampo /></Suspense>} />

          <Route path="clima" element={<Suspense fallback={<PageLoader />}><Clima /></Suspense>} />
          <Route path="sanidad" element={<Suspense fallback={<PageLoader />}><Sanidad /></Suspense>} />
          <Route path="riego" element={<Suspense fallback={<PageLoader />}><Riego /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
          <Route path="clientes" element={<Suspense fallback={<PageLoader />}><Clientes /></Suspense>} />
          <Route path="efectivo-banco" element={<Suspense fallback={<PageLoader />}><EfectivoBanco /></Suspense>} />
          <Route path="proveedores" element={<Suspense fallback={<PageLoader />}><Proveedores /></Suspense>} />
          <Route path="contabilidad" element={<Suspense fallback={<PageLoader />}><Contabilidad /></Suspense>} />
          <Route path="activos-fijos" element={<Suspense fallback={<PageLoader />}><ActivosFijos /></Suspense>} />
          <Route path="presupuesto" element={<Suspense fallback={<PageLoader />}><Presupuesto /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}