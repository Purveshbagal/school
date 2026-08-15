/** Faint logo watermark centered behind a printable document's content. The
 * parent must be `relative overflow-hidden`, and the real content must be wrapped
 * in a sibling with `relative z-10` so it paints above this. */
export function DocumentWatermark({ widthClassName = "w-4/5" }: { widthClassName?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/image/logo.jpeg"
        alt=""
        aria-hidden
        className={`${widthClassName} object-contain opacity-[0.08]`}
      />
    </div>
  );
}
