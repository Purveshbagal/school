"use client";

import { useEffect, useState } from "react";

/** Current time (epoch ms), re-rendering every `intervalMs`. 0 until mounted, so SSR output stays stable. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [intervalMs]);

  return now;
}
