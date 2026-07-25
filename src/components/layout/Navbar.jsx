import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Sparkles, LogOut } from 'lucide-react'
import { useCurrentUser } from '../../hooks/useCurrentUser.js'
import { beginGitHubLogin, logout } from '../../services/api.js'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const { user, status, refresh } = useCurrentUser()

  async function handleSignIn() {
    await beginGitHubLogin('/projects')
    refresh()
  }

  async function handleSignOut() {
    await logout()
    refresh()
    navigate('/')
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Main"
      >
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md text-lg font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          TestSense AI
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {status === 'signed-in' && (
            <Link
              to="/connect-repository"
              className="ml-2 inline-flex items-center rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Connect Repository
            </Link>
          )}

          {status === 'signed-in' && (
            <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-3">
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.githubUsername}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <LogOut size={14} aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Sign out</span>
              </button>
            </div>
          )}

          {status === 'signed-out' && (
            <button
              type="button"
              onClick={handleSignIn}
              className="ml-2 inline-flex items-center rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
