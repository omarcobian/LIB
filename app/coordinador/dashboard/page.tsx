import Link from "next/link";
import { redirect } from "next/navigation";
import { TablaSolicitudes } from "@/components/coordinador/TablaSolicitudes";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase-server";
import type { Solicitud } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/coordinador/login");
  }

  const { data } = await supabase
    .from("solicitudes")
    .select("id, nombre_alumno, codigo_alumno, fecha, estado, observaciones")
    .order("fecha", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Dashboard de solicitudes</h1>
        <Link href="/coordinador/materias">
          <Button variant="outline">Gestionar materias</Button>
        </Link>
      </div>
      <TablaSolicitudes solicitudes={(data as Solicitud[]) ?? []} />
    </div>
  );
}
