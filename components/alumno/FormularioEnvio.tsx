"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  nombre: string;
  codigo: string;
  loading: boolean;
  error: string | null;
  onNombreChange: (value: string) => void;
  onCodigoChange: (value: string) => void;
  onSubmit: () => void;
}

export function FormularioEnvio({
  nombre,
  codigo,
  loading,
  error,
  onNombreChange,
  onCodigoChange,
  onSubmit,
}: Props) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => onNombreChange(e.target.value)}
          placeholder="Ej. Ana Pérez Gómez"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="codigo">Código de estudiante</Label>
        <Input
          id="codigo"
          value={codigo}
          onChange={(e) => onCodigoChange(e.target.value)}
          placeholder="Ej. 20201234"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={onSubmit} disabled={loading}>
        {loading ? "Enviando..." : "Enviar solicitud"}
      </Button>
    </div>
  );
}
