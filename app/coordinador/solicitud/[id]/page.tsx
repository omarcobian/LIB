import { notFound, redirect } from "next/navigation";
import { DetalleSolicitud } from "@/components/coordinador/DetalleSolicitud";
import { createClient } from "@/lib/supabase-server";
import type { MateriaAntigua, MateriaNueva, Solicitud, SolicitudDetalle } from "@/lib/types";

type SolicitudMateriaRaw = {
  id: string;
  materia_antigua_id: string;
  materia_nueva_id: string | null;
  materias_antiguas: MateriaAntigua;
  materias_nuevas: MateriaNueva | null;
};

export default async function SolicitudDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/coordinador/login");
  }

  const { data: solicitud } = await supabase
    .from("solicitudes")
    .select("id, nombre_alumno, codigo_alumno, fecha, estado, observaciones")
    .eq("id", params.id)
    .single();

  if (!solicitud) {
    notFound();
  }

  const { data: materiasSolicitud } = await supabase
    .from("solicitud_materias")
    .select("id, materia_antigua_id, materia_nueva_id, materias_antiguas(id, clave, nombre, creditos, semestre), materias_nuevas(id, clave, nombre, creditos, semestre)")
    .eq("solicitud_id", params.id);

  const { data: materiasNuevas } = await supabase
    .from("materias_nuevas")
    .select("id, clave, nombre, creditos, semestre")
    .order("clave", { ascending: true });

  const detalle: SolicitudDetalle = {
    ...(solicitud as Solicitud),
    materias: ((materiasSolicitud as SolicitudMateriaRaw[] | null) ?? []).map((item) => ({
      id: item.id,
      materia_antigua_id: item.materia_antigua_id,
      materia_nueva_id: item.materia_nueva_id,
      materia_antigua: item.materias_antiguas,
      materia_nueva: item.materias_nuevas,
    })),
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Detalle de solicitud</h1>
      <DetalleSolicitud solicitud={detalle} materiasNuevas={((materiasNuevas as MateriaNueva[] | null) ?? [])} />
    </div>
  );
}
