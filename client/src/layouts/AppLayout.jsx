export function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-linen text-ink">
      <header className="border-b border-ink/10 bg-white/85 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <a className="text-lg font-bold tracking-normal text-ink" href="/">
            EventFlow
          </a>
          <div className="hidden items-center gap-6 text-sm font-medium text-ink/70 sm:flex">
            <a className="hover:text-ember" href="#events">
              Events
            </a>
            <a className="hover:text-ember" href="#operations">
              Operations
            </a>
            <a className="hover:text-ember" href="#bookings">
              Bookings
            </a>
          </div>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
