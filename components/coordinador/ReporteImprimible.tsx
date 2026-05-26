import { forwardRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EstadoSolicitud, MateriaNueva } from "@/lib/types";

interface Row {
  id: string;
  materia_antigua: { clave: string; nombre: string };
  materia_nueva_id: string | null;
  materia_nueva?: MateriaNueva | null;
}

interface Props {
  nombre: string;
  codigo: string;
  fecha: string;
  estado: EstadoSolicitud;
  observaciones: string;
  rows: Row[];
  materiasNuevas: MateriaNueva[];
}

export const ReporteImprimible = forwardRef<HTMLDivElement, Props>(function ReporteImprimible(
  { nombre, codigo, fecha, estado, observaciones, rows, materiasNuevas },
  ref,
) {
  return (
    <div ref={ref} className="print-only hidden p-6 text-black">
      <h1 className="text-xl font-bold">Sistema de Equivalencias de Plan de Estudios</h1>
      <p className="mt-2">Alumno: {nombre}</p>
      <p>Código: {codigo}</p>
      <p>Fecha: {new Date(fecha).toLocaleString()}</p>
      <p>Estado: {estado}</p>
      <div className="mt-4 rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan antiguo</TableHead>
              <TableHead>Plan nuevo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const nueva = materiasNuevas.find((m) => m.id === row.materia_nueva_id) ?? row.materia_nueva ?? null;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.materia_antigua.clave} - {row.materia_antigua.nombre}
                  </TableCell>
                  <TableCell>
                    {nueva ? `${nueva.clave} - ${nueva.nombre}` : "Sin equivalencia asignada"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="mt-4 font-semibold">Observaciones</p>
      <p>{observaciones || "Sin observaciones"}</p>
    </div>
  );
});
