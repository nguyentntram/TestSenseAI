import { useCurrentUser } from '../../hooks/useCurrentUser.js'
import { Navigate, useLocation } from 'react-router-dom'

export default function AuthGuard({ children }) {
  const { status } = useCurrentUser()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (status === 'signed-out') {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return children
}
