import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { getAdminSettlements } from "../api/admin";
import AdminShell from "../components/AdminShell";
import PaginationControls from "../components/PaginationControls";
import type { AdminCreatorSettlement } from "../types/api";
import { paginateItems } from "../lib/pagination";

const SETTLEMENTS_PAGE_SIZE = 8;

export default function AdminSettlementsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [settlements, setSettlements] = useState<AdminCreatorSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    getAdminSettlements()
      .then(setSettlements)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : "정산 현황을 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [navigate, location.pathname]);

  const totalRevenue = settlements.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalVendorCost = settlements.reduce((sum, s) => sum + s.vendorCost, 0);
  const totalMargin = settlements.reduce((sum, s) => sum + s.grossMargin, 0);
  const totalCommission = settlements.reduce((sum, s) => sum + s.platformCommission, 0);
  const totalPayout = settlements.reduce((sum, s) => sum + s.creatorPayout, 0);
  const pagedSettlements = paginateItems(settlements, page, SETTLEMENTS_PAGE_SIZE);

  return (
    <AdminShell
      title="정산 현황"
      description="크리에이터별 총매출, Sweetbook 원가, 분배 마진과 정산 예정 금액을 조회합니다."
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-stone-200 bg-stone-100/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">{error}</div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="총 매출" value={fmt(totalRevenue)} />
            <SummaryCard label="Sweetbook 원가 합계" value={fmt(totalVendorCost)} />
            <SummaryCard label="분배 마진 합계" value={fmt(totalMargin)} />
            <SummaryCard label="플랫폼 몫 합계" value={fmt(totalCommission)} />
            <SummaryCard label="크리에이터 정산 합계" value={fmt(totalPayout)} />
          </div>

          {settlements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-500">
              등록된 크리에이터가 없어요.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-stone-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                    <tr>
                      <th className="px-5 py-4">크리에이터</th>
                      <th className="px-5 py-4">채널</th>
                      <th className="px-5 py-4 text-center">인증</th>
                      <th className="px-5 py-4 text-right">주문 수</th>
                      <th className="px-5 py-4 text-right">총 매출</th>
                      <th className="px-5 py-4 text-right">Sweetbook 원가</th>
                      <th className="px-5 py-4 text-right">분배 마진</th>
                      <th className="px-5 py-4 text-right">플랫폼 몫</th>
                      <th className="px-5 py-4 text-right">정산 예정</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {pagedSettlements.items.map((s) => (
                      <tr key={s.creatorId} className="bg-white hover:bg-stone-50/60">
                        <td className="px-5 py-4 font-medium text-stone-900">{s.displayName}</td>
                        <td className="px-5 py-4 text-stone-600">@{s.channelHandle}</td>
                        <td className="px-5 py-4 text-center">
                          {s.verified ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">인증됨</span>
                          ) : (
                            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500">미인증</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right text-stone-900">{s.totalOrders}건</td>
                        <td className="px-5 py-4 text-right font-medium text-stone-900">{fmt(s.totalRevenue)}</td>
                        <td className="px-5 py-4 text-right text-stone-600">{fmt(s.vendorCost)}</td>
                        <td className="px-5 py-4 text-right text-gold-600">{fmt(s.grossMargin)}</td>
                        <td className="px-5 py-4 text-right text-rose-600">{fmt(s.platformCommission)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-brand-700">{fmt(s.creatorPayout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={pagedSettlements.currentPage}
                pageSize={SETTLEMENTS_PAGE_SIZE}
                totalItems={settlements.length}
                itemLabel="크리에이터"
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function fmt(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}
