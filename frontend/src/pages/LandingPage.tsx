import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import VerifiedBadge from "../components/VerifiedBadge";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import { useAuth } from "../auth/AuthContext";
import { listEditions } from "../api/editions";
import { formatChannelHandle } from "../lib/channelHandle";
import { estimateEditionPricing } from "../lib/sweetbookWorkflow";
import { resolveMediaUrl } from "../lib/appPaths";
import type { EditionSummary } from "../types/api";

const QUICK_FILTERS = ["오늘의 셀렉션", "대화형 제작", "가상 에디션", "소장용 추천"] as const;

const SHOPPING_BENEFITS = [
  {
    label: "플랫폼 경험",
    title: "고르면 바로 대화가 시작돼요",
    description: "에디션을 고른 뒤 몇 가지 질문에 답하면, 어시스턴트가 팬의 분위기에 맞는 포토북 구성을 제안합니다.",
  },
  {
    label: "팬 참여",
    title: "같은 에디션, 다른 스토리",
    description: "같은 가상 크리에이터 에디션도 팬마다 다른 기억과 문장으로 전혀 다른 결과물로 완성됩니다.",
  },
  {
    label: "실물 제작",
    title: "디지털 경험에서 실물 배송까지",
    description: "대화로 정리한 제안이 미리보기와 인쇄, 배송 단계까지 자연스럽게 이어집니다.",
  },
] as const;

const MALL_SIGNALS = [
  { value: "가상 에디션", caption: "오리지널 세계관으로 만든 포토북 셀렉션" },
  { value: "대화형 제안", caption: "몇 가지 질문만으로 개인화 문구 완성" },
  { value: "실물 제작", caption: "미리보기 후 실제 포토북으로 받아보기" },
] as const;

const PRODUCT_STICKERS = [
  "지금 가장 인기 있는",
  "대화형 추천",
  "방금 올라온 신규",
  "소장용 추천",
] as const;

const DEFAULT_PRICING = estimateEditionPricing("SQUAREBOOK_HC");

function formatCurrency(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export default function LandingPage() {
  const [editions, setEditions] = useState<EditionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    listEditions()
      .then(setEditions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const featuredEdition = editions[0];
  const heroEditions = editions.slice(0, 3);
  const curatedProducts = editions.slice(0, 6);
  const creatorShelf = editions.slice(0, 3);

  return (
    <>
      <section className="overflow-hidden border-b border-stone-200/60 bg-gradient-to-b from-[#f8f2e7] via-[#fbf7ef] to-[#fbf9f4]">
        <div className="page-shell space-y-10 lg:space-y-14">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="editorial-label">인플루언서-팬 포토북 플랫폼</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-tight text-stone-900 md:text-6xl">
                가상 크리에이터와 팬을 잇는
                <br />
                개인화 포토북 플랫폼
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-warm-500">
                오리지널 가상 에디션을 고르고 몇 가지 질문에 답하면, 팬의 문장과 추억을 담은
                맞춤형 포토북 제안을 실물 제작까지 이어서 경험할 수 있습니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {QUICK_FILTERS.map((filter) => (
                  <a
                    key={filter}
                    href="#products"
                    className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    {filter}
                  </a>
                ))}
              </div>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a href="#products" className="editorial-button-primary">
                  에디션 둘러보기
                </a>
                <a href="#shopping-guide" className="editorial-button-secondary">
                  주문 방법 알아보기
                </a>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="editorial-card overflow-hidden p-4">
                <div className="grid gap-5 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="overflow-hidden rounded bg-surface-low">
                    <img
                      src={resolveMediaUrl(featuredEdition?.coverImageUrl)}
                      alt={featuredEdition?.title ?? "PlayPick 대표 포토북"}
                      className="aspect-[4/5] h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col justify-between p-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-700 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-white">
                          에디터 추천
                        </span>
                        {featuredEdition?.isVerified && <VerifiedBadge />}
                      </div>
                      <h2 className="mt-5 text-3xl font-bold leading-tight text-stone-900">
                        {featuredEdition?.title ?? "크리에이터 공식 포토북"}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-warm-500">
                        {featuredEdition?.subtitle ??
                          "가상 크리에이터가 준비한 장면 위에 팬의 이야기를 더해 완성하는 포토북입니다."}
                      </p>
                    </div>

                    <div className="mt-8 space-y-4">
                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold text-brand-700">
                          {formatCurrency(DEFAULT_PRICING.productPrice)}
                        </p>
                        <p className="pb-1 text-sm text-warm-500">부터</p>
                      </div>
                      <p className="text-sm text-warm-500">
                        배송비 {formatCurrency(DEFAULT_PRICING.shippingFee)} 별도
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          to={featuredEdition ? `/editions/${featuredEdition.id}` : "/"}
                          className="editorial-button-primary"
                        >
                          자세히 보기
                        </Link>
                        <a href="#products" className="editorial-button-link">
                          다른 에디션 보기
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {MALL_SIGNALS.map((item) => (
                  <div key={item.value} className="rounded bg-white/80 px-5 py-5 shadow-sm">
                    <p className="text-lg font-bold text-brand-700">{item.value}</p>
                    <p className="mt-2 text-sm leading-relaxed text-warm-500">{item.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded border border-stone-200/70 bg-white/75 p-5 md:grid-cols-3">
            {heroEditions.map((edition, index) => (
              <Link
                key={edition.id}
                to={`/editions/${edition.id}`}
                className="group flex items-center gap-4 rounded border border-transparent bg-surface-low/70 p-3 transition hover:border-brand-200 hover:bg-white"
              >
                <img
                  src={resolveMediaUrl(edition.coverImageUrl)}
                  alt={edition.title}
                  className="h-20 w-16 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-500">
                    {PRODUCT_STICKERS[index] ?? "추천 상품"}
                  </p>
                  <p className="mt-1 truncate text-base font-semibold text-stone-900">
                    {edition.title}
                  </p>
                  <p className="mt-1 text-sm text-warm-500">{edition.creatorName}</p>
                </div>
                <span className="text-sm font-semibold text-brand-700 transition group-hover:translate-x-1">
                  보기
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="py-24">
        <div className="page-shell">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="editorial-label text-gold-500">지금 주문 가능</p>
              <h2 className="mt-4 text-4xl font-bold text-brand-700 md:text-5xl">
                지금 바로 만들 수 있는 포토북
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-warm-500">
                가상 에디션을 고르고, 대화로 제안받고, 미리보기와 주문까지 한 흐름으로 이어집니다.
              </p>
            </div>
            {user?.role === "CREATOR" && (
              <Link to="/studio/orders" className="editorial-button-link">
                크리에이터 스튜디오
              </Link>
            )}
          </div>

          {loading && <Spinner />}
          {error && <ErrorBox message={error} />}
          {!loading && !error && editions.length === 0 && (
            <div className="editorial-card px-8 py-16 text-center">
              <p className="font-headline text-2xl text-brand-700">아직 공개된 에디션이 없어요</p>
              <p className="mt-3 editorial-muted">
                새로운 에디션이 공개되면 이곳에서 바로 확인하고 주문할 수 있습니다.
              </p>
              {user?.role === "CREATOR" && (
                <Link
                  to="/studio/editions/new"
                  className="mt-6 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
                >
                  첫 에디션 만들기
                </Link>
              )}
            </div>
          )}

          {!loading && !error && curatedProducts.length > 0 && (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {curatedProducts.map((edition, index) => (
                <article
                  key={edition.id}
                  className="group editorial-card overflow-hidden border border-stone-200/80 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-ambient"
                >
                  <Link to={`/editions/${edition.id}`} className="block">
                    <div className="relative overflow-hidden rounded bg-surface-low">
                      <img
                        src={resolveMediaUrl(edition.coverImageUrl)}
                        alt={edition.title}
                        className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                          {index === 0 ? "BEST" : index === 1 ? "추천" : "한정판"}
                        </span>
                        {edition.isVerified && <VerifiedBadge />}
                      </div>
                    </div>
                  </Link>

                  <div className="space-y-5 p-2 pt-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">
                        {formatChannelHandle(edition.creatorHandle)}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold leading-tight text-stone-900">
                        {edition.title}
                      </h3>
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-warm-500">
                        {edition.subtitle || "가상 크리에이터가 준비한 장면에 나만의 이야기를 더해 완성하는 포토북입니다."}
                      </p>
                    </div>

                    <div className="rounded bg-surface-low px-4 py-3">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warm-500">
                            예상 제작가
                          </p>
                          <p className="mt-1 text-2xl font-bold text-brand-700">
                            {formatCurrency(DEFAULT_PRICING.productPrice)}
                            <span className="ml-1 text-sm font-medium text-warm-500">부터</span>
                          </p>
                        </div>
                        <p className="text-sm text-warm-500">
                          배송비 {formatCurrency(DEFAULT_PRICING.shippingFee)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Link
                        to={`/editions/${edition.id}`}
                        className="editorial-button-primary flex-1"
                      >
                        주문하기
                      </Link>
                      <Link
                        to={`/editions/${edition.id}`}
                        className="editorial-button-secondary"
                      >
                        자세히
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-surface-low py-24">
        <div className="page-shell">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="editorial-card p-8">
              <p className="editorial-label">이렇게 만들어져요</p>
              <h2 className="mt-4 text-4xl font-bold text-brand-700">
                고르고, 대화하고,
                <br />
                내 포토북으로 완성
              </h2>
              <p className="mt-5 text-base leading-relaxed text-warm-500">
                팬이 직접 긴 폼을 채우지 않아도 괜찮아요. 질문에 답하며 흐름을 따라가면 나만의 포토북 제안이 완성됩니다.
              </p>
              <div className="mt-8 space-y-4">
                {SHOPPING_BENEFITS.map((item) => (
                  <div key={item.title} className="rounded bg-surface-low px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-stone-900">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-warm-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5" id="shopping-guide">
              <div className="grid gap-5 md:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: "에디션 선택",
                    description: "마음에 드는 가상 크리에이터의 포토북 에디션을 골라주세요.",
                  },
                  {
                    step: "02",
                    title: "대화형 제안",
                    description: "몇 가지 질문에 답하면 어시스턴트가 팬의 기억과 문장을 바탕으로 초안을 만들어줘요.",
                  },
                  {
                    step: "03",
                    title: "미리보기 & 주문",
                    description: "완성된 포토북을 확인하고 배송지를 입력하면 실물로 제작됩니다.",
                  },
                ].map((item) => (
                  <article key={item.step} className="editorial-card p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-500">
                      Step {item.step}
                    </p>
                    <h3 className="mt-4 text-2xl font-bold text-stone-900">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-warm-500">{item.description}</p>
                  </article>
                ))}
              </div>

              <div className="editorial-card overflow-hidden p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="editorial-label">크리에이터 셀렉션</p>
                    <h3 className="mt-3 text-3xl font-bold text-brand-700">
                      오리지널 가상 크리에이터 에디션
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-warm-500">
                      여행, 로드트립, 스튜디오 토크처럼 서로 다른 무드의 가상 에디션을 고르고 팬만의 버전으로 이어가보세요.
                    </p>
                  </div>
                  {user?.role === "CREATOR" ? (
                    <Link to="/studio/orders" className="editorial-button-primary">
                      스튜디오 바로가기
                    </Link>
                  ) : (
                    <a href="#products" className="editorial-button-primary">
                      에디션 더 보기
                    </a>
                  )}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {creatorShelf.map((edition) => (
                    <Link
                      key={edition.id}
                      to={`/editions/${edition.id}`}
                      className="rounded border border-stone-200 bg-surface-low/60 p-4 transition hover:border-brand-200 hover:bg-white"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={resolveMediaUrl(edition.coverImageUrl)}
                          alt={edition.title}
                          className="h-20 w-16 rounded object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-stone-900">
                            {edition.title}
                          </p>
                          <p className="mt-1 text-sm text-warm-500">{edition.creatorName}</p>
                          <p className="mt-2 text-sm font-semibold text-brand-700">
                            {formatCurrency(DEFAULT_PRICING.productPrice)}부터
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-700 py-24 text-center text-white">
        <div className="page-shell max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-100">
            크리에이터 전용
          </p>
          <h2 className="mt-5 text-4xl font-bold italic md:text-5xl">
            크리에이터라면, 팬과 함께 완성하는
            <br />
            포토북 경험을 열어보세요
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-100">
            나의 장면과 메시지를 담은 에디션을 만들고, 대화형 개인화 제안부터 주문과 배송까지 하나의 플랫폼에서 운영할 수 있습니다.
          </p>
          <Link
            to="/studio/orders"
            className="mt-10 inline-flex rounded bg-white px-8 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-brand-700 transition hover:bg-surface-low"
          >
            크리에이터 스튜디오
          </Link>
        </div>
      </section>
    </>
  );
}
