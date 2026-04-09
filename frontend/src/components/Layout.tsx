import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      setMenuOpen(false);
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
    }
  }

  const navItems = [{ to: "/", label: "Home" }];

  if (user) {
    navItems.push({ to: "/me/projects", label: "My Projects" });
    if (user.role === "CREATOR") {
      navItems.push({ to: "/studio", label: "Creator Studio" });
    }
  }

  return (
    <div className="min-h-screen flex flex-col text-stone-900">
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setMenuOpen(false)}>
            <span className="text-brand-700 text-xl font-bold tracking-tight">
              Private Edition
            </span>
            <span className="hidden xs:inline text-[10px] font-semibold tracking-widest uppercase text-gold-400 border border-gold-400/40 rounded px-1.5 py-0.5 leading-none">
              Official
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`transition-colors hover:text-brand-600 ${pathname === item.to ? "text-brand-700 font-medium" : "text-stone-500"}`}
              >
                {item.label}
              </Link>
            ))}
            {!loading && !user && (
              <>
                <Link
                  to="/login"
                  className={`transition-colors hover:text-brand-600 ${pathname === "/login" ? "text-brand-700 font-medium" : "text-stone-500"}`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className={`transition-colors hover:text-brand-600 ${pathname === "/signup" ? "text-brand-700 font-medium" : "text-stone-500"}`}
                >
                  Signup
                </Link>
              </>
            )}
            {!loading && user && (
              <>
                <span className="text-xs text-stone-500">
                  {user.displayName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-stone-500 transition-colors hover:text-brand-600"
                >
                  Logout
                </button>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 text-stone-500 hover:text-brand-600"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-stone-100 bg-white/95 px-6 py-4 space-y-4 shadow-xl animate-in slide-in-from-top-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`block text-sm transition-colors hover:text-brand-600 ${pathname === item.to ? "text-brand-700 font-medium" : "text-stone-500"}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-stone-100 flex flex-col gap-4">
              {!loading && !user && (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm text-stone-500 hover:text-brand-600"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm text-stone-500 hover:text-brand-600"
                  >
                    Signup
                  </Link>
                </>
              )}
              {!loading && user && (
                <>
                  <div className="text-xs text-stone-400">Signed in as {user.displayName}</div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-left text-sm text-stone-500 hover:text-brand-600"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white/60 py-8 text-center text-xs text-stone-500">
        <p>&copy; {new Date().getFullYear()} Private Edition &middot; Powered by Sweetbook Book Print API</p>
      </footer>
    </div>
  );
}
