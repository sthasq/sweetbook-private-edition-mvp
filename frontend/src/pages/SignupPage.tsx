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
    <div className="page-shell-narrow">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="editorial-panel flex flex-col justify-between p-8 md:p-10">
          <div>
            <p className="editorial-label">바로 시작하기</p>
            <h1 className="mt-5 text-4xl text-brand-700 md:text-5xl">
              {role === "CREATOR" ? "새 에디션 올릴 준비." : "내 굿즈 만들 준비."}
            </h1>
            <p className="mt-5 max-w-md text-base leading-8 text-stone-700">
              {role === "CREATOR"
                ? "크리에이터 계정으로 에디션 제목, 소개, 커버, 메시지를 올리고 바로 공개할 수 있어요."
                : "팬 계정은 개인화 프로젝트를 저장하고, 미리보기와 주문 흐름을 이어서 진행할 수 있습니다."}
            </p>
          </div>

          <div className="mt-8 editorial-card p-5 text-sm text-stone-700">
            <p className="editorial-label">계정 유형</p>
            <p className="mt-4">
              가입 후 역할에 맞는 첫 화면으로 바로 이동합니다. 팬은 내 프로젝트로, 크리에이터는
              스튜디오로 연결됩니다.
            </p>
          </div>
        </section>

        <section className="editorial-card p-8 md:p-10">
          <p className="editorial-label">회원가입</p>
          <h2 className="mt-4 text-3xl text-stone-900">
            {role === "CREATOR" ? "크리에이터 계정 만들기" : "팬 계정 만들기"}
          </h2>
          <p className="mt-3 editorial-muted">
            에디션을 올리거나 굿즈 제작을 이어가기 위한 기본 정보예요.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <span className="text-sm font-semibold text-stone-800">가입 유형</span>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("FAN")}
                  className={`rounded-sm border px-4 py-4 text-left text-sm transition ${
                    role === "FAN"
                      ? "border-brand-300 bg-brand-50/60 text-brand-700 shadow-sm"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <span className="block font-semibold">팬</span>
                  <span className="mt-1 block text-xs leading-5 text-inherit">
                    개인화 프로젝트와 주문용 계정
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("CREATOR")}
                  className={`rounded-sm border px-4 py-4 text-left text-sm transition ${
                    role === "CREATOR"
                      ? "border-brand-300 bg-brand-50/60 text-brand-700 shadow-sm"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <span className="block font-semibold">크리에이터</span>
                  <span className="mt-1 block text-xs leading-5 text-inherit">
                    스튜디오에서 에디션 제작용 계정
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="displayName" className="text-sm font-semibold text-stone-800">
                표시 이름
              </label>
              <input
                id="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="editorial-input mt-2"
                placeholder="이름을 적어 주세요"
                />
              </div>

            {role === "CREATOR" && (
              <div>
                <label htmlFor="channelHandle" className="text-sm font-semibold text-stone-800">
                  크리에이터 아이디 (@아이디)
                </label>
                <input
                  id="channelHandle"
                  autoComplete="username"
                  value={channelHandle}
                  onChange={(e) => setChannelHandle(e.target.value)}
                  className="editorial-input mt-2"
                  placeholder="@sweetbook_creator"
                />
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  프로필과 에디션에 표시될 공개 아이디입니다. `@` 없이 입력해도 됩니다.
                </p>
              </div>
            )}

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
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-stone-800">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="editorial-input mt-2"
                placeholder="8자 이상"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="editorial-button-primary w-full disabled:opacity-50"
            >
              {submitting ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <p className="mt-6 text-sm text-stone-600">
            이미 계정이 있다면{" "}
            <Link
              to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-4"
            >
              로그인
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
