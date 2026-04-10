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
    title: "크리에이터가 공식 에디션을 발행합니다",
    description:
      "한 번 승인된 공식 레이아웃과 메시지를 기반으로 팬북의 기준이 되는 아카이브를 만듭니다.",
  },
  {
    step: "02",
    title: "팬이 자신의 기억으로 개인화합니다",
    description:
      "닉네임, 관계의 시간, 인상 깊었던 장면, 팬 메시지를 더해 각자만의 책으로 바꿉니다.",
  },
  {
    step: "03",
    title: "실물 기념책으로 주문합니다",
    description:
      "미리보기로 확인한 결과물을 그대로 인쇄 주문해 오래 남는 소장품으로 완성합니다.",
  },
] as const;

const TRUST_POINTS = [
  "Creator-certified official drop",
  "한정된 에디션 기반 개인화",
  "Sweetbook 실물 제작/주문 연동",
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
            <p className="editorial-label">Official Creator-Certified Fan Book</p>
            <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight text-brand-700 md:text-7xl">
              공식 에디션 위에
              <br />
              <span className="italic font-normal">나만의 기억을 인쇄하는 책.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-warm-500">
              Private Edition은 크리에이터가 발행한 공식 팬북을 팬 각자의 추억과 메시지로
              개인화해 실물 책으로 주문하는 아카이브형 굿즈 서비스입니다.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a href="#editions" className="editorial-button-primary">
                공식 드롭 보기
              </a>
              <a href="#how-it-works" className="editorial-button-secondary">
                작동 방식 보기
              </a>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {TRUST_POINTS.map((item) => (
                <div key={item} className="rounded bg-white/70 px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warm-500">
                    Archive
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
                  Official drop
                </div>
                <img
                  src={
                    featuredEdition
                      ? `https://picsum.photos/seed/edition-hero-${featuredEdition.id}/900/1200`
                      : "https://picsum.photos/seed/private-edition-hero/900/1200"
                  }
                  alt={featuredEdition?.title ?? "Private Edition cover preview"}
                  className="aspect-[4/5] w-full rounded object-cover"
                />
              </div>
            </div>
            <div className="editorial-glass absolute -bottom-10 left-0 max-w-sm rounded-lg border border-stone-200/60 p-6 shadow-editorial">
              <p className="editorial-label">Current Release</p>
              <p className="mt-3 font-headline text-2xl text-brand-700">
                {featuredEdition?.title ?? "Creator-certified private archive"}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-warm-500">
                공식적으로 큐레이션된 에디션을 시작점으로, 팬 한 명 한 명이 서로 다른
                기억의 레이어를 추가합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="editions" className="bg-surface-low py-24">
        <div className="page-shell">
          <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="editorial-label text-gold-500">Archival Release</p>
              <h2 className="mt-4 text-4xl font-bold text-brand-700 md:text-5xl">
                Current Official Drops
              </h2>
            </div>
            <Link to="/studio" className="editorial-button-link">
              Creator Studio 열기
            </Link>
          </div>

          {loading && <Spinner />}
          {error && <ErrorBox message={error} />}
          {!loading && !error && editions.length === 0 && (
            <div className="editorial-card px-8 py-16 text-center">
              <p className="font-headline text-2xl text-brand-700">
                아직 등록된 공식 에디션이 없습니다.
              </p>
              <p className="mt-3 editorial-muted">
                크리에이터 스튜디오에서 첫 드롭을 발행하면 이 공간이 아카이브처럼 채워집니다.
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
                              Official Edition
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
                            Curated by
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
            <p className="editorial-label">Crafted For Posterity</p>
            <h2 className="mt-4 text-4xl font-bold text-brand-700 md:text-5xl">
              디지털 팬 경험을 인쇄물로 보존하는 흐름
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-warm-500">
              서비스의 중심은 기능 나열이 아니라, 공식성과 개인화가 함께 살아 있는 한 권의
              결과물입니다.
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
              <p className="editorial-label text-gold-500">Verification Standard</p>
              <h2 className="mt-4 text-4xl font-bold text-brand-700 md:text-5xl">
                공식 굿즈와 개인 기록의 중간지점
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-warm-500">
                Private Edition은 모두에게 동일한 굿즈가 아니라, 크리에이터가 승인한 기반 위에
                각자의 기억을 얹어 완성하는 한정형 소장품을 지향합니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                {["Creator verified", "Limited drop", "Print-ready flow"].map((label) => (
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
                    Certificate of Authenticity
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
                      Authorized signature
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
          <h2 className="text-4xl font-bold italic md:text-5xl">Are you a creator?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-100">
            팬과 함께 보존하고 싶은 장면을 공식 에디션으로 발행하고, 개인화 가능한 드롭을
            직접 설계해보세요.
          </p>
          <Link to="/studio" className="mt-10 inline-flex rounded bg-white px-8 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-brand-700 transition hover:bg-surface-low">
            Open Creator Studio
          </Link>
        </div>
      </section>
    </>
  );
}
