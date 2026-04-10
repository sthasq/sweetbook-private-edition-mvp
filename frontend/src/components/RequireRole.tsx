import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Spinner from "./Spinner";
import type { AuthUser } from "../types/api";

export default function RequireRole({
  role,
}: {
  role: AuthUser["role"];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (user.role !== role) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <div className="rounded-3xl border border-stone-200 bg-white/90 px-8 py-12 shadow-sm shadow-brand-100/30">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-400">
          접근 제한
        </p>
        <h1 className="mt-4 text-3xl font-bold text-stone-900">
          이 화면은 크리에이터 전용입니다
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          지금 계정으로는 크리에이터 스튜디오에 들어갈 수 없어요.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          홈으로 돌아가기
        </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
