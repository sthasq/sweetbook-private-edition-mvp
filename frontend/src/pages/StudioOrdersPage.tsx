import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { getStudioOrderDashboard, listStudioEditions } from "../api/studio";
import { getSweetbookIntegrationStatus } from "../api/sweetbook";
import PaginationControls from "../components/PaginationControls";
import StudioShell from "../components/StudioShell";
import type {
  StudioEditionSummary,
  StudioOrderDashboard,
  StudioOrderSummary,
  SweetbookIntegrationStatus,
} from "../types/api";
import { paginateItems } from "../lib/pagination";
import {
  fulfillmentEventLabel,
  fulfillmentStatusLabel,
  integrationTone,
  siteOrderLabel,
} from "../lib/sweetbookWorkflow";
import { resolveMediaUrl } from "../lib/appPaths";

const EDITIONS_PAGE_SIZE = 4;
const RECENT_ORDERS_PAGE_SIZE = 6;

export default function StudioOrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderDashboard, setOrderDashboard] = useState<StudioOrderDashboard | null>(null);
  const [studioEditions, setStudioEditions] = useState<StudioEditionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [integrationStatus, setIntegrationStatus] =
    useState<SweetbookIntegrationStatus | null>(null);
  const [editionPage, setEditionPage] = useState(1);
  const [recentOrdersPage, setRecentOrdersPage] = useState(1);

  useEffect(() => {
    getStudioOrderDashboard()
      .then(setOrderDashboard)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          const next = `${location.pathname}${location.search}`;
          navigate(`/login?next=${encodeURIComponent(next)}&reason=session-expired`, {
            replace: true,
          });
          return;
        }

        setError(e instanceof Error ? e.message : "크리에이터 주문 현황을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    listStudioEditions()
      .then(setStudioEditions)
      .catch(() => setStudioEditions([]));
  }, []);

  useEffect(() => {
    getSweetbookIntegrationStatus()
      .then(setIntegrationStatus)
      .catch(() => setIntegrationStatus(null));
  }, []);

  const pagedEditions = paginateItems(studioEditions, editionPage, EDITIONS_PAGE_SIZE);
  const recentOrders = orderDashboard?.recentOrders ?? [];
  const pagedRecentOrders = paginateItems(recentOrders, recentOrdersPage, RECENT_ORDERS_PAGE_SIZE);

  return (
    <StudioShell
      title="주문 대시보드"
      description="팬 주문, 결제 완료 수, 최근 배송 흐름을 운영 관점에서 바로 확인할 수 있는 화면입니다."
      actions={
        <Link to="/studio/editions/new" className="editorial-button-secondary px-4 py-2.5">
          새 에디션 제작
        </Link>
      }
    >
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="editorial-card p-6 md:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="editorial-label">주문 현황</p>
              <h2 className="mt-3 text-2xl font-semibold text-stone-900">팬 주문 현황</h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-warm-500">
                주문과 배송 상태를 한눈에 확인하세요.
              </p>
              {integrationStatus && (
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${integrationTone(integrationStatus)}`}>
                  {integrationStatus.label}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl border border-stone-200 bg-stone-100/70"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
              {error}
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <StudioMetricCard
                label="전체 주문"
                value={`${orderDashboard?.totalOrders ?? 0}건`}
                hint="내 에디션 기준"
              />
              <StudioMetricCard
                label="결제 완료"
                value={`${orderDashboard?.paidOrders ?? 0}건`}
                hint="실제 승인된 주문"
              />
              <StudioMetricCard
                label="제작 중"
                value={`${orderDashboard?.productionOrders ?? 0}건`}
                hint="웹훅 기준"
              />
              <StudioMetricCard
                label="배송 완료"
                value={`${orderDashboard?.deliveredOrders ?? 0}건`}
                hint="실제 완료 기준"
              />
            </div>
          )}
        </div>

        <section className="editorial-card flex flex-col justify-between p-6 md:p-7">
          <div>
            <p className="editorial-label">운영 액션</p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-900">에디션 제작</h2>
            <p className="mt-3 text-sm leading-relaxed text-warm-500">
              새로운 에디션을 만들거나 기존 에디션을 수정하려면 제작 페이지로 이동하세요.
            </p>
          </div>
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
              다음 작업
            </p>
              <p className="mt-2 text-sm text-stone-700">
                새 에디션을 만들거나 기존 초안을 다시 편집할 수 있어요.
              </p>
            <Link
              to="/studio/editions/new"
              className="mt-4 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
            >
              에디션 제작으로 이동
            </Link>
          </div>
        </section>
      </section>

      <section className="editorial-card mt-8 p-6 md:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="editorial-label">내 에디션</p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-900">내 에디션 목록</h2>
          </div>
          <p className="text-sm text-warm-500">초안과 공개된 에디션을 편집하거나 확인할 수 있어요.</p>
        </div>

        {studioEditions.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-500">
            아직 만든 에디션이 없어요. 첫 에디션을 만들면 여기에서 바로 관리할 수 있습니다.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              {pagedEditions.items.map((edition) => (
                <article key={edition.id} className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                  <div className="flex gap-4">
                    <img
                      src={resolveMediaUrl(edition.coverImageUrl)}
                      alt={edition.title}
                      className="h-28 w-24 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-stone-900">{edition.title}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-warm-500">
                          {edition.status}
                        </span>
                      </div>
                      {edition.subtitle && (
                        <p className="mt-2 text-sm leading-relaxed text-warm-500">{edition.subtitle}</p>
                      )}
                      <p className="mt-3 text-xs text-stone-500">
                        마지막 수정 {formatStudioDateTime(edition.updatedAt)}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          to={`/studio/editions/${edition.id}/edit`}
                          className="editorial-button-secondary px-4 py-2.5"
                        >
                          다시 편집
                        </Link>
                        <Link to={`/editions/${edition.id}`} className="editorial-button-link">
                          팬 시점 보기
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <PaginationControls
              page={pagedEditions.currentPage}
              pageSize={EDITIONS_PAGE_SIZE}
              totalItems={studioEditions.length}
              itemLabel="에디션"
              onPageChange={setEditionPage}
            />
          </div>
        )}
      </section>

      <section className="editorial-card mt-8 p-6 md:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="editorial-label">최근 주문</p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-900">최근 주문 내역</h2>
          </div>
          <p className="text-sm text-warm-500">최근 12건까지 표시돼요.</p>
        </div>

        {loading ? (
          <div className="mt-5 space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl border border-stone-200 bg-stone-100/70"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-600">
            주문 목록을 아직 불러오지 못했습니다.
          </div>
        ) : (orderDashboard?.recentOrders.length ?? 0) === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-500">
            아직 팬 주문이 없어요. 첫 주문이 들어오면 여기에서 바로 확인할 수 있습니다.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="space-y-3">
              {pagedRecentOrders.items.map((order) => (
                <StudioRecentOrderCard key={order.siteOrderUid} order={order} />
              ))}
            </div>
            <PaginationControls
              page={pagedRecentOrders.currentPage}
              pageSize={RECENT_ORDERS_PAGE_SIZE}
              totalItems={recentOrders.length}
              itemLabel="주문"
              onPageChange={setRecentOrdersPage}
            />
          </div>
        )}
      </section>
    </StudioShell>
  );
}

function StudioMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-stone-900">{value}</p>
      <p className="mt-2 text-sm text-warm-500">{hint}</p>
    </div>
  );
}

function StudioRecentOrderCard({ order }: { order: StudioOrderSummary }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-stone-900">{order.editionTitle}</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-warm-500">
              주문 #{order.projectId}
            </span>
            {order.simulated && (
              <span className="rounded-full bg-gold-400/15 px-2.5 py-1 text-[11px] font-medium text-gold-600">
                테스트
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-stone-600">
            팬 <span className="font-medium text-stone-900">{order.fanDisplayName}</span>님이{" "}
            <span className="font-medium text-stone-900">{order.recipientName}</span> 앞으로 주문했습니다.
          </p>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-lg font-semibold text-stone-900">
            {formatStudioCurrency(order.totalAmount)}
          </p>
          <p className="mt-1 text-xs text-stone-500">{formatStudioDateTime(order.orderedAt)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill label={siteOrderLabel(order.siteOrderStatus)} tone="emerald" />
        <StatusPill
          label={fulfillmentStatusLabel(order.fulfillmentStatus)}
          tone={order.fulfillmentStatus === "FAILED" ? "rose" : "stone"}
        />
        <StatusPill label={`${order.quantity}권`} tone="stone" />
        {order.paymentMethod && <StatusPill label={order.paymentMethod} tone="stone" />}
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
        <div className="rounded-xl bg-white px-3 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            연락처
          </dt>
          <dd className="mt-2 font-medium text-stone-900">{order.recipientPhoneMasked || "-"}</dd>
        </div>
        <div className="rounded-xl bg-white px-3 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            배송지
          </dt>
          <dd className="mt-2 text-stone-900">{order.addressSummary || "-"}</dd>
        </div>
      </dl>
      {order.lastEventType && (
        <p className="mt-4 text-xs text-stone-500">
          최근 이벤트: {fulfillmentEventLabel(order.lastEventType)}
          {order.lastEventAt ? ` · ${formatStudioDateTime(order.lastEventAt)}` : ""}
        </p>
      )}
    </article>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "rose" | "stone";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700"
        : "bg-white text-stone-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}>
      {label}
    </span>
  );
}

function formatStudioCurrency(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatStudioDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ko-KR");
}
