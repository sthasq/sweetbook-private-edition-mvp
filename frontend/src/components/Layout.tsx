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

  const navItems = [{ to: "/", label: "홈" }];

  if (user) {
    navItems.push({ to: "/me/projects", label: "내 프로젝트" });
    if (user.role === "CREATOR") {
      navItems.push({ to: "/studio", label: "크리에이터 스튜디오" });
    }
  }

  const desktopLinkClass = (to: string) =>
    `font-headline text-base tracking-tight transition-colors ${
      pathname === to
        ? "border-b-2 border-brand-700 pb-1 text-brand-700"
        : "text-warm-500 hover:text-brand-700"
    }`;

  return (
    <div className="flex min-h-screen flex-col text-stone-900">
      <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-screen-2xl items-center justify-between px-6 md:px-8">
          <Link to="/" className="flex items-center gap-3 group" onClick={() => setMenuOpen(false)}>
            <div>
              <span className="font-headline text-2xl font-bold italic tracking-tight text-brand-700">
                Private Edition
              </span>
              <p className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500 md:block">
                Creator-certified private archive
              </p>
            </div>
            <span className="hidden rounded-sm bg-gold-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500 lg:inline-flex">
              Official
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={desktopLinkClass(item.to)}
              >
                {item.label}
              </Link>
            ))}
            {!loading && !user && (
              <>
                <Link to="/login" className={desktopLinkClass("/login")}>
                  로그인
                </Link>
                <Link to="/signup" className="editorial-button-secondary px-4 py-2.5 text-xs uppercase tracking-[0.2em]">
                  회원가입
                </Link>
              </>
            )}
            {!loading && user && (
              <>
                <span className="text-xs uppercase tracking-[0.18em] text-warm-500">
                  {user.displayName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-warm-500 transition-colors hover:text-brand-700"
                >
                  로그아웃
                </button>
              </>
            )}
          </nav>

          <button
            type="button"
            className="rounded bg-white/80 p-2 text-warm-500 transition hover:text-brand-700 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-stone-200/70 bg-white/95 px-6 py-5 md:hidden">
            <div className="space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`block font-headline text-base transition-colors ${
                    pathname === item.to ? "text-brand-700" : "text-warm-500"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-stone-200/70 pt-4">
                {!loading && !user && (
                  <div className="space-y-4">
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="block text-sm text-warm-500"
                    >
                      로그인
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="editorial-button-secondary w-full justify-center"
                    >
                      회원가입
                    </Link>
                  </div>
                )}
                {!loading && user && (
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-warm-500">
                      {user.displayName}
                    </p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-left text-sm text-warm-500"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200/70 bg-surface-low py-12">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-8 px-6 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <p className="font-headline text-lg font-bold italic text-brand-700">
              Private Edition
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-warm-500">
              공식 에디션과 개인의 기억을 한 권의 인쇄물로 남기는 프라이빗 팬북 서비스.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
            <Link to="/" className="transition hover:text-brand-700">
              Browse Editions
            </Link>
            <Link to="/studio" className="transition hover:text-brand-700">
              Creator Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
