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
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-3xl border border-stone-200 bg-white/88 p-8 shadow-xl shadow-brand-100/40">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-400">
          로그인
        </p>
        <h1 className="mt-4 text-3xl font-bold text-stone-900">
          다시 이어서 만들기
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          로그인하면 내 프로젝트와 크리에이터 스튜디오 접근 권한이 복원됩니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-stone-700 mb-1.5"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="fan@privateedition.local"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-stone-700 mb-1.5"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Fan12345!"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
          >
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/90 p-4 text-xs text-stone-600">
          <p className="font-semibold text-stone-800">로컬 데모 계정</p>
          <p className="mt-2">
            fan: <code>fan@privateedition.local</code> /{" "}
            <code>Fan12345!</code>
          </p>
          <p className="mt-1">
            creator: <code>creator@privateedition.local</code> /{" "}
            <code>Creator123!</code>
          </p>
        </div>

        <p className="mt-6 text-sm text-stone-600">
          아직 계정이 없다면{" "}
          <Link
            to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-brand-400 hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
