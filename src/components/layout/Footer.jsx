export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#09090f]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} TestSense AI. Built for a hackathon prototype.</p>
      </div>
    </footer>
  )
}
