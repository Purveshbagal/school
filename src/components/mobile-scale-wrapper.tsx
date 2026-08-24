"use client";

import { useEffect, useRef, useState } from "react";

/** Below `md`, scales its (fixed-width, e.g. `w-[600px]`) child down to fit the viewport
 * width using a CSS transform, so the full desktop-style layout is visible without
 * reflowing/cramping or needing to scroll horizontally. No-op at `md` and above, and
 * in print (the child's own `print:w-[...]` sizing takes over there). */
export function MobileScaleWrapper({
  desktopWidth,
  children,
}: {
  desktopWidth: number;
  children: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    function update() {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const isMobile = window.innerWidth < 768;
      setScale(isMobile && outer.clientWidth > 0 ? Math.min(1, outer.clientWidth / desktopWidth) : 1);
      setNaturalHeight(inner.scrollHeight);
    }

    update();
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    if (innerRef.current) observer.observe(innerRef.current);
    return () => {
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [desktopWidth]);

  return (
    <div
      ref={outerRef}
      className="w-full print:!h-auto"
      style={{ height: scale !== 1 ? naturalHeight * scale : undefined }}
    >
      <div
        ref={innerRef}
        style={{ width: desktopWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}
        className="mx-auto print:!w-auto print:!scale-100"
      >
        {children}
      </div>
    </div>
  );
}
