import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Campos from './pages/Campos'
import Trabajadores from './pages/Trabajadores'
import Inventario from './pages/Inventario'
import Actividades from './pages/Actividades'
import ProductosCrud from './pages/ProductosCrud'
import Ordenes from './pages/Ordenes'
import OrdenDetalle from './pages/OrdenDetalle'
import NuevaOrden from './pages/NuevaOrden'
import Nomina from './pages/Nomina'
import CostosCampo from './pages/CostosCampo'
import Compras from './pages/Compras'
import Clima from './pages/Clima'
import Sanidad from './pages/Sanidad'
import Riego from './pages/Riego'
import Analytics from './pages/Analytics'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="campos" element={<Campos />} />
          <Route path="trabajadores" element={<Trabajadores />} />
          <Route path="productos" element={<ProductosCrud />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="actividades" element={<Actividades />} />
          <Route path="ordenes" element={<Ordenes />} />
          <Route path="ordenes/nueva" element={<NuevaOrden />} />
          <Route path="ordenes/:editId/editar" element={<NuevaOrden />} />
          <Route path="ordenes/:id" element={<OrdenDetalle />} />
          <Route path="nomina" element={<Nomina />} />
          <Route path="costos" element={<CostosCampo />} />
          <Route path="compras" element={<Compras />} />
          <Route path="clima" element={<Clima />} />
          <Route path="sanidad" element={<Sanidad />} />
          <Route path="riego" element={<Riego />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
