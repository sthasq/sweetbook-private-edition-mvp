import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { getAdminOrders } from "../api/admin";
import AdminShell from "../components/AdminShell";
import type { AdminOrderSummary } from "../types/api";
import { fulfillmentStatusLabel, siteOrderLabel } from "../lib/sweetbookWorkflow";

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminOrders()
      .then(setOrders)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : "주문 목록을 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [navigate, location.pathname]);

  return (
    <AdminShell
      title="주문 관리"
      description="플랫폼 전체 주문을 확인하고, 주문별 수수료 분배 내역을 조회합니다."
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-stone-200 bg-stone-100/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">{error}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-500">
          아직 접수된 주문이 없어요.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.siteOrderUid} order={order} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function OrderCard({ order }: { order: AdminOrderSummary }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-stone-900">{order.editionTitle}</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-warm-500">
              #{order.projectId}
            </span>
            {order.simulated && (
              <span className="rounded-full bg-gold-400/15 px-2.5 py-1 text-[11px] font-medium text-gold-600">체험</span>
            )}
          </div>
          <p className="mt-2 text-sm text-stone-600">
            <span className="font-medium text-stone-900">{order.creatorName}</span> 에디션 ·{" "}
            <span className="font-medium text-stone-900">{order.fanDisplayName}</span> → {order.recipientName}
          </p>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-lg font-semibold text-stone-900">{fmt(order.totalAmount)}</p>
          <p className="mt-1 text-xs text-stone-500">{fmtDate(order.orderedAt)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">플랫폼 수수료</p>
          <p className="mt-2 font-medium text-rose-600">{fmt(order.platformFee)}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">크리에이터 몫</p>
          <p className="mt-2 font-medium text-brand-700">{fmt(order.creatorPayout)}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">수수료율</p>
          <p className="mt-2 font-medium text-stone-900">{(order.commissionRate * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill label={siteOrderLabel(order.siteOrderStatus)} tone="emerald" />
        <Pill label={fulfillmentStatusLabel(order.fulfillmentStatus)} tone={order.fulfillmentStatus === "FAILED" ? "rose" : "stone"} />
        {order.paymentMethod && <Pill label={order.paymentMethod} tone="stone" />}
        <Pill label={`${order.quantity}권`} tone="stone" />
      </div>
    </article>
  );
}

function Pill({ label, tone }: { label: string; tone: "emerald" | "rose" | "stone" }) {
  const cls =
    tone === "emerald" ? "bg-emerald-50 text-emerald-700"
    : tone === "rose" ? "bg-rose-50 text-rose-700"
    : "bg-white text-stone-600";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${cls}`}>{label}</span>;
}

function fmt(v: number) { return `${Math.round(v).toLocaleString("ko-KR")}원`; }
function fmtDate(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString("ko-KR");
}
