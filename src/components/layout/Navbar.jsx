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
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090f]/70 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3 sm:px-6 lg:px-8" aria-label="Main">

        {/* Left — Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold text-white focus-visible:outline-none"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600">
            <Sparkles size={14} aria-hidden="true" />
          </span>
          TestSense<span className="text-white/30 font-normal ml-0.5">AI</span>
        </Link>

        {/* Center — Nav links */}
        <nav className="hidden sm:flex flex-1 items-center justify-center gap-0.5" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `px-3.5 py-1.5 text-sm transition-colors rounded-md focus-visible:outline-none ${
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/80'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right — Actions */}
        <div className="ml-auto flex items-center gap-2">

          {status === 'signed-in' && (
            <>
              <span className="hidden text-sm text-white/30 sm:inline select-none">
                {user.githubUsername}
              </span>
              <Link
                to="/connect-repository"
                className="rounded-md border border-white/10 bg-white/6 px-3.5 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                Connect Repo
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-white/30 transition-colors hover:bg-white/5 hover:text-white/60 focus-visible:outline-none"
              >
                <LogOut size={13} aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Sign out</span>
              </button>
            </>
          )}

          {status === 'signed-out' && (
            <>
              <button
                type="button"
                onClick={handleSignIn}
                className="px-3.5 py-1.5 text-sm text-white/40 transition-colors hover:text-white focus-visible:outline-none"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={handleSignIn}
                className="rounded-md bg-white px-3.5 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90 focus-visible:outline-none"
              >
                Get started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
