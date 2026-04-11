import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import VerifiedBadge from "../components/VerifiedBadge";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";
import { useAuth } from "../auth/AuthContext";
import { listEditions } from "../api/editions";
import { formatChannelHandle } from "../lib/channelHandle";
import { estimateEditionPricing } from "../lib/sweetbookWorkflow";
import type { EditionSummary } from "../types/api";

const QUICK_FILTERS = ["오늘의 추천", "팬북", "리캡 포토북", "공식 에디션"] as const;

const SHOPPING_BENEFITS = [
  {
    label: "간편 주문",
    title: "고르고 바로 주문까지",
    description: "마음에 드는 에디션을 고른 뒤 이름과 한마디만 더하면 나만의 포토북 주문이 시작됩니다.",
  },
  {
    label: "나만의 한 권",
    title: "같은 에디션, 다른 이야기",
    description: "좋아한 장면, 추억 한 줄, 내 사진까지 더해 세상에 하나뿐인 포토북으로 완성하세요.",
  },
  {
    label: "실물 배송",
    title: "진짜 책으로 받아보기",
    description: "결제가 끝나면 인쇄와 제본을 거쳐 실물 포토북이 집 앞까지 배송됩니다.",
  },
] as const;

const MALL_SIGNALS = [
  { value: "공식 에디션", caption: "크리에이터가 직접 만든 한정판" },
  { value: "개인화 제작", caption: "내 문장과 사진을 더해 완성" },
  { value: "실물 배송", caption: "결제 후 포토북으로 받아보기" },
] as const;

const PRODUCT_STICKERS = [
  "지금 가장 인기 있는",
  "팬 개인화 인기",
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
              <p className="editorial-label">크리에이터 포토북</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-tight text-stone-900 md:text-6xl">
                좋아하는 크리에이터의
                <br />
                포토북, 내 손안에
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-warm-500">
                크리에이터가 만든 공식 에디션을 고르고, 나만의 문장과 추억을 더해 세상에 하나뿐인
                포토북을 주문하세요.
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
                      src={featuredEdition?.coverImageUrl || "/demo-assets/playpick-hero.svg"}
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
                          "크리에이터가 직접 고른 장면에 팬의 이야기를 더해 완성하는 한정판 포토북입니다."}
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
                  src={edition.coverImageUrl || "/demo-assets/playpick-hero.svg"}
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
                마음에 드는 에디션을 고르고, 내 이야기를 더한 뒤 미리보기까지 확인하고 주문하세요.
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
                        src={edition.coverImageUrl || "/demo-assets/playpick-hero.svg"}
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
                        {edition.subtitle || "크리에이터가 직접 고른 장면에 나만의 이야기를 더해 완성하는 한정판 포토북입니다."}
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
                고르고, 채우고,
                <br />
                내 포토북으로 완성
              </h2>
              <p className="mt-5 text-base leading-relaxed text-warm-500">
                주문은 간단하게, 결과물은 특별하게. 내 이야기를 담아 세상에 하나뿐인 포토북을 받아보세요.
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
                    description: "마음에 드는 크리에이터의 포토북 에디션을 골라주세요.",
                  },
                  {
                    step: "02",
                    title: "개인화",
                    description: "닉네임, 좋아하는 장면, 한마디를 적어 나만의 버전으로 만들어요.",
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
                      크리에이터가 직접 만든 공식 에디션
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-warm-500">
                      크리에이터가 공개한 에디션을 한눈에 보고, 마음에 드는 포토북을 골라 바로 개인화와 주문을 시작하세요.
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
                          src={edition.coverImageUrl || "/demo-assets/playpick-hero.svg"}
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
            크리에이터라면, 나만의 포토북을 만들어보세요
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-100">
            나의 장면과 메시지를 담은 공식 에디션을 만들고, 팬 주문부터 배송까지 스튜디오에서 관리할 수 있습니다.
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
