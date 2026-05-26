import { MateriasSelector } from "@/components/alumno/MateriasSelector";
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

export default async function HomePage() {
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabase = await createClient();

  const { data: antiguas } = await supabase
    .from("materias_antiguas")
    .select("id, clave, nombre, creditos, semestre, equivalencias(materia_nueva_id, materias_nuevas(id, clave, nombre, creditos, semestre))")
    .order("semestre", { ascending: true })
    .order("clave", { ascending: true });

  const materias: MateriaAntiguaConEquivalencia[] = ((antiguas as MateriaAntiguaRaw[] | null) ?? []).map((item) => ({
    id: item.id,
    clave: item.clave,
    nombre: item.nombre,
    creditos: item.creditos,
    semestre: item.semestre,
    materia_nueva: item.equivalencias?.[0]?.materias_nuevas ?? null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sistema de Equivalencias de Plan de Estudios</h1>
      <p className="text-slate-600">Selecciona materias del plan antiguo para generar tu solicitud.</p>
      <MateriasSelector materias={materias} />
    </div>
  );
}
