import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resolvePostAuthPath } from "../auth/navigation";
import { useAuth } from "../auth/AuthContext";

const DEMO_ACCOUNTS = [
  {
    label: "팬 데모",
    description: "개인화 인터뷰와 미리보기 흐름을 바로 체험할 수 있어요.",
    email: "fan@playpick.local",
    password: "Fan12345!",
  },
  {
    label: "크리에이터 데모",
    description: "스튜디오 에디션 관리와 주문 대시보드를 확인할 수 있어요.",
    email: "creator@playpick.local",
    password: "Creator123!",
  },
  {
    label: "관리자 데모",
    description: "정산, 주문, 사용자 운영 화면까지 확인할 수 있어요.",
    email: "admin@playpick.local",
    password: "Admin12345!",
  },
] as const;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("fan@playpick.local");
  const [password, setPassword] = useState("Fan12345!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const next = searchParams.get("next");
  const reason = searchParams.get("reason");

  useEffect(() => {
    if (!loading && user) {
      navigate(resolvePostAuthPath(user, next), { replace: true });
    }
  }, [loading, navigate, next, user]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const currentUser = await login({ email, password });
      navigate(resolvePostAuthPath(currentUser, next), { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell-narrow">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="editorial-panel flex flex-col justify-between p-8 md:p-10">
          <div>
            <p className="editorial-label text-slate-500">PLAYPICK</p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              나만의 이야기를<br />기록할 시간
            </h1>
            <p className="mt-5 max-w-md text-base leading-8 text-slate-600">
              로그인하고 세상에 단 하나뿐인 포토북을 만들어보세요. 내가 만들던 프로젝트와 주문 내역도 안전하게 보관됩니다.
            </p>
          </div>

          <div className="mt-8 rounded-sm border border-white/80 bg-white/78 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  데모 계정
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  원하는 역할을 눌러 바로 체험할 수 있어요.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Quick Fill
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setError("");
                  }}
                  className="w-full rounded-sm border border-stone-200/80 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{account.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {account.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      불러오기
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                    <p>
                      <span className="font-semibold text-stone-800">이메일</span>{" "}
                      {account.email}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-800">비밀번호</span>{" "}
                      {account.password}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="editorial-card p-8 md:p-10">
          <p className="editorial-label">로그인</p>

          {reason === "session-expired" && (
            <div className="mt-6 rounded-sm border border-amber-300/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
              세션이 만료되었거나 서버가 다시 시작되었습니다. 다시 로그인해 주세요.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-stone-800">
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="editorial-input mt-2"
                placeholder="fan@playpick.local"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-stone-800">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="editorial-input mt-2"
                placeholder="Fan12345!"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="editorial-button-primary w-full disabled:opacity-50"
            >
              {submitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="mt-6 text-sm text-stone-600">
            아직 계정이 없다면{" "}
            <Link
              to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-4"
            >
              회원가입
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

