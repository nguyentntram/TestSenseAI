import { Link, useSearchParams } from 'react-router-dom'
import { GitBranch, Database, FlaskConical, Check, X, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react'
import Button from '../components/common/Button.jsx'
import PageContainer from '../components/common/PageContainer.jsx'
import { useCurrentUser } from '../hooks/useCurrentUser.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { beginGitHubLogin } from '../services/api.js'

const STEPS = [
  {
    icon: GitBranch,
    title: 'Connect a repository',
    description:
      'Point TestSense AI at a GitHub repository so it can see your code, tests, and pull request history.',
  },
  {
    icon: Database,
    title: 'Build repository memory',
    description:
      'It studies past bug fixes, PR discussions, and testing conventions to build a memory of how your team tests things.',
  },
  {
    icon: FlaskConical,
    title: 'Generate context-aware tests',
    description:
      'For every new pull request, it drafts unit and integration tests informed by that repository memory — not generic guesses.',
  },
]

const COMPARISON = [
  {
    title: 'Generic AI test generators',
    tone: 'neutral',
    points: [
      { included: false, text: 'Writes tests based only on the current diff' },
      { included: false, text: 'Repeats mistakes already fixed elsewhere in the repo' },
      { included: false, text: 'Ignores existing testing conventions and helpers' },
    ],
  },
  {
    title: 'Repository-aware tests (TestSense AI)',
    tone: 'accent',
    points: [
      { included: true, text: 'Learns from historical bug fixes and past pull requests' },
      { included: true, text: 'Follows the repository\'s existing test patterns and helpers' },
      { included: true, text: 'Targets the edge cases your team has actually hit before' },
    ],
  },
]

const AUTH_ERROR_MESSAGES = {
  missing_parameters: 'GitHub sign-in did not complete — some information was missing. Please try again.',
  invalid_state: 'Your sign-in session expired or looked invalid. Please try again.',
  oauth_failed: 'We couldn\'t complete GitHub sign-in. Please try again.',
}

const DEMO_CODE = `// Generated for PR #247: Add payment retry logic
describe('PaymentService.retryOnFailure', () => {
  it('retries up to 3 times on transient errors', async () => {
    const mockCharge = jest.fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValue({ status: 'succeeded' })

    const result = await PaymentService.charge(mockCharge, amount)

    expect(mockCharge).toHaveBeenCalledTimes(3)
    expect(result.status).toBe('succeeded')
  })

  it('throws after exceeding retry limit', async () => {
    // Edge case your team hit in PR #198
    const mockCharge = jest.fn()
      .mockRejectedValue(new NetworkError())

    await expect(PaymentService.charge(mockCharge, amount))
      .rejects.toThrow('Max retries exceeded')
  })
})`

export default function LandingPage() {
  usePageTitle()
  const { status } = useCurrentUser()
  const [searchParams] = useSearchParams()
  const authError = searchParams.get('auth_error')

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-grid">
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute top-20 right-0 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="pointer-events-none absolute top-40 left-0 h-64 w-64 rounded-full bg-indigo-900/20 blur-3xl" />

        <PageContainer className="relative pb-20 pt-20 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            {/* Pill badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
              <Sparkles size={13} aria-hidden="true" />
              AI-powered test generation that learns your codebase
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl leading-tight">
              Generate tests that{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                understand
              </span>{' '}
              your codebase.
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-400">
              TestSense AI is an AI testing assistant that learns from a repository&rsquo;s
              historical tests, bug fixes, and pull requests — then uses that memory to
              generate meaningful tests for new pull requests.
            </p>

            {authError && (
              <div className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-sm text-red-400">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{AUTH_ERROR_MESSAGES[authError] ?? AUTH_ERROR_MESSAGES.oauth_failed}</span>
              </div>
            )}

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {status === 'signed-in' ? (
                <Button as={Link} to="/connect-repository" size="lg">
                  Connect a Repository
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              ) : (
                <Button onClick={() => beginGitHubLogin('/projects')} size="lg">
                  Sign in with GitHub
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              )}
              <Button as={Link} to="/projects" variant="secondary" size="lg">
                View Projects
              </Button>
            </div>
          </div>

          {/* Terminal code preview */}
          <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-white/8 bg-[#0f0f1a] shadow-2xl shadow-indigo-950/40 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/5 bg-[#13131f] px-5 py-3.5">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-xs font-mono text-slate-500">payment.test.ts — generated by TestSense AI</span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Ready
              </span>
            </div>
            <pre className="overflow-x-auto p-6 text-xs leading-loose text-emerald-300 font-mono">
              {DEMO_CODE}
            </pre>
          </div>
        </PageContainer>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5" aria-labelledby="how-it-works-heading">
        <PageContainer className="py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-indigo-400 tracking-widest uppercase mb-3">How it works</p>
            <h2 id="how-it-works-heading" className="text-3xl font-bold text-white">
              Three steps to smarter tests
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="group relative rounded-2xl border border-white/8 bg-white/3 p-6 transition-all hover:border-white/15 hover:bg-white/5"
              >
                <div className="absolute top-6 right-6 text-5xl font-black text-white/4 select-none">
                  {index + 1}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 text-indigo-400 mb-4">
                  <step.icon size={20} aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold text-indigo-500 tracking-widest uppercase mb-1">
                  Step {index + 1}
                </p>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Comparison */}
      <section className="border-t border-white/5" aria-labelledby="comparison-heading">
        <PageContainer className="py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-indigo-400 tracking-widest uppercase mb-3">Why TestSense AI</p>
            <h2 id="comparison-heading" className="text-3xl font-bold text-white">
              Not just another AI test generator
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {COMPARISON.map((column) => (
              <div
                key={column.title}
                className={`relative rounded-2xl border p-7 overflow-hidden ${
                  column.tone === 'accent'
                    ? 'border-indigo-500/30 bg-indigo-500/5'
                    : 'border-white/8 bg-white/3'
                }`}
              >
                {column.tone === 'accent' && (
                  <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-600/15 blur-3xl" />
                )}
                <h3 className={`text-base font-semibold mb-5 ${column.tone === 'accent' ? 'text-white' : 'text-slate-500'}`}>
                  {column.title}
                </h3>
                <ul className="space-y-3.5">
                  {column.points.map((point) => (
                    <li key={point.text} className="flex items-start gap-3 text-sm">
                      {point.included ? (
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                          <Check size={12} aria-hidden="true" />
                        </span>
                      ) : (
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-600">
                          <X size={12} aria-hidden="true" />
                        </span>
                      )}
                      <span className={point.included ? 'text-slate-300' : 'text-slate-600'}>
                        {point.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <p className="text-slate-400">Ready to give your tests real context?</p>
              {status === 'signed-in' ? (
                <Button as={Link} to="/connect-repository" size="lg">
                  Connect your first repository
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              ) : (
                <Button onClick={() => beginGitHubLogin('/projects')} size="lg">
                  Get started free
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  )
}
