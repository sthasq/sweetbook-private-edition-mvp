import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { handleCallback } from "../api/youtube";
import Spinner from "../components/Spinner";

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get("code");
  const state = params.get("state");
  const missingParams = !code || !state;
  const callbackStarted = useRef(false);
  const [error, setError] = useState(
    missingParams ? "OAuth 콜백 파라미터가 누락되었습니다." : "",
  );
  const returnTo = sessionStorage.getItem("youtube:returnTo") ?? "/me/projects";

  useEffect(() => {
    if (missingParams || callbackStarted.current || !code || !state) {
      return;
    }
    callbackStarted.current = true;

    handleCallback(code, state)
      .then(() => {
        sessionStorage.removeItem("youtube:returnTo");
        navigate(returnTo, { replace: true });
      })
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 401
            ? "앱 로그인 세션이 필요합니다. 다시 로그인한 뒤 YouTube 연동을 시도해주세요."
            : e.message,
        ),
      );
  }, [code, state, missingParams, navigate, returnTo]);

  if (error) {
    return (
      <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-200 bg-white/90 px-6 py-10 text-center shadow-sm shadow-red-100/40">
        <p className="mb-4 text-sm text-red-600">{error}</p>
        <button
          onClick={() => navigate(returnTo)}
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          이전 화면으로
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-stone-200 bg-white/90 px-6 py-10 text-center shadow-sm shadow-brand-100/30">
      <Spinner />
      <p className="mt-4 text-sm text-stone-600">Google 계정 연동 중...</p>
    </div>
  );
}
