import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { getAdminUsers, verifyCreator } from "../api/admin";
import AdminShell from "../components/AdminShell";
import type { AdminUserSummary } from "../types/api";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAdminUsers()
      .then(setUsers)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : "사용자 목록을 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [navigate, location.pathname]);

  useEffect(load, [load]);

  async function handleVerify(user: AdminUserSummary) {
    if (user.creatorProfileId == null) {
      setError("크리에이터 프로필 정보를 찾지 못했어요.");
      return;
    }

    setBusyId(user.id);
    try {
      await verifyCreator(user.creatorProfileId);
      load();
    } catch {
      setError("인증 처리에 실패했어요.");
    } finally {
      setBusyId(null);
    }
  }

  const roleLabel = (role: string) =>
    role === "ADMIN" ? "관리자" : role === "CREATOR" ? "크리에이터" : "팬";

  return (
    <AdminShell
      title="사용자 관리"
      description="플랫폼에 가입한 전체 사용자를 조회하고 크리에이터 인증을 관리합니다."
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-stone-200 bg-stone-100/70" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">{error}</div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-500">
          사용자가 없어요.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">이름</th>
                <th className="px-5 py-4">이메일</th>
                <th className="px-5 py-4 text-center">역할</th>
                <th className="px-5 py-4 text-center">크리에이터 인증</th>
                <th className="px-5 py-4 text-right">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => (
                <tr key={user.id} className="bg-white hover:bg-stone-50/60">
                  <td className="px-5 py-4 font-medium text-stone-900">{user.id}</td>
                  <td className="px-5 py-4 font-medium text-stone-900">{user.displayName}</td>
                  <td className="px-5 py-4 text-stone-600">{user.email}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      user.role === "ADMIN" ? "bg-rose-50 text-rose-700"
                      : user.role === "CREATOR" ? "bg-brand-50 text-brand-700"
                      : "bg-stone-100 text-stone-600"
                    }`}>
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {user.creatorVerified === null ? (
                      <span className="text-xs text-stone-400">—</span>
                    ) : user.creatorVerified ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">인증됨</span>
                    ) : (
                      <button
                        onClick={() => handleVerify(user)}
                        disabled={busyId === user.id}
                        className="rounded-full bg-brand-600 px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                      >
                        {busyId === user.id ? "처리 중..." : "인증하기"}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-xs text-stone-600">{fmtDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

function fmtDate(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("ko-KR");
}
