import { Card } from "@/components/ui/card";

export function Confirmacion({ folio }: { folio: string }) {
  return (
    <Card className="max-w-xl">
      <h2 className="text-xl font-semibold">Solicitud enviada con éxito</h2>
      <p className="mt-2">Tu folio de seguimiento es:</p>
      <p className="mt-1 text-2xl font-bold text-blue-700">{folio}</p>
    </Card>
  );
}
