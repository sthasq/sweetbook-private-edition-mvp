import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { getAdminDashboard } from "../api/admin";
import AdminShell from "../components/AdminShell";
import type { AdminDashboard } from "../types/api";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminDashboard()
      .then(setDashboard)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : "대시보드를 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [navigate, location.pathname]);

  return (
    <AdminShell
      title="대시보드"
      description="플랫폼 전체 매출, 수수료, 주문 현황을 한눈에 확인하세요."
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-stone-200 bg-stone-100/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">{error}</div>
      ) : dashboard ? (
        <>
          <section>
            <p className="editorial-label">매출 현황</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="총 매출" value={formatCurrency(dashboard.totalRevenue)} hint="결제 완료 기준" accent />
              <MetricCard label="플랫폼 수수료" value={formatCurrency(dashboard.platformRevenue)} hint={`수수료율 ${(dashboard.commissionRate * 100).toFixed(0)}%`} />
              <MetricCard label="크리에이터 정산" value={formatCurrency(dashboard.creatorPayouts)} hint="정산 예정 합계" />
              <MetricCard label="총 주문" value={`${dashboard.totalOrders}건`} hint={dashboard.simulatedOrders > 0 ? `체험 ${dashboard.simulatedOrders}건 포함` : "전체 주문"} />
            </div>
          </section>

          <section className="mt-8">
            <p className="editorial-label">플랫폼 현황</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="공개 에디션" value={`${dashboard.activeEditions}개`} hint="현재 판매 중" />
              <MetricCard label="전체 회원" value={`${dashboard.totalUsers}명`} hint="팬 + 크리에이터 + 관리자" />
              <MetricCard label="크리에이터" value={`${dashboard.totalCreators}명`} hint="등록된 크리에이터" />
              <MetricCard label="수수료율" value={`${(dashboard.commissionRate * 100).toFixed(0)}%`} hint="현재 적용 중" />
            </div>
          </section>
        </>
      ) : null}
    </AdminShell>
  );
}

function MetricCard({ label, value, hint, accent = false }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-brand-300 bg-brand-50/60" : "border-stone-200 bg-stone-50/80"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${accent ? "text-brand-700" : "text-stone-900"}`}>{value}</p>
      <p className="mt-2 text-sm text-warm-500">{hint}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}
