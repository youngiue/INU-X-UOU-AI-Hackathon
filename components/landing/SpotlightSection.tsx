"use client";

import { forwardRef, useRef, useState, type MouseEvent, type ReactNode } from "react";

interface SpotlightSectionProps {
  children: ReactNode;
  className?: string;
}

export const SpotlightSection = forwardRef<HTMLDivElement, SpotlightSectionProps>(function SpotlightSection(
  { children, className = "" },
  forwardedRef,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [active, setActive] = useState(false);

  function setRefs(node: HTMLDivElement | null) {
    innerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = innerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
  }

  return (
    <div
      ref={setRefs}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={`relative ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(480px circle at ${pos.x}% ${pos.y}%, rgba(79,195,217,0.14), transparent 65%)`,
        }}
      />
      {children}
    </div>
  );
});
