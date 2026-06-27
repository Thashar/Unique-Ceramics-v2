"use client";

import { useRef, useEffect } from "react";

export default function VacationBanner({
  message,
  returnDate,
}: {
  message: string;
  returnDate?: string;
}) {
  if (!message && !returnDate) {
    return <div className="fixed top-0 left-0 right-0 z-[60] h-5" aria-hidden="true" />;
  }

  let formattedDate = "";
  if (returnDate) {
    try {
      formattedDate = new Date(returnDate + "T00:00:00").toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      formattedDate = returnDate;
    }
  }

  const text = [message, formattedDate].filter(Boolean).join(" — ");

  return <VacationBannerInner text={text} />;
}

function VacationBannerInner({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function fit() {
      const cont = containerRef.current;
      const span = spanRef.current;
      if (!cont || !span) return;

      span.style.fontSize = "13px";
      const available = cont.clientWidth - 24;
      if (span.scrollWidth > available) {
        const ratio = available / span.scrollWidth;
        span.style.fontSize = Math.max(9, Math.floor(13 * ratio * 10) / 10) + "px";
      }
    }

    fit();
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 z-[60] h-5 bg-terracotta text-espresso font-semibold flex items-center justify-center px-3 overflow-hidden tracking-wide"
    >
      <span ref={spanRef} className="whitespace-nowrap" style={{ fontSize: "13px" }}>
        {text}
      </span>
    </div>
  );
}
