import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEditions } from "../api/editions";
import type { EditionSummary } from "../types/api";
import VerifiedBadge from "../components/VerifiedBadge";
import Spinner from "../components/Spinner";
import ErrorBox from "../components/ErrorBox";

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

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-100 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-4 text-sm font-semibold tracking-widest uppercase text-gold-400">
            Creator-Certified Fan Book
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 leading-tight">
            크리에이터가 만든
            <br />
            <span className="text-brand-700">나만의 기념책</span>
          </h1>
          <p className="mt-6 text-lg text-stone-600 max-w-xl mx-auto">
            좋아하는 크리에이터의 Official Edition 위에<br />
            내 추억과 이야기를 담아 세상에 하나뿐인 책을 만드세요.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="#editions"
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
            >
              에디션 둘러보기
            </a>
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/70 px-6 py-3 text-sm font-semibold text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors"
            >
              Creator Studio
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 border-t border-stone-200">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-stone-900 mb-12">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "에디션 선택",
                desc: "크리에이터가 승인한 Official Edition을 고르세요.",
              },
              {
                step: "02",
                title: "개인화",
                desc: "닉네임, 최애 영상, 나만의 메시지를 입력하세요. YouTube 연동도 가능!",
              },
              {
                step: "03",
                title: "책 제작 & 주문",
                desc: "실물 책이 인쇄되어 집 앞으로 배송됩니다.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm shadow-brand-100/30 hover:border-brand-300 transition-colors"
              >
                <span className="text-4xl font-black text-brand-300">
                  {item.step}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-stone-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-stone-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Edition list */}
      <section
        id="editions"
        className="py-16 px-6 border-t border-stone-200"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-stone-900 mb-10">
            Official Editions
          </h2>

          {loading && <Spinner />}
          {error && <ErrorBox message={error} />}
          {!loading && !error && editions.length === 0 && (
            <p className="text-center text-stone-500 py-12">
              아직 등록된 에디션이 없습니다.
            </p>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {editions.map((ed) => (
              <Link
                key={ed.id}
                to={`/editions/${ed.id}`}
                className="group overflow-hidden rounded-2xl border border-stone-200 bg-white/85 transition-all hover:border-brand-300 hover:shadow-lg hover:shadow-brand-100/50"
              >
                <div className="aspect-[4/3] bg-stone-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={`https://picsum.photos/seed/ed${ed.id}/600/450`}
                    alt={ed.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-stone-500">
                    <span>{ed.creatorName}</span>
                    {ed.isVerified && <VerifiedBadge />}
                    <span className="text-stone-400">@{ed.creatorHandle}</span>
                  </div>
                  <h3 className="text-base font-semibold text-stone-900 group-hover:text-brand-700 transition-colors">
                    {ed.title}
                  </h3>
                  {ed.subtitle && (
                    <p className="mt-1 text-sm text-stone-500 line-clamp-2">
                      {ed.subtitle}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
