import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MateriaAntiguaConEquivalencia } from "@/lib/types";

interface Props {
  materias: MateriaAntiguaConEquivalencia[];
}

export function EquivalenciasPreview({ materias }: Props) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Materia cursada (plan antiguo)</TableHead>
            <TableHead>Equivalencia (plan nuevo)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materias.map((materia) => (
            <TableRow key={materia.id}>
              <TableCell>
                {materia.clave} - {materia.nombre}
              </TableCell>
              <TableCell>
                {materia.materia_nueva ? (
                  <span>
                    {materia.materia_nueva.clave} - {materia.materia_nueva.nombre}
                  </span>
                ) : (
                  <span className="font-medium text-red-600">Sin equivalencia asignada</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
