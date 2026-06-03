export interface MateriaAntigua {
  id: string;
  clave: string;
  nombre: string;
  semestre: number;
  creditos: number;
  area?: string;
}

export interface MateriaNueva {
  id: string;
  clave: string;
  nombre: string;
  semestre: number;
  creditos: number;
  area?: string;
  obligatoria: boolean;
}

export interface Equivalencia {
  id: string;
  materiaAntiguaId: string;
  materiaNuevaId: string;
}

export interface Alumno {
  id: string;
  matricula: string;
  nombre: string;
  email?: string;
  semestre: number;
  carrera: string;
  fechaIngreso?: string;
  createdAt: string;
  estado: 'pendiente' | 'procesado' | 'reportado';
}

export interface KardexMateria {
  clave: string;
  nombre: string;
  calificacion: number;
  creditos: number;
  periodo?: string;
  tipo?: string; // obligatoria, optativa, etc.
  aprobada: boolean;
}

export interface KardexAlumno {
  alumnoId: string;
  materias: KardexMateria[];
  cargadoEn: string;
}

export interface EquivalenciaAplicada {
  materiaAntigua: KardexMateria;
  materiaNueva: MateriaNueva;
  creditosReconocidos: number;
  calificacion: number;
}

export interface MateriaFaltante {
  materia: MateriaNueva;
  semestre: number;
  prioridad: number; // 1 = más urgente
}

export interface CambioMalla {
  alumnoId: string;
  fechaGenerado: string;
  equivalenciasAplicadas: EquivalenciaAplicada[];
  materiasFaltantes: MateriaFaltante[];
  totalCreditosReconocidos: number;
  totalCreditosFaltantes: number;
  porcentajeAvance: number;
}

export interface Config {
  carrera: string;
  planAntiguo: string;
  planNuevo: string;
  materiasAntiguas: MateriaAntigua[];
  materiasNuevas: MateriaNueva[];
  equivalencias: Equivalencia[];
  totalCreditosPlanNuevo: number;
}

// ── TEMPLATE / FORMATO INSTITUCIONAL ─────────────────────

/** Campos disponibles para mapear a celdas del formato */
export type CampoFormato =
  | 'nombreAlumno'
  | 'matricula'
  | 'carrera'
  | 'fecha'
  | 'planAntiguo'
  | 'planNuevo'
  | 'semestre'
  | 'totalCreditosReconocidos'
  | 'totalCreditosFaltantes'
  | 'porcentajeAvance'
  | 'totalMateriasReconocidas'
  | 'totalMateriasFaltantes';

export const CAMPOS_FORMATO: { campo: CampoFormato; etiqueta: string }[] = [
  { campo: 'nombreAlumno',            etiqueta: 'Nombre del alumno' },
  { campo: 'matricula',               etiqueta: 'Matrícula / No. control' },
  { campo: 'carrera',                 etiqueta: 'Carrera' },
  { campo: 'fecha',                   etiqueta: 'Fecha de llenado' },
  { campo: 'planAntiguo',             etiqueta: 'Plan de estudios anterior' },
  { campo: 'planNuevo',               etiqueta: 'Plan de estudios nuevo' },
  { campo: 'semestre',                etiqueta: 'Semestre del alumno' },
  { campo: 'totalCreditosReconocidos',etiqueta: 'Total créditos reconocidos' },
  { campo: 'totalCreditosFaltantes',  etiqueta: 'Total créditos faltantes' },
  { campo: 'porcentajeAvance',        etiqueta: '% de avance en plan nuevo' },
  { campo: 'totalMateriasReconocidas',etiqueta: 'Cantidad de materias reconocidas' },
  { campo: 'totalMateriasFaltantes',  etiqueta: 'Cantidad de materias faltantes' },
];

/** Mapeo de una celda fija (datos del alumno, totales, etc.) */
export interface CeldaFija {
  campo: CampoFormato;
  celda: string;   // dirección Excel: 'B5', 'C3', etc.
  hoja: number;    // índice de hoja (0 = primera)
}

/** Mapeo de la sección de filas repetidas (una fila por materia) */
export interface SeccionFilas {
  hoja: number;
  filaInicio: number;  // primera fila de datos (número Excel, 1-indexed)
  cols: {
    claveAntigua?:   string;  // letra de columna ej. 'A'
    nombreAntiguo?:  string;
    calificacion?:   string;
    creditosAntiguo?:string;
    claveNueva?:     string;
    nombreNuevo?:    string;
    creditosNuevo?:  string;
    semestre?:       string;
    observacion?:    string;
    periodo?:        string;
  };
}

export interface TemplateConfig {
  tipo: 'xlsx' | 'docx';
  activo: boolean;
  nombreArchivo: string;
  hojaDefault: number;
  celdas: CeldaFija[];
  equivalencias: SeccionFilas | null;
  faltantes: SeccionFilas | null;
}

export interface StatsGlobales {
  totalAlumnos: number;
  procesados: number;
  pendientes: number;
  promedioCredReconocidos: number;
  materiasMasSolicitadas: { nombre: string; count: number }[];
}
