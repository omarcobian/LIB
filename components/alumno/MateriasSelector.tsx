"use client";

import { useMemo, useState } from "react";
import { Confirmacion } from "@/components/alumno/Confirmacion";
import { EquivalenciasPreview } from "@/components/alumno/EquivalenciasPreview";
import { FormularioEnvio } from "@/components/alumno/FormularioEnvio";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import type { MateriaAntiguaConEquivalencia } from "@/lib/types";

interface Props {
  materias: MateriaAntiguaConEquivalencia[];
}

export function MateriasSelector({ materias }: Props) {
  const supabase = createClient();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folio, setFolio] = useState<string | null>(null);

  const materiasSeleccionadas = useMemo(
    () => materias.filter((m) => selected[m.id]),
    [materias, selected],
  );

  const materiasPorSemestre = useMemo(() => {
    return materias.reduce<Record<string, MateriaAntiguaConEquivalencia[]>>((acc, materia) => {
      const key = materia.semestre ? `Semestre ${materia.semestre}` : "Sin semestre";
      acc[key] = acc[key] ?? [];
      acc[key].push(materia);
      return acc;
    }, {});
  }, [materias]);

  const semestresOrdenados = useMemo(() => {
    return Object.entries(materiasPorSemestre).sort(([a], [b]) => {
      if (a === "Sin semestre") return 1;
      if (b === "Sin semestre") return -1;
      const aNum = Number(a.replace("Semestre ", ""));
      const bNum = Number(b.replace("Semestre ", ""));
      return aNum - bNum;
    });
  }, [materiasPorSemestre]);

  const onSubmit = async () => {
    setError(null);

    if (!nombre.trim() || !codigo.trim()) {
      setError("Debes capturar nombre y código.");
      return;
    }

    if (materiasSeleccionadas.length === 0) {
      setError("Selecciona al menos una materia.");
      return;
    }

    setLoading(true);
    const { data: solicitud, error: solicitudError } = await supabase
      .from("solicitudes")
      .insert({ nombre_alumno: nombre.trim(), codigo_alumno: codigo.trim() })
      .select("id")
      .single();

    if (solicitudError || !solicitud) {
      setLoading(false);
      setError("No se pudo guardar la solicitud.");
      return;
    }

    const materiasRows = materiasSeleccionadas.map((materia) => ({
      solicitud_id: solicitud.id,
      materia_antigua_id: materia.id,
      materia_nueva_id: materia.materia_nueva?.id ?? null,
    }));

    const { error: materiasError } = await supabase.from("solicitud_materias").insert(materiasRows);

    setLoading(false);

    if (materiasError) {
      setError("La solicitud se creó, pero falló al guardar materias.");
      return;
    }

    setFolio(solicitud.id);
  };

  if (folio) {
    return <Confirmacion folio={folio} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Selecciona tus materias del plan antiguo</h2>
        <p className="mb-4 text-sm text-slate-600">
          Vista tipo malla curricular: marca las materias que deseas incluir en tu solicitud.
        </p>
        <div className="space-y-5">
          {semestresOrdenados.map(([semestre, materiasSemestre]) => (
            <div key={semestre} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <h3 className="mb-3 inline-flex items-center rounded-md bg-black px-3 py-1 text-sm font-semibold text-white">
                {semestre}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {materiasSemestre.map((materia) => {
                  const isSelected = !!selected[materia.id];
                  return (
                    <label
                      key={materia.id}
                      className={`group relative cursor-pointer overflow-hidden rounded-md border-2 transition ${
                        isSelected
                          ? "border-cyan-500 bg-[repeating-linear-gradient(135deg,rgba(6,182,212,0.2)_0,rgba(6,182,212,0.2)_8px,rgba(255,255,255,0.96)_8px,rgba(255,255,255,0.96)_16px)]"
                          : "border-slate-300 bg-white hover:border-cyan-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [materia.id]: e.target.checked }))}
                      />
                      <div className="flex items-center justify-between border-b bg-black px-2 py-1 text-xs font-semibold text-white">
                        <span>{materia.clave}</span>
                        <span>{materia.creditos}c</span>
                      </div>
                      <div className="min-h-20 px-3 py-3 text-center text-xs font-medium uppercase leading-tight text-slate-900">
                        {materia.nombre}
                      </div>
                      <div className="flex items-center justify-between border-t bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                        <span>{materia.materia_nueva ? "Con equivalencia" : "Sin equivalencia"}</span>
                        <span
                          className={`h-3 w-3 rounded-sm border ${
                            isSelected ? "border-cyan-600 bg-cyan-500" : "border-slate-400 bg-white"
                          }`}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Preview de equivalencias</h2>
        {materiasSeleccionadas.length === 0 ? (
          <p className="text-sm text-slate-600">Selecciona materias para ver la equivalencia.</p>
        ) : (
          <EquivalenciasPreview materias={materiasSeleccionadas} />
        )}
      </Card>

      <FormularioEnvio
        nombre={nombre}
        codigo={codigo}
        loading={loading}
        error={error}
        onNombreChange={setNombre}
        onCodigoChange={setCodigo}
        onSubmit={onSubmit}
      />
    </div>
  );
}
