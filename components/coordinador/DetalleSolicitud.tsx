"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { ReporteImprimible } from "@/components/coordinador/ReporteImprimible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase";
import type { EstadoSolicitud, MateriaNueva, SolicitudDetalle } from "@/lib/types";

interface Props {
  solicitud: SolicitudDetalle;
  materiasNuevas: MateriaNueva[];
}

export function DetalleSolicitud({ solicitud, materiasNuevas }: Props) {
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(solicitud.materias);
  const [estado, setEstado] = useState<EstadoSolicitud>(solicitud.estado);
  const [observaciones, setObservaciones] = useState(solicitud.observaciones ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSave = useMemo(() => !saving, [saving]);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const onSave = async () => {
    setSaving(true);
    setMessage(null);

    const { error: solicitudError } = await supabase
      .from("solicitudes")
      .update({ estado, observaciones })
      .eq("id", solicitud.id);

    if (solicitudError) {
      setSaving(false);
      setMessage("Error al actualizar la solicitud.");
      return;
    }

    const payload = rows.map((row) => ({ id: row.id, materia_nueva_id: row.materia_nueva_id }));
    const { error: materiasError } = await supabase.from("solicitud_materias").upsert(payload);

    setSaving(false);

    if (materiasError) {
      setMessage("Estado guardado, pero hubo error al actualizar equivalencias.");
      return;
    }

    setMessage("Cambios guardados correctamente.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 no-print">
        <Link
          href="/coordinador/dashboard"
          className="inline-flex items-center justify-center rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Volver al dashboard
        </Link>
        <Button variant="outline" onClick={handlePrint}>Imprimir reporte</Button>
        <Button onClick={onSave} disabled={!canSave}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
      </div>

      <div className="rounded-lg border p-4">
        <p><strong>Folio:</strong> {solicitud.id}</p>
        <p><strong>Alumno:</strong> {solicitud.nombre_alumno}</p>
        <p><strong>Código:</strong> {solicitud.codigo_alumno}</p>
        <p><strong>Fecha:</strong> {new Date(solicitud.fecha).toLocaleString()}</p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan antiguo</TableHead>
              <TableHead>Plan nuevo (editable)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {row.materia_antigua.clave} - {row.materia_antigua.nombre}
                </TableCell>
                <TableCell>
                  <select
                    className="w-full rounded border p-2"
                    value={row.materia_nueva_id ?? ""}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setRows((prev) =>
                        prev.map((item) => (item.id === row.id ? { ...item, materia_nueva_id: value } : item)),
                      );
                    }}
                  >
                    <option value="">Sin equivalencia</option>
                    {materiasNuevas.map((materia) => (
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

      <div className="space-y-2">
        <Label>Estado</Label>
        <select className="w-full rounded border p-2" value={estado} onChange={(e) => setEstado(e.target.value as EstadoSolicitud)}>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Observaciones</Label>
        <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      {message && <p className="text-sm">{message}</p>}

      <ReporteImprimible
        ref={printRef}
        nombre={solicitud.nombre_alumno}
        codigo={solicitud.codigo_alumno}
        fecha={solicitud.fecha}
        estado={estado}
        observaciones={observaciones}
        rows={rows}
        materiasNuevas={materiasNuevas}
      />
    </div>
  );
}
