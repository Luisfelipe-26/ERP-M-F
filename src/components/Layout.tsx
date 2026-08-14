import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MapPin, Users, Package, Wrench, ClipboardList, LogOut, Leaf,
  DollarSign, TrendingUp, Warehouse, CloudSun, Bug, Droplets, BarChart3,
  UserCheck, Landmark, Truck, BookOpen
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/ordenes', icon: ClipboardList, label: 'Órdenes de Trabajo' },
  { to: '/costos', icon: TrendingUp, label: 'Costos por Campo' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/nomina', icon: DollarSign, label: 'Nómina' },
  { divider: true, label: 'AGRONÓMICO' },
  { to: '/clima', icon: CloudSun, label: 'Clima' },
  { to: '/sanidad', icon: Bug, label: 'Sanidad (MIP)' },
  { to: '/riego', icon: Droplets, label: 'Riego' },
  { divider: true, label: 'FINANZAS' },
  { to: '/contabilidad', icon: BookOpen, label: 'Contabilidad' },
  { to: '/clientes', icon: UserCheck, label: 'Clientes' },
  { to: '/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/efectivo-banco', icon: Landmark, label: 'Efectivo y Banco' },
  { divider: true, label: 'MAESTROS' },
  { to: '/campos', icon: MapPin, label: 'Campos' },
  { to: '/trabajadores', icon: Users, label: 'Trabajadores' },
  { to: '/productos', icon: Package, label: 'Productos' },
  { to: '/inventario', icon: Warehouse, label: 'Inventario' },
  { to: '/actividades', icon: Wrench, label: 'Actividades' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'linear-gradient(180deg, #14532d 0%, #166534 100%)',
        display: 'flex', flexDirection: 'column', padding: '24px 12px', flexShrink: 0,
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 10, overflowY: 'auto'
      }}>
        <div style={{ padding: '0 8px 28px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Leaf size={20} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>CORVUS</div>
              <div style={{ color: '#86efac', fontSize: 11 }}>Finca de Aguacates</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((item, i) =>
            item.divider ? (
              <div key={i} style={{
                color: '#86efac', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                padding: '14px 16px 4px', textTransform: 'uppercase', opacity: 0.7
              }}>{item.label}</div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <item.icon size={18} />
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
          <div style={{ padding: '8px 16px', marginBottom: 8 }}>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{user.nombre}</div>
            <div style={{ color: '#86efac', fontSize: 11, textTransform: 'capitalize' }}>{user.rol}</div>
          </div>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: '32px', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
