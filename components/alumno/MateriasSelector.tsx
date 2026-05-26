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
        <div className="space-y-4">
          {Object.entries(materiasPorSemestre).map(([semestre, materiasSemestre]) => (
            <div key={semestre}>
              <h3 className="mb-2 font-medium">{semestre}</h3>
              <div className="grid gap-2">
                {materiasSemestre.map((materia) => (
                  <label key={materia.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!selected[materia.id]}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [materia.id]: e.target.checked }))}
                    />
                    <span>
                      {materia.clave} - {materia.nombre}
                    </span>
                  </label>
                ))}
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
