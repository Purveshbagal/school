export function DocumentHeader({
  docType,
  schoolName,
  address,
  udise,
  phone,
  topLeft,
  topRight,
}: {
  docType: string;
  schoolName: string;
  address?: string | null;
  udise?: string | null;
  phone?: string | null;
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
}) {
  return (
    <div className="border-b-2 border-blue-700 pb-4">
      <p className="mb-2 text-center text-xs font-semibold tracking-widest text-blue-700 uppercase">
        {docType}
      </p>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-1 sm:h-20 sm:w-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/image/logo.jpeg"
            alt="School Logo"
            className="h-12 w-12 object-contain sm:h-16 sm:w-16"
          />
          {topLeft && <div className="text-center text-[9px] leading-tight text-slate-600 sm:text-[11px]">{topLeft}</div>}
        </div>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-lg leading-tight font-bold text-slate-900 sm:text-2xl">{schoolName}</h1>
          {address && <p className="text-xs text-slate-500 sm:text-sm">{address}</p>}
          {(udise || phone) && (
            <p className="text-[10px] text-slate-400 sm:text-xs">
              {udise && `UDISE: ${udise}`}
              {udise && phone && "  ·  "}
              {phone && `Ph: ${phone}`}
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center sm:h-20 sm:w-20">
          {topRight && <div className="text-center text-[9px] leading-tight text-slate-600 sm:text-[11px]">{topRight}</div>}
        </div>
      </div>
    </div>
  );
}
