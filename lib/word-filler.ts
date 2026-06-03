/**
 * Word (.docx) template filler using docxtemplater.
 *
 * The user's Word template uses these placeholders:
 *
 * CAMPOS SIMPLES (en cualquier parte del documento):
 *   {nombreAlumno}   {matricula}   {carrera}   {fecha}
 *   {planAntiguo}    {planNuevo}   {semestre}
 *   {totalCreditosReconocidos}    {totalCreditosFaltantes}
 *   {porcentajeAvance}            {totalMateriasReconocidas}
 *   {totalMateriasFaltantes}
 *
 * TABLA DE MATERIAS REVALIDADAS (loop en una fila de tabla):
 *   {#revalidadas}
 *     {claveAntigua} {nombreAntiguo} {calificacion} {creditosAntiguo}
 *     {claveNueva}   {nombreNuevo}   {creditosNuevo} {semestre} {periodo}
 *   {/revalidadas}
 *
 * TABLA DE MATERIAS FALTANTES (loop en una fila de tabla):
 *   {#faltantes}
 *     {clave}  {nombre}  {creditos}  {semestre}  {prioridad}
 *   {/faltantes}
 *
 * Reglas:
 * - Cada loop va en UNA fila de una tabla de Word.
 * - Los marcadores {#revalidadas} y {/revalidadas} van en la MISMA celda
 *   de esa fila (o la primera y última celda).
 * - docxtemplater duplica esa fila una vez por cada elemento del arreglo.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Docxtemplater = require('docxtemplater');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PizZip = require('pizzip');

import { Alumno, CambioMalla } from './types';

interface TemplateData {
  // Campos simples
  nombreAlumno: string;
  matricula: string;
  carrera: string;
  fecha: string;
  planAntiguo: string;
  planNuevo: string;
  semestre: string | number;
  totalCreditosReconocidos: number;
  totalCreditosFaltantes: number;
  porcentajeAvance: string;
  totalMateriasReconocidas: number;
  totalMateriasFaltantes: number;
  // Loops
  revalidadas: RevalidadaRow[];
  faltantes: FaltanteRow[];
}

interface RevalidadaRow {
  claveAntigua: string;
  nombreAntiguo: string;
  calificacion: number | string;
  creditosAntiguo: number | string;
  claveNueva: string;
  nombreNuevo: string;
  creditosNuevo: number;
  semestre: number;
  periodo: string;
  observacion: string;
}

interface FaltanteRow {
  clave: string;
  nombre: string;
  creditos: number;
  semestre: number;
  obligatoria: string;
  prioridad: string;
}

export function fillWordTemplate(
  templateBuffer: Buffer,
  alumno: Alumno,
  cambio: CambioMalla,
  planConfig: { planAntiguo: string; planNuevo: string }
): Buffer {
  const zip = new PizZip(templateBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Null handler: if a tag doesn't exist in the template, leave it blank
    nullGetter: () => '',
  });

  const fecha = new Date().toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const data: TemplateData = {
    // ── Campos simples ──────────────────────────────────
    nombreAlumno:             alumno.nombre,
    matricula:                alumno.matricula,
    carrera:                  alumno.carrera,
    fecha,
    planAntiguo:              planConfig.planAntiguo,
    planNuevo:                planConfig.planNuevo,
    semestre:                 alumno.semestre,
    totalCreditosReconocidos: cambio.totalCreditosReconocidos,
    totalCreditosFaltantes:   cambio.totalCreditosFaltantes,
    porcentajeAvance:         `${cambio.porcentajeAvance}%`,
    totalMateriasReconocidas: cambio.equivalenciasAplicadas.length,
    totalMateriasFaltantes:   cambio.materiasFaltantes.length,

    // ── Tabla de materias revalidadas ───────────────────
    revalidadas: cambio.equivalenciasAplicadas.map(eq => ({
      claveAntigua:    eq.materiaAntigua.clave || '',
      nombreAntiguo:   eq.materiaAntigua.nombre,
      calificacion:    eq.calificacion,
      creditosAntiguo: eq.materiaAntigua.creditos || '',
      claveNueva:      eq.materiaNueva.clave || '',
      nombreNuevo:     eq.materiaNueva.nombre,
      creditosNuevo:   eq.creditosReconocidos,
      semestre:        eq.materiaNueva.semestre,
      periodo:         eq.materiaAntigua.periodo || '',
      observacion:     'Reconocida',
    })),

    // ── Tabla de materias faltantes ─────────────────────
    faltantes: cambio.materiasFaltantes.map(f => ({
      clave:       f.materia.clave || '',
      nombre:      f.materia.nombre,
      creditos:    f.materia.creditos,
      semestre:    f.semestre,
      obligatoria: f.materia.obligatoria ? 'Sí' : 'No',
      prioridad:   f.semestre <= 3 ? 'ALTA - Asegurar cupo' : 'Normal',
    })),
  };

  doc.render(data);

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return buf as Buffer;
}
