"use client";

import { useRef, useEffect, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  threshold?: number;
}

export default function ScrollReveal({ children, className = "", stagger = false, threshold = 0.15 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-visible", "true");
          observer.unobserve(el);
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={`${stagger ? "reveal-stagger" : "reveal"} ${className}`}>
      {children}
    </div>
  );
}
