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
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/image/logo.jpeg"
          alt="School Logo"
          className="h-20 w-20 shrink-0 object-contain"
        />
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold text-slate-900">{schoolName}</h1>
          {address && <p className="text-sm text-slate-500">{address}</p>}
          {(udise || phone) && (
            <p className="text-xs text-slate-400">
              {udise && `UDISE: ${udise}`}
              {udise && phone && "  ·  "}
              {phone && `Ph: ${phone}`}
            </p>
          )}
        </div>
        <div className="h-20 w-20 shrink-0" />
      </div>
    </div>
  );
}
