import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resolvePostAuthPath } from "../auth/navigation";
import { useAuth } from "../auth/AuthContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signup } = useAuth();
  const [role, setRole] = useState<"FAN" | "CREATOR">("FAN");
  const [displayName, setDisplayName] = useState("");
  const [channelHandle, setChannelHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const currentUser = await signup({
        email,
        password,
        displayName,
        role,
        channelHandle: role === "CREATOR" ? channelHandle : undefined,
      });
      navigate(resolvePostAuthPath(currentUser, next), { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-3xl border border-stone-200 bg-white/88 p-8 shadow-xl shadow-brand-100/40">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-400">
          Signup
        </p>
        <h1 className="mt-4 text-3xl font-bold text-stone-900">
          {role === "CREATOR" ? "크리에이터 계정 만들기" : "팬 계정 만들기"}
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          {role === "CREATOR"
            ? "새 크리에이터 계정은 Studio에 바로 연결되며, 에디션 초안 작성과 발행 흐름을 시작할 수 있습니다."
            : "새 팬 계정은 개인화 프로젝트와 주문 흐름을 저장할 수 있습니다."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <span className="block text-sm font-medium text-stone-700 mb-2">
              가입 유형
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("FAN")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                  role === "FAN"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                }`}
              >
                <span className="block font-semibold">팬</span>
                <span className="mt-1 block text-xs text-inherit">
                  개인화 프로젝트와 주문용 계정
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole("CREATOR")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                  role === "CREATOR"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                }`}
              >
                <span className="block font-semibold">크리에이터</span>
                <span className="mt-1 block text-xs text-inherit">
                  Studio에서 에디션 제작용 계정
                </span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-stone-700 mb-1.5"
            >
              표시 이름
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Sweetbook Fan"
            />
          </div>

          {role === "CREATOR" && (
            <div>
              <label
                htmlFor="channelHandle"
                className="block text-sm font-medium text-stone-700 mb-1.5"
              >
                크리에이터 아이디 (@아이디)
              </label>
              <input
                id="channelHandle"
                value={channelHandle}
                onChange={(e) => setChannelHandle(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="@sweetbook_creator"
              />
              <p className="mt-1.5 text-xs text-stone-500">
                프로필과 에디션에 표시될 공개 아이디입니다. `@` 없이 입력해도 됩니다.
              </p>
            </div>
          )}

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
              placeholder="you@example.com"
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
              placeholder="8자 이상"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
          >
            {submitting ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-sm text-stone-600">
          이미 계정이 있다면{" "}
          <Link
            to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-brand-400 hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
