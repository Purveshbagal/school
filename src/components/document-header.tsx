export function DocumentHeader({
  docType,
  schoolName,
  address,
  udise,
  phone,
}: {
  docType: string;
  schoolName: string;
  address?: string | null;
  udise?: string | null;
  phone?: string | null;
}) {
  return (
    <div className="border-b-2 border-blue-700 pb-4">
      <p className="mb-2 text-center text-xs font-semibold tracking-widest text-blue-700 uppercase">
        {docType}
      </p>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/image/logo.jpeg"
          alt="School Logo"
          className="h-12 w-12 shrink-0 object-contain sm:h-20 sm:w-20"
        />
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
        <div className="hidden h-20 w-20 shrink-0 sm:block" />
      </div>
    </div>
  );
}
