import { Download, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * How to get a driver going: install the app, log in. The server address is built into
 * the app (driver_app/lib/src/config.dart), so drivers never type it.
 */
export function AppSetupCard({ apkUrl, apkUpdatedOn }: { apkUrl: string | null; apkUpdatedOn: string | null }) {
  return (
    <Card size="sm" className="mb-5">
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2.5 text-sm">
            <p className="font-semibold">Driver app setup</p>
            <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
              <li>
                Install the <span className="font-medium text-foreground">Bus Driver</span>{" "}
                Android app on the driver&apos;s phone{" "}
                {apkUrl ? (
                  <>
                    —{" "}
                    <a href={apkUrl} download className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      <Download className="h-3.5 w-3.5" /> Download APK
                    </a>
                    {apkUpdatedOn && <span className="text-xs"> (updated {apkUpdatedOn})</span>}
                  </>
                ) : (
                  "(build it from the driver_app folder)."
                )}
              </li>
              <li>
                On first open, allow location <span className="font-medium text-foreground">&quot;All the time&quot;</span>.
              </li>
              <li>Log in with the username and password created below, then tap Drive.</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
