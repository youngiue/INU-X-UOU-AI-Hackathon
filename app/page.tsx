"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { InteractiveIdCard } from "@/components/landing/InteractiveIdCard";
import { SpotlightSection } from "@/components/landing/SpotlightSection";

const STEPS = [
  {
    index: "01",
    title: "나를 AI가 분석",
    body: "전공, 학력, 경력, 프로젝트, 자격증, 기술을 입력하면 AI가 핵심 역량으로 정리합니다.",
  },
  {
    index: "02",
    title: "울산의 채용기회를 발견",
    body: "평소 검색하던 키워드만으로는 보이지 않던 사각지대를, 실제 담당업무·요구 역량 기준으로 다시 찾아냅니다.",
  },
  {
    index: "03",
    title: "AI 직무·공고 매칭",
    body: "전공·경험·기술·근무조건 네 축으로 적합도를 계산해 매칭률을 보여줍니다.",
  },
  {
    index: "04",
    title: "추천 이유 설명",
    body: "점수만이 아니라 왜 이 공고인지, 평소 놓치고 있던 직무는 무엇인지 설명합니다.",
  },
];

function useScrollProgress(containerRef: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    function update() {
      const heroHeight = window.innerHeight;
      const next = Math.min(1, Math.max(0, container!.scrollTop / heroHeight));
      setProgress(next);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    update();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  return progress;
}

function useInView<T extends HTMLElement>(root: RefObject<HTMLElement | null>, threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { root: root.current, threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  return { ref, inView };
}

function StepCard({
  step,
  index,
  scrollRef,
}: {
  step: (typeof STEPS)[number];
  index: number;
  scrollRef: RefObject<HTMLElement | null>;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(scrollRef);

  return (
    <div
      ref={ref}
      className="rounded-lg border border-grid bg-panel/80 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent2/50"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 500ms ease-out ${index * 90}ms, transform 500ms ease-out ${index * 90}ms`,
      }}
    >
      <span className="font-technical text-xs text-muted">{step.index}</span>
      <h3 className="mt-2 text-base font-medium text-ink">{step.title}</h3>
      <p className="mt-2 text-[13px] leading-6 text-muted">{step.body}</p>
    </div>
  );
}

export default function Home() {
  const scrollRef = useRef<HTMLElement>(null);
  const nextSectionRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(scrollRef);

  function goToNextSection() {
    const container = scrollRef.current;
    const target = nextSectionRef.current;
    if (!container || !target) return;

    const startTop = container.scrollTop;
    const targetTop = target.offsetTop;

    // scroll-snap-type: mandatory fights programmatic scrolls (scrollIntoView/scrollTo
    // get yanked back to the current snap point). Disabling snap for the duration of
    // the scroll, then restoring it once settled, sidesteps that conflict. Restoring
    // is done only via the timeout below (not a `scrollend` listener) because a
    // zero-distance scroll attempt can fire `scrollend` immediately, restoring snap
    // before the fallback jump below gets a chance to run.
    container.style.scrollSnapType = "none";
    target.scrollIntoView({ behavior: "smooth", block: "start" });

    window.setTimeout(() => {
      // If the smooth scroll never actually progressed (animation frames can be
      // suppressed in some browser states), fall back to an instant jump so the
      // control never silently does nothing.
      if (Math.abs(container.scrollTop - startTop) < 4) {
        container.scrollTop = targetTop;
      }
      container.style.scrollSnapType = "";
    }, 500);
  }

  return (
    <main ref={scrollRef} className="h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth">
      <section className="relative flex h-screen snap-start flex-col overflow-hidden border-b border-grid bg-navy-950">
        <div
          className="bg-blueprint-grid pointer-events-none absolute inset-0"
          style={{ transform: `translateY(${progress * 18}px)` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy-950/40 via-navy-950/70 to-navy-950" />

        <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 sm:px-8">
          <div className="flex items-center gap-3 pt-8">
            <span className="grid h-9 w-9 place-items-center rounded-md border border-accent2/50 bg-accent2-soft font-technical text-sm font-bold text-accent2">
              U
            </span>
            <strong className="text-[15px] tracking-tight text-ink">울산 커리어 레이더</strong>
            <span className="ml-auto rounded-full border border-grid px-3 py-1 font-technical text-[11px] text-muted">
              AI HACKATHON
            </span>
          </div>

          {/* Badge's lanyard is cropped by the section's overflow-hidden above,
              so it reads as hanging from the very top of the page rather than
              floating as an independent card. It trails the scroll slightly for
              a natural, physical lag. */}
          <div
            className="hidden lg:block lg:absolute lg:right-28 lg:-top-20 transition-transform duration-500 ease-out"
            style={{ transform: `translateY(${progress * -30}px)`, opacity: Math.max(0, 1 - progress * 1.1) }}
          >
            <InteractiveIdCard variant="cropped" />
          </div>
          <div className="mt-6 flex justify-center lg:hidden">
            <InteractiveIdCard />
          </div>

          <div
            className="flex flex-1 flex-col justify-center pb-16"
            style={{ opacity: Math.max(0, 1 - progress * 1.3), transform: `translateY(${progress * -40}px)` }}
          >
            <div className="max-w-2xl">
              <p className="font-technical text-xs tracking-[0.2em] text-accent2">JOB-SIGNAL // ULSAN</p>
              <h1 className="mt-4 text-[40px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[56px]">
                직무명 너머의
                <br />
                <span className="text-accent">숨은 도면</span>을 읽습니다
              </h1>
              <p className="mt-6 max-w-lg text-[15px] leading-7 text-muted">
                전공과 평소 검색 습관이 만든 사각지대 때문에, 나에게 맞는 울산의 기회를
                놓치고 있을 수 있어요. AI가 그 빈틈을 찾아 실제 업무 기준으로 보여드립니다.
              </p>
              <Link
                href="/profile"
                className="mt-9 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-accent-hover"
              >
                내 역량으로 공고 찾기 시작
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={goToNextSection}
          className="absolute inset-x-0 bottom-8 z-20 mx-auto flex flex-col items-center gap-2 text-muted transition-colors hover:text-ink"
          style={{ opacity: Math.max(0, 1 - progress * 3) }}
          aria-label="다음 섹션으로 스크롤"
        >
          <span className="font-technical text-[10px] tracking-[0.25em]">SCROLL TO DISCOVER</span>
          <ArrowDown aria-hidden="true" size={16} className="animate-bob" />
        </button>
      </section>

      <SpotlightSection
        ref={nextSectionRef}
        className="flex min-h-screen snap-start flex-col justify-center bg-blueprint-grid-fine border-b border-grid bg-navy-950"
      >
        <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8">
          <p className="font-technical text-xs tracking-[0.2em] text-accent2">HOW IT WORKS</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">4단계로 완성되는 매칭 도면</h2>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <StepCard key={step.index} step={step} index={index} scrollRef={scrollRef} />
            ))}
          </div>
        </div>
      </SpotlightSection>
    </main>
  );
}
