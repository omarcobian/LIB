"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase";
import type { MateriaAntiguaConEquivalencia, MateriaNueva } from "@/lib/types";

interface Props {
  antiguas: MateriaAntiguaConEquivalencia[];
  nuevas: MateriaNueva[];
}

export function GestorMaterias({ antiguas, nuevas }: Props) {
  const supabase = createClient();
  const [rows, setRows] = useState(antiguas);
  const [nuevasPlanNuevo, setNuevasPlanNuevo] = useState({ clave: "", nombre: "", creditos: "", semestre: "" });
  const [nuevasPlanAntiguo, setNuevasPlanAntiguo] = useState({ clave: "", nombre: "", creditos: "", semestre: "" });
  const [message, setMessage] = useState<string | null>(null);

  const saveEquiv = async (materiaAntiguaId: string, materiaNuevaId: string | null) => {
    setMessage(null);
    if (!materiaNuevaId) {
      await supabase.from("equivalencias").delete().eq("materia_antigua_id", materiaAntiguaId);
      setMessage("Equivalencia eliminada.");
      return;
    }

    const { error } = await supabase
      .from("equivalencias")
      .upsert({ materia_antigua_id: materiaAntiguaId, materia_nueva_id: materiaNuevaId }, { onConflict: "materia_antigua_id" });

    setMessage(error ? "Error al guardar equivalencia." : "Equivalencia guardada.");
  };

  const addMateria = async (table: "materias_antiguas" | "materias_nuevas", values: typeof nuevasPlanNuevo) => {
    setMessage(null);
    const payload = {
      clave: values.clave,
      nombre: values.nombre,
      creditos: Number(values.creditos),
      semestre: values.semestre ? Number(values.semestre) : null,
    };

    const { error } = await supabase.from(table).insert(payload);
    setMessage(error ? "Error al agregar materia." : "Materia agregada. Recarga para verla en la lista.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Materia antigua</TableHead>
              <TableHead>Equivalencia nueva</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {row.clave} - {row.nombre}
                </TableCell>
                <TableCell>
                  <select
                    className="w-full rounded border p-2"
                    value={row.materia_nueva?.id ?? ""}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id
                            ? { ...item, materia_nueva: nuevas.find((n) => n.id === value) ?? null }
                            : item,
                        ),
                      );
                      void saveEquiv(row.id, value);
                    }}
                  >
                    <option value="">Sin equivalencia</option>
                    {nuevas.map((materia) => (
                      <option key={materia.id} value={materia.id}>
                        {materia.clave} - {materia.nombre}
                      </option>
                    ))}
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border p-4">
          <h3 className="font-semibold">Agregar materia al plan antiguo</h3>
          <Label>Clave</Label>
          <Input value={nuevasPlanAntiguo.clave} onChange={(e) => setNuevasPlanAntiguo((p) => ({ ...p, clave: e.target.value }))} />
          <Label>Nombre</Label>
          <Input value={nuevasPlanAntiguo.nombre} onChange={(e) => setNuevasPlanAntiguo((p) => ({ ...p, nombre: e.target.value }))} />
          <Label>Créditos</Label>
          <Input type="number" value={nuevasPlanAntiguo.creditos} onChange={(e) => setNuevasPlanAntiguo((p) => ({ ...p, creditos: e.target.value }))} />
          <Label>Semestre</Label>
          <Input type="number" value={nuevasPlanAntiguo.semestre} onChange={(e) => setNuevasPlanAntiguo((p) => ({ ...p, semestre: e.target.value }))} />
          <Button onClick={() => void addMateria("materias_antiguas", nuevasPlanAntiguo)}>Agregar</Button>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <h3 className="font-semibold">Agregar materia al plan nuevo</h3>
          <Label>Clave</Label>
          <Input value={nuevasPlanNuevo.clave} onChange={(e) => setNuevasPlanNuevo((p) => ({ ...p, clave: e.target.value }))} />
          <Label>Nombre</Label>
          <Input value={nuevasPlanNuevo.nombre} onChange={(e) => setNuevasPlanNuevo((p) => ({ ...p, nombre: e.target.value }))} />
          <Label>Créditos</Label>
          <Input type="number" value={nuevasPlanNuevo.creditos} onChange={(e) => setNuevasPlanNuevo((p) => ({ ...p, creditos: e.target.value }))} />
          <Label>Semestre</Label>
          <Input type="number" value={nuevasPlanNuevo.semestre} onChange={(e) => setNuevasPlanNuevo((p) => ({ ...p, semestre: e.target.value }))} />
          <Button onClick={() => void addMateria("materias_nuevas", nuevasPlanNuevo)}>Agregar</Button>
        </div>
      </div>

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
