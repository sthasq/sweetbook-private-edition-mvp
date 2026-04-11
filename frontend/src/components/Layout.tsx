import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const ROUTE_EXIT_MS = 180;
const ROUTE_ENTER_MS = 320;

type RouteTransitionState = "idle" | "entering" | "exiting";

export default function Layout() {
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const routeSignature = `${location.pathname}${location.search}${location.hash}`;
  const [transitionState, setTransitionState] =
    useState<RouteTransitionState>("entering");
  const [displayedRoute, setDisplayedRoute] = useState(routeSignature);

  useEffect(() => {
    if (displayedRoute === routeSignature) {
      return;
    }

    const transitionTimer = window.setTimeout(() => {
      setTransitionState("exiting");
    }, 0);

    const exitTimer = window.setTimeout(() => {
      setDisplayedRoute(routeSignature);
      setTransitionState("entering");
    }, ROUTE_EXIT_MS);

    return () => {
      window.clearTimeout(transitionTimer);
      window.clearTimeout(exitTimer);
    };
  }, [displayedRoute, routeSignature]);

  useEffect(() => {
    if (transitionState !== "entering") {
      return;
    }

    const enterTimer = window.setTimeout(() => {
      setTransitionState("idle");
    }, ROUTE_ENTER_MS);

    return () => window.clearTimeout(enterTimer);
  }, [displayedRoute, transitionState]);

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
      navItems.push({ to: "/studio/orders", label: "크리에이터 스튜디오" });
    }
    if (user.role === "ADMIN") {
      navItems.push({ to: "/admin/dashboard", label: "관리자 콘솔" });
    }
  }

  const isNavActive = (to: string) => {
    if (to === "/") {
      return pathname === "/";
    }

    if (to.startsWith("/studio")) {
      return pathname.startsWith("/studio");
    }

    if (to.startsWith("/admin")) {
      return pathname.startsWith("/admin");
    }

    return pathname === to || pathname.startsWith(`${to}/`);
  };

  const desktopLinkClass = (to: string) =>
    `font-headline text-base tracking-tight transition-colors ${
      isNavActive(to)
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
                PlayPick
              </span>
              <p className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500 md:block">
                크리에이터 포토북
              </p>
            </div>
            <span className="hidden rounded-sm bg-gold-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500 lg:inline-flex">
              PICK
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
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
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
                    isNavActive(item.to) ? "text-brand-700" : "text-warm-500"
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

      <main className="flex-1 overflow-x-hidden">
        <div
          key={displayedRoute}
          className="route-transition"
          data-route-transition-state={transitionState}
        >
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-stone-200/70 bg-surface-low py-12">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-8 px-6 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <p className="font-headline text-lg font-bold italic text-brand-700">
              PlayPick
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-warm-500">
              좋아하는 크리에이터의 포토북에 나만의 이야기를 더해 한 권으로 완성하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
            <Link to="/" className="transition hover:text-brand-700">
              에디션 둘러보기
            </Link>
            {user && (
              <Link to="/me/projects" className="transition hover:text-brand-700">
                내 프로젝트
              </Link>
            )}
            {user?.role === "CREATOR" && (
              <Link to="/studio/orders" className="transition hover:text-brand-700">
                크리에이터 스튜디오
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
