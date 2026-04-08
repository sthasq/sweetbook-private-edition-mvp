import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { handleCallback } from "../api/youtube";
import Spinner from "../components/Spinner";

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      setError("OAuth 콜백 파라미터가 누락되었습니다.");
      return;
    }

    handleCallback(code, state)
      .then(() => {
        navigate("/", { replace: true });
      })
      .catch((e) => setError(e.message));
  }, [params, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg mt-20 text-center">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="text-sm text-brand-400 hover:underline"
        >
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="mt-20 text-center">
      <Spinner />
      <p className="mt-4 text-sm text-neutral-400">Google 계정 연동 중...</p>
    </div>
  );
}
