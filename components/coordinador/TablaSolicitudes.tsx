"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase";
import type { EstadoSolicitud, Solicitud } from "@/lib/types";
import { useRouter } from "next/navigation";

interface Props {
  solicitudes: Solicitud[];
}

const estadoClasses: Record<EstadoSolicitud, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  aprobada: "bg-green-100 text-green-700",
  rechazada: "bg-red-100 text-red-700",
};

export function TablaSolicitudes({ solicitudes }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [filtro, setFiltro] = useState<"todas" | EstadoSolicitud>("todas");
  const [busqueda, setBusqueda] = useState("");

  const rows = useMemo(() => {
    return solicitudes.filter((s) => {
      const byEstado = filtro === "todas" || s.estado === filtro;
      const q = busqueda.toLowerCase();
      const byTexto =
        s.nombre_alumno.toLowerCase().includes(q) || s.codigo_alumno.toLowerCase().includes(q);
      return byEstado && byTexto;
    });
  }, [solicitudes, filtro, busqueda]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/coordinador/login");
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button variant={filtro === "todas" ? "default" : "outline"} onClick={() => setFiltro("todas")}>Todas</Button>
        <Button variant={filtro === "pendiente" ? "default" : "outline"} onClick={() => setFiltro("pendiente")}>Pendientes</Button>
        <Button variant={filtro === "aprobada" ? "default" : "outline"} onClick={() => setFiltro("aprobada")}>Aprobadas</Button>
        <Button variant={filtro === "rechazada" ? "default" : "outline"} onClick={() => setFiltro("rechazada")}>Rechazadas</Button>
        <Input
          className="max-w-xs"
          placeholder="Buscar por nombre o código"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Button className="ml-auto" variant="outline" onClick={onLogout}>Cerrar sesión</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((solicitud) => (
              <TableRow key={solicitud.id}>
                <TableCell>{solicitud.nombre_alumno}</TableCell>
                <TableCell>{solicitud.codigo_alumno}</TableCell>
                <TableCell>{new Date(solicitud.fecha).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={estadoClasses[solicitud.estado]}>{solicitud.estado}</Badge>
                </TableCell>
                <TableCell>
                  <Link className="text-blue-600 hover:underline" href={`/coordinador/solicitud/${solicitud.id}`}>
                    Ver detalle
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>Sin resultados.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
