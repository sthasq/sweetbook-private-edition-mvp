import { Link, Outlet, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/studio", label: "Creator Studio" },
];

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-brand-400 text-xl font-bold tracking-tight">
              Private Edition
            </span>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-gold-400 border border-gold-400/40 rounded px-1.5 py-0.5 leading-none">
              Official
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`transition-colors hover:text-brand-300 ${pathname === item.to ? "text-brand-400 font-medium" : "text-neutral-400"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-800 py-8 text-center text-xs text-neutral-500">
        <p>&copy; {new Date().getFullYear()} Private Edition &middot; Powered by Sweetbook Book Print API</p>
      </footer>
    </div>
  );
}
