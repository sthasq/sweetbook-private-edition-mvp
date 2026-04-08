import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPreview, updateProject } from "../api/projects";
import { getAuthUrl } from "../api/youtube";
import type { ProjectPreview, PersonalizationField } from "../types/api";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";

export default function PersonalizationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    getPreview(Number(projectId))
      .then((p) => {
        setPreview(p);
        const initial: Record<string, string> = {};
        if (p.personalizationData) {
          for (const [k, v] of Object.entries(p.personalizationData)) {
            initial[k] = String(v ?? "");
          }
        }
        setValues(initial);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleYouTubeConnect() {
    try {
      const auth = await getAuthUrl();
      if (auth.enabled && auth.authUrl) {
        window.location.href = auth.authUrl;
      } else {
        setError("YouTube 연동이 비활성화 상태입니다. (Google 자격증명 미설정)");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "YouTube 인증 URL 가져오기 실패");
    }
  }

  async function handleSave() {
    if (!projectId) return;
    setSaving(true);
    try {
      await updateProject(Number(projectId), values);
      navigate(`/projects/${projectId}/preview`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (error && !preview) return <ErrorBox message={error} />;
  if (!preview) return <ErrorBox message="프로젝트를 찾을 수 없습니다." />;

  const fields: PersonalizationField[] =
    preview.edition.snapshot?.personalizationFields ?? [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-xs text-neutral-500">
        <span className="text-brand-400 font-medium">1. 개인화</span>
        <span className="text-neutral-700">/</span>
        <span>2. 미리보기</span>
        <span className="text-neutral-700">/</span>
        <span>3. 주문</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">
        나만의 정보 입력
      </h1>
      <p className="text-sm text-neutral-400 mb-8">
        <span className="text-brand-400 font-medium">{preview.edition.title}</span>
        {" "}에디션을 나만의 것으로 만드세요.
      </p>

      {/* YouTube connect option */}
      {preview.mode === "youtube" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                YouTube 데이터 자동 채우기
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                구독 채널, 인기 영상 분석 결과를 자동으로 반영합니다
              </p>
            </div>
            <button
              onClick={handleYouTubeConnect}
              className="shrink-0 rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
            >
              Google 로그인
            </button>
          </div>
        </div>
      )}

      {/* Dynamic form fields */}
      <div className="space-y-5">
        {fields.length > 0 ? (
          fields.map((f) => (
            <div key={f.fieldKey}>
              <label
                htmlFor={f.fieldKey}
                className="block text-sm font-medium text-neutral-300 mb-1.5"
              >
                {f.label}
                {f.required && (
                  <span className="text-red-400 ml-1">*</span>
                )}
              </label>
              {f.inputType === "textarea" ? (
                <textarea
                  id={f.fieldKey}
                  rows={3}
                  maxLength={f.maxLength ?? undefined}
                  value={values[f.fieldKey] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.fieldKey]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                  placeholder={f.label}
                />
              ) : (
                <input
                  id={f.fieldKey}
                  type={f.inputType === "number" ? "number" : "text"}
                  maxLength={f.maxLength ?? undefined}
                  value={values[f.fieldKey] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.fieldKey]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                  placeholder={f.label}
                />
              )}
              {f.maxLength && (
                <p className="mt-1 text-xs text-neutral-600 text-right">
                  {(values[f.fieldKey] ?? "").length}/{f.maxLength}
                </p>
              )}
            </div>
          ))
        ) : (
          <>
            <div>
              <label
                htmlFor="fanNickname"
                className="block text-sm font-medium text-neutral-300 mb-1.5"
              >
                닉네임 <span className="text-red-400">*</span>
              </label>
              <input
                id="fanNickname"
                value={values.fanNickname ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, fanNickname: e.target.value }))
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                placeholder="책에 들어갈 나의 닉네임"
              />
            </div>
            <div>
              <label
                htmlFor="favoriteMemory"
                className="block text-sm font-medium text-neutral-300 mb-1.5"
              >
                가장 기억에 남는 순간
              </label>
              <textarea
                id="favoriteMemory"
                rows={3}
                value={values.favoriteMemory ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, favoriteMemory: e.target.value }))
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                placeholder="크리에이터와 관련된 기억에 남는 순간을 적어주세요"
              />
            </div>
            <div>
              <label
                htmlFor="fanMessage"
                className="block text-sm font-medium text-neutral-300 mb-1.5"
              >
                크리에이터에게 한마디
              </label>
              <textarea
                id="fanMessage"
                rows={2}
                value={values.fanMessage ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, fanMessage: e.target.value }))
                }
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
                placeholder="짧은 메시지를 남겨주세요"
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-8 flex justify-end">
        <button
          disabled={saving}
          onClick={handleSave}
          className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
        >
          {saving ? "저장 중..." : "미리보기로 →"}
        </button>
      </div>
    </div>
  );
}
