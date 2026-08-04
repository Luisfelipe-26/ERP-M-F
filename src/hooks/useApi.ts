import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api'

interface UseApiOptions {
  params?: Record<string, string | number>
  immediate?: boolean
}

/**
 * Hook genérico para consultas GET.
 * Retorna { data, loading, error, refetch }.
 */
export function useApi<T = any>(path: string, { params, immediate = true }: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)
  const paramsRef = useRef(params)
  paramsRef.current = params

  const execute = useCallback(async (overrideParams?: Record<string, string | number>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(path, { params: overrideParams ?? paramsRef.current })
      setData(res.data as T)
      return res.data as T
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al cargar datos'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    if (immediate) { execute() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return { data, loading, error, refetch: execute }
}
