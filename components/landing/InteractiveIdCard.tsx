"use client";

import { useRef, useState, type MouseEvent } from "react";
import { QrCode } from "lucide-react";

const MAX_TILT = 9;

export interface InteractiveIdCardProps {
  /**
   * "cropped": tall strap with no visible top — intended to be placed where an
   * ancestor's overflow-hidden crops the top, so it reads as continuing off-frame.
   * "clipped": short strap with a visible metal clip on top — self-contained,
   * for contexts (e.g. mobile, in normal document flow) with no crop above it.
   */
  variant?: "cropped" | "clipped";
}

const STRAP_HEIGHT = { cropped: 320, clipped: 108 } as const;
const STRAP_ROTATION = 12;

function LanyardStrap({
  side,
  height,
}: {
  side: "left" | "right";
  height: number;
}) {
  const rotation = side === "left" ? -STRAP_ROTATION : STRAP_ROTATION;
  return (
    <div
      className="absolute bottom-0 left-1/2 w-4 origin-bottom"
      style={{ height, transform: `translateX(-50%) rotate(${rotation}deg)` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-accent2/95 via-accent2/85 to-accent2/65" />
      <div className="absolute inset-y-0 left-0.5 w-[3px] rounded-full bg-white/35" />
      <div className="absolute inset-y-0 right-0 w-[3px] bg-navy-950/30" />
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <span
          className="whitespace-nowrap font-technical text-[7px] font-bold tracking-[0.3em] text-navy-950/60"
          style={{ writingMode: "vertical-rl" }}
        >
          U SCANNER • U SCANNER • U SCANNER • U SCANNER
        </span>
      </div>
    </div>
  );
}

export function InteractiveIdCard({
  variant = "clipped",
}: InteractiveIdCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * MAX_TILT * 2, y: (px - 0.5) * MAX_TILT * 2 });
    setGlare({ x: px * 100, y: py * 100 });
  }

  function handleMouseEnter() {
    setIsHovering(true);
  }

  function handleMouseLeave() {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50 });
  }

  return (
    <div
      className="relative mx-auto w-[224px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="lanyard-sway"
        style={{ animationPlayState: isHovering ? "paused" : "running" }}
      >
        {variant === "clipped" && (
          <div className="flex flex-col items-center">
            <div className="h-4 w-9 rounded-[3px] bg-gradient-to-b from-slate-200 via-slate-400 to-slate-600 shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
            <div className="-mt-0.5 h-3 w-3 rounded-full border-[2.5px] border-slate-400 bg-navy-900" />
          </div>
        )}

        {/* V-shaped lanyard, like a strap worn around the neck. In "cropped"
            variant it's tall so an ancestor's overflow-hidden crops the top,
            reading as continuing up out of view rather than starting from a
            fixed point on-screen. */}
        <div
          className="relative mx-auto w-full"
          style={{ height: STRAP_HEIGHT[variant] }}
        >
          <LanyardStrap side="left" height={STRAP_HEIGHT[variant]} />
          <LanyardStrap side="right" height={STRAP_HEIGHT[variant]} />
        </div>

        {/* Plastic clip where both straps converge, then the swivel ring into the badge */}
        <div className="relative z-10 mx-auto -mt-1 h-4 w-11 rounded-[3px] bg-gradient-to-b from-slate-100 via-slate-300 to-slate-500 shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-slate-600/40" />
        </div>
        <div className="mx-auto h-3.5 w-3.5 rounded-full border-[2.5px] border-slate-400 bg-navy-900 shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />

        <div className="-mt-px [perspective:1300px] [perspective-origin:50%_0%]">
          <div
            ref={cardRef}
            role="button"
            tabIndex={0}
            aria-pressed={isFlipped}
            aria-label="유스캐너 사원증 (클릭하면 뒤집힙니다)"
            onMouseMove={handleMouseMove}
            onClick={() => setIsFlipped((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsFlipped((current) => !current);
              }
            }}
            className="relative h-[296px] w-[224px] cursor-pointer select-none [transform-style:preserve-3d] transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent2"
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${
                tilt.y + (isFlipped ? 180 : 0)
              }deg)`,
              transformOrigin: "top center",
            }}
          >
            {/* Front */}
            <div className="absolute inset-0 overflow-hidden rounded-xl border border-grid-strong bg-accent shadow-[0_24px_60px_-15px_rgba(0,0,0,0.65)] [backface-visibility:hidden]">
              {/* Navy lower section, cut with a wave into the orange block above */}
              <div
                className="absolute -inset-x-10 bottom-0 h-[58%] bg-panel"
                style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0" }}
                aria-hidden="true"
              />

              <div
                className="pointer-events-none absolute inset-0 z-10 opacity-50"
                style={{
                  background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.25), transparent 55%)`,
                }}
              />

              <span className="absolute left-3 top-3 z-20 grid h-6 w-6 place-items-center rounded border border-white/70 bg-white/10 font-technical text-[10px] font-bold text-white">
                U
              </span>

              {/* Photo, straddling the orange/navy boundary for a layered, breaking-the-frame feel */}
              <div className="absolute left-1/2 top-[36%] z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-4 border-panel bg-navy-800 shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
                  <span className="text-5xl grayscale" aria-hidden="true">
                    👤
                  </span>
                </div>
              </div>

              {/* Company mark, printed vertically along the right edge */}
              <span
                className="absolute bottom-6 right-2.5 z-20 whitespace-nowrap font-technical text-[8px] font-bold tracking-[0.25em] text-muted-dim"
                style={{ writingMode: "vertical-rl" }}
              >
                U SCANNER
              </span>

              <div className="absolute inset-x-0 bottom-0 z-20 p-4 pr-7">
                <span
                  className="block h-1.5 w-4 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <p className="mt-2 text-lg font-bold text-ink">판독 대기</p>
                <p className="mt-0.5 font-technical text-[8px] tracking-[0.15em] text-muted-dim">
                  PENDING IDENTIFICATION
                </p>
                <p className="mt-1.5 text-[11px] font-semibold text-accent">
                  발견 전
                </p>
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-grid-strong bg-panel p-4 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.65)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="h-7 w-full rounded-sm bg-navy-950" />

              <div className="mt-2 flex flex-1 items-center justify-center">
                <QrCode
                  aria-hidden="true"
                  size={64}
                  className="text-muted-dim"
                />
              </div>

              <div className="text-center">
                <p className="text-[14px] font-medium text-ink">
                  아직 발급되지 않은 사원증입니다
                </p>
                <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] leading-tight text-muted">
                  검색의 한계를 넘어 취업의 가능성을 발견하세요
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
