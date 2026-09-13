import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:logout'))
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

/**
 * Mensaje de error accionable a partir de un fallo de axios.
 *
 * Un "Error cargando X" genérico no distingue entre el servidor caído, un backend
 * desactualizado que revienta con 500, y simplemente no tener permiso: todos se ven
 * igual y obligan a abrir la consola para averiguarlo.
 */
export function apiError(err: any, contexto: string): string {
  const status = err?.response?.status
  if (!status) return `${contexto}: el servidor no respondió`

  const detail = err?.response?.data?.detail
  const msg = typeof detail === 'string' ? detail : detail?.detail
  if (status >= 500) return `${contexto}: el servidor falló (HTTP ${status}) — puede estar desactualizado`
  if (status === 403) return `${contexto}: no tienes permiso`
  if (status === 404) return `${contexto}: la ruta no existe en el servidor (HTTP 404)`
  return msg ? `${contexto}: ${msg}` : `${contexto} (HTTP ${status})`
}

export default api
