import { redirect } from "next/navigation";
import { GestorMaterias } from "@/components/coordinador/GestorMaterias";
import { createClient } from "@/lib/supabase-server";
import type { MateriaAntiguaConEquivalencia, MateriaNueva } from "@/lib/types";

type MateriaAntiguaRaw = {
  id: string;
  clave: string;
  nombre: string;
  creditos: number;
  semestre: number | null;
  equivalencias: Array<{
    materias_nuevas: MateriaNueva | null;
  }> | null;
};

export default async function MateriasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/coordinador/login");
  }

  const { data: antiguas } = await supabase
    .from("materias_antiguas")
    .select("id, clave, nombre, creditos, semestre, equivalencias(materia_nueva_id, materias_nuevas(id, clave, nombre, creditos, semestre))")
    .order("clave", { ascending: true });

  const { data: nuevas } = await supabase
    .from("materias_nuevas")
    .select("id, clave, nombre, creditos, semestre")
    .order("clave", { ascending: true });

  const antiguasMap: MateriaAntiguaConEquivalencia[] = ((antiguas as MateriaAntiguaRaw[] | null) ?? []).map((item) => ({
    id: item.id,
    clave: item.clave,
    nombre: item.nombre,
    creditos: item.creditos,
    semestre: item.semestre,
    materia_nueva: item.equivalencias?.[0]?.materias_nuevas ?? null,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gestión de equivalencias y materias</h1>
      <GestorMaterias antiguas={antiguasMap} nuevas={((nuevas as MateriaNueva[] | null) ?? [])} />
    </div>
  );
}
