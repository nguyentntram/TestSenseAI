import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser } from '../services/api.js'

// Shared auth-status hook. `status` is 'loading' | 'signed-in' | 'signed-out'
// — a failed lookup (backend down, network error) is treated the same as
// 'signed-out' for UI purposes, since every page that cares about auth
// already has its own error/loading state for the data it actually needs.
export function useCurrentUser() {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  const refresh = useCallback(async () => {
    setStatus('loading')
    try {
      const current = await getCurrentUser()
      setUser(current)
      setStatus(current ? 'signed-in' : 'signed-out')
    } catch {
      setUser(null)
      setStatus('signed-out')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const current = await getCurrentUser()
        if (cancelled) return
        setUser(current)
        setStatus(current ? 'signed-in' : 'signed-out')
      } catch {
        if (cancelled) return
        setUser(null)
        setStatus('signed-out')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { user, status, refresh }
}
