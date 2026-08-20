"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteButton } from "@/components/delete-button";
import { AddNameForm } from "./add-name-form";
import {
  addDistrictAction,
  deleteDistrictAction,
  addTalukaAction,
  deleteTalukaAction,
  addVillageAction,
  deleteVillageAction,
} from "@/app/actions/locations";
import { ChevronRight, ChevronDown, MapPin } from "lucide-react";

type Village = { id: string; name: string };
type Taluka = { id: string; name: string; villages: Village[] };
type District = { id: string; name: string; talukas: Taluka[] };

export function LocationsManager({ districts }: { districts: District[] }) {
  const [openDistricts, setOpenDistricts] = useState<Set<string>>(new Set());
  const [openTalukas, setOpenTalukas] = useState<Set<string>>(new Set());

  function toggleDistrict(id: string) {
    setOpenDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleTaluka(id: string) {
    setOpenTalukas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <Card className="mb-6">
        <CardContent>
          <AddNameForm action={addDistrictAction} placeholder="e.g. Kolhapur" buttonLabel="Add District" />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {districts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <MapPin className="h-8 w-8 text-muted-foreground/40" />
              <p>No districts added yet. Add one above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {districts.map((d) => {
                const districtOpen = openDistricts.has(d.id);
                return (
                  <div key={d.id} className="rounded-lg border border-border">
                    <div className="flex items-center gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => toggleDistrict(d.id)}
                        className="flex flex-1 items-center gap-2 text-left font-medium"
                      >
                        {districtOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        {d.name}
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {d.talukas.length} taluka{d.talukas.length === 1 ? "" : "s"}
                      </span>
                      <DeleteButton
                        action={deleteDistrictAction}
                        hiddenFields={{ id: d.id }}
                        confirmMessage={`Delete "${d.name}"? This also deletes all its talukas and villages. This cannot be undone.`}
                      />
                    </div>

                    {districtOpen && (
                      <div className="space-y-2 border-t border-border p-3 pl-8">
                        <AddNameForm
                          action={addTalukaAction}
                          hiddenFields={{ districtId: d.id }}
                          placeholder="e.g. Karveer"
                          buttonLabel="Add Taluka"
                        />

                        {d.talukas.length === 0 ? (
                          <p className="py-2 text-sm text-muted-foreground">No talukas added yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {d.talukas.map((t) => {
                              const talukaOpen = openTalukas.has(t.id);
                              return (
                                <div key={t.id} className="rounded-lg border border-border">
                                  <div className="flex items-center gap-2 p-2.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleTaluka(t.id)}
                                      className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
                                    >
                                      {talukaOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                                      {t.name}
                                    </button>
                                    <span className="text-xs text-muted-foreground">
                                      {t.villages.length} village{t.villages.length === 1 ? "" : "s"}
                                    </span>
                                    <DeleteButton
                                      action={deleteTalukaAction}
                                      hiddenFields={{ id: t.id }}
                                      confirmMessage={`Delete "${t.name}"? This also deletes all its villages. This cannot be undone.`}
                                    />
                                  </div>

                                  {talukaOpen && (
                                    <div className="space-y-2 border-t border-border p-2.5 pl-7">
                                      <AddNameForm
                                        action={addVillageAction}
                                        hiddenFields={{ talukaId: t.id }}
                                        placeholder="e.g. Kasaba Bawada"
                                        buttonLabel="Add Village"
                                      />
                                      {t.villages.length === 0 ? (
                                        <p className="py-1 text-sm text-muted-foreground">No villages added yet.</p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {t.villages.map((v) => (
                                            <div
                                              key={v.id}
                                              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5"
                                            >
                                              <p className="text-sm">{v.name}</p>
                                              <DeleteButton
                                                action={deleteVillageAction}
                                                hiddenFields={{ id: v.id }}
                                                confirmMessage={`Delete "${v.name}"?`}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
