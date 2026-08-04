export const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
export const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
export const CHART_COLORS = ['#2D6A4F', '#219EBC', '#F4A261', '#E76F51', '#6366F1', '#94A3B8']
export const STATUS_COLORS: Record<string, string> = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }

export const fmt = (n: number | null | undefined): string =>
  `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0 })}`

export const fmtK = (n: number | null | undefined): string => {
  const v = Number(n || 0)
  return v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0)
}

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos Días'
  if (h < 18) return 'Buenas Tardes'
  return 'Buenas Noches'
}

export function getDateStr(): string {
  const d = new Date()
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
