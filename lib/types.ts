export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

export interface MateriaAntigua {
  id: string;
  clave: string;
  nombre: string;
  creditos: number;
  semestre: number | null;
}

export interface MateriaNueva {
  id: string;
  clave: string;
  nombre: string;
  creditos: number;
  semestre: number | null;
}

export interface Equivalencia {
  id: string;
  materia_antigua_id: string;
  materia_nueva_id: string;
}

export interface Solicitud {
  id: string;
  nombre_alumno: string;
  codigo_alumno: string;
  fecha: string;
  estado: EstadoSolicitud;
  observaciones: string | null;
}

export interface SolicitudMateria {
  id: string;
  solicitud_id: string;
  materia_antigua_id: string;
  materia_nueva_id: string | null;
}

export interface MateriaAntiguaConEquivalencia extends MateriaAntigua {
  materia_nueva: MateriaNueva | null;
}

export interface SolicitudDetalle extends Solicitud {
  materias: Array<{
    id: string;
    materia_antigua_id: string;
    materia_nueva_id: string | null;
    materia_antigua: MateriaAntigua;
    materia_nueva: MateriaNueva | null;
  }>;
}
