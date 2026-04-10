import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resolvePostAuthPath } from "../auth/navigation";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("fan@privateedition.local");
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
            <p className="editorial-label">Private Archive Access</p>
            <h1 className="mt-5 text-4xl text-brand-700 md:text-5xl">
              다시 이어서
              <br />
              당신의 책으로.
            </h1>
            <p className="mt-5 max-w-md text-base leading-8 text-stone-700">
              로그인하면 내 프로젝트, 미리보기, 주문 흐름과 크리에이터 스튜디오 접근 권한이
              복원됩니다.
            </p>
          </div>

          <div className="mt-8 editorial-card p-5 text-sm text-stone-700">
            <p className="editorial-label">Demo Accounts</p>
            <div className="mt-4 space-y-3">
              <p>
                fan: <code>fan@privateedition.local</code> / <code>Fan12345!</code>
              </p>
              <p>
                creator: <code>creator@privateedition.local</code> /{" "}
                <code>Creator123!</code>
              </p>
            </div>
          </div>
        </section>

        <section className="editorial-card p-8 md:p-10">
          <p className="editorial-label">로그인</p>
          <h2 className="mt-4 text-3xl text-stone-900">아카이브 불러오기</h2>
          <p className="mt-3 editorial-muted">
            공식 에디션과 개인화 기록을 다시 불러와 다음 단계로 이어집니다.
          </p>

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
                placeholder="fan@privateedition.local"
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
