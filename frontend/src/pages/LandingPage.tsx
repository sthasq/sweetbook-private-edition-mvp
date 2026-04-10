import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEditions } from "../api/editions";
import type { EditionSummary } from "../types/api";
import VerifiedBadge from "../components/VerifiedBadge";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "크리에이터가 드롭을 올립니다",
    description:
      "좋아하는 장면과 이야기를 담아, 고를 수 있는 굿즈를 준비합니다.",
  },
  {
    step: "02",
    title: "팬이 자기 취향대로 채웁니다",
    description:
      "닉네임, 추억, 좋아한 장면, 한마디를 넣어 내 버전으로 바꿉니다.",
  },
  {
    step: "03",
    title: "실물 굿즈로 받아봅니다",
    description:
      "미리보기로 확인한 뒤 그대로 주문해서 오래 간직할 수 있습니다.",
  },
] as const;

const TRUST_POINTS = [
  "직접 준비한 구성",
  "내 문장과 사진 추가",
  "실물 제작까지 연결",
] as const;

export default function LandingPage() {
  const [editions, setEditions] = useState<EditionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listEditions()
      .then(setEditions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const featuredEdition = editions[0];
  return (
    <>
      <section className="overflow-hidden">
        <div className="page-shell grid items-center gap-14 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-6">
            <p className="editorial-label">좋아하는 장면을 굿즈로</p>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-warm-500">
              좋아했던 장면에 내 추억 한 줄을 더해, 오래 두고 볼 굿즈로 남겨요.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a href="#editions" className="editorial-button-primary">
                드롭 보러가기
              </a>
              <a href="#how-it-works" className="editorial-button-secondary">
                어떻게 만드는지 보기
              </a>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {TRUST_POINTS.map((item) => (
                <div key={item} className="rounded bg-white/70 px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warm-500">
                    포인트
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-800">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:col-span-6 lg:pl-10">
            <div className="paper-stack relative mx-auto max-w-xl">
              <div className="relative overflow-hidden rounded bg-white p-3 shadow-editorial">
                <div className="absolute right-6 top-6 z-10 rounded bg-gold-400/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-900">
                  새 드롭
                </div>
                <img
                  src={
                    featuredEdition
                      ? `https://picsum.photos/seed/edition-hero-${featuredEdition.id}/900/1200`
                      : "https://picsum.photos/seed/playpick-hero/900/1200"
                  }
                  alt={featuredEdition?.title ?? "PlayPick 커버 미리보기"}
                  className="aspect-[4/5] w-full rounded object-cover"
                />
              </div>
            </div>
            <div className="editorial-glass absolute -bottom-10 left-0 max-w-sm rounded-lg border border-stone-200/60 p-6 shadow-editorial">
              <p className="editorial-label">지금 눈여겨볼 드롭</p>
              <p className="mt-3 font-headline text-2xl text-brand-700">
                {featuredEdition?.title ?? "새로 올라온 굿즈"}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-warm-500">
                마음에 드는 드롭을 고른 뒤, 내 이야기 한 줄을 더해 나만의 굿즈로 완성해 보세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="editions" className="bg-surface-low py-24">
        <div className="page-shell">
          <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="editorial-label text-gold-500">지금 막 올라온 드롭</p>
              <h2 className="mt-4 text-4xl font-bold text-brand-700 md:text-5xl">
                지금 올라온 굿즈
              </h2>
            </div>
            <Link to="/studio" className="editorial-button-link">
              스튜디오 열기
            </Link>
          </div>

          {loading && <Spinner />}
          {error && <ErrorBox message={error} />}
          {!loading && !error && editions.length === 0 && (
            <div className="editorial-card px-8 py-16 text-center">
              <p className="font-headline text-2xl text-brand-700">
                아직 올라온 드롭이 없어요.
              </p>
              <p className="mt-3 editorial-muted">
                크리에이터 스튜디오에서 첫 드롭을 올리면 이 공간이 채워집니다.
              </p>
            </div>
          )}

          {!loading && !error && editions.length > 0 && (
            <div className="grid gap-10 lg:grid-cols-3">
              {editions.map((edition, index) => (
                <Link
                  key={edition.id}
                  to={`/editions/${edition.id}`}
                  className={`group ${
                    index === 0 ? "lg:col-span-2" : ""
                  }`}
                >
                  <article className="editorial-card h-full overflow-hidden p-3 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-ambient">
                    <div className={`grid h-full gap-6 ${index === 0 ? "lg:grid-cols-[1.1fr_0.9fr]" : ""}`}>
                      <div className="overflow-hidden rounded bg-surface-low">
                        <img
                          src={`https://picsum.photos/seed/edition-${edition.id}/900/1200`}
                          alt={edition.title}
                          className={`w-full object-cover transition duration-500 group-hover:scale-[1.02] ${
                            index === 0 ? "aspect-[4/3] h-full lg:aspect-auto" : "aspect-[3/4]"
                          }`}
                        />
                      </div>
                      <div className="flex flex-col justify-between p-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-gold-400/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500">
                              드롭
                            </span>
                            {edition.isVerified && <VerifiedBadge />}
                          </div>
                          <h3 className="mt-5 text-3xl font-bold leading-tight text-stone-900">
                            {edition.title}
                          </h3>
                          {edition.subtitle && (
                            <p className="mt-4 text-sm leading-relaxed text-warm-500">
                              {edition.subtitle}
                            </p>
                          )}
                        </div>
                        <div className="mt-8">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
                            만든 사람
                          </p>
                          <p className="mt-2 text-lg text-brand-700">{edition.creatorName}</p>
                          <p className="mt-1 text-sm text-warm-500">@{edition.creatorHandle}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="py-24">
        <div className="page-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="editorial-label">만드는 흐름</p>
            <h2 className="mt-4 text-4xl font-bold text-brand-700 md:text-5xl">
              장면 하나가 굿즈가 되기까지
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-warm-500">
              복잡한 제작 툴보다, 고르고 채우고 받아보는 흐름에 집중했습니다.
            </p>
          </div>

          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <article key={item.step} className="relative px-2 pt-8">
                <div className="pointer-events-none absolute left-0 top-0 font-headline text-7xl italic text-stone-300/50">
                  {item.step}
                </div>
                <div className="relative z-10 pt-12">
                  <h3 className="text-2xl font-bold leading-snug text-brand-700">{item.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-warm-500">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-low py-24">
        <div className="page-shell">
          <div className="editorial-card grid items-center gap-10 overflow-hidden p-8 md:grid-cols-[1.1fr_0.9fr] md:p-14">
            <div>
              <p className="editorial-label text-gold-500">이런 점이 좋아요</p>
              <h2 className="mt-4 text-4xl font-bold text-brand-700 md:text-5xl">
                좋아하는 장면을 더 내 취향으로
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-warm-500">
                이미 올라온 장면에 내 추억 한 줄만 더해도, 그대로 소장하고 싶은 굿즈가 됩니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                {["직접 고른 구성", "내 문장 더하기", "주문까지 한 번에"].map((label) => (
                  <span
                    key={label}
                    className="rounded bg-surface-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-warm-500"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded bg-surface-low p-6">
              <div className="rounded border border-gold-400/25 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-200/70 pb-4">
                  <span className="font-headline italic text-brand-700">
                    이 드롭 한눈에
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                    No. 402
                  </span>
                </div>
                <div className="space-y-3 py-6">
                  <div className="h-3 rounded-full bg-surface-high" />
                  <div className="h-3 w-11/12 rounded-full bg-surface-high" />
                  <div className="h-3 w-4/5 rounded-full bg-surface-high" />
                </div>
                <div className="flex items-end justify-between pt-4">
                  <div>
                    <div className="h-px w-24 bg-stone-900" />
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">
                      크리에이터 코멘트
                    </p>
                  </div>
                  <div className="rounded-full bg-gold-400/15 p-3 text-gold-500">
                    <svg className="h-6 w-6 fill-current" viewBox="0 0 20 20">
                      <path d="M10 0l2.5 3.2 4-.8-1.2 3.9L18 10l-2.7 3.7 1.2 3.9-4-.8L10 20l-2.5-3.2-4 .8 1.2-3.9L2 10l2.7-3.7-1.2-3.9 4 .8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-700 py-24 text-center text-white">
        <div className="page-shell max-w-3xl">
          <h2 className="text-4xl font-bold italic md:text-5xl">크리에이터라면?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-100">
            오래 남기고 싶은 장면을 올리면, 팬이 자기 취향대로 채워가는 굿즈가 됩니다.
          </p>
          <Link to="/studio" className="mt-10 inline-flex rounded bg-white px-8 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-brand-700 transition hover:bg-surface-low">
            크리에이터 스튜디오
          </Link>
        </div>
      </section>
    </>
  );
}
