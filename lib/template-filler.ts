/**
 * Template filler using xlsx-populate.
 * Reads the institutional Excel template and fills specific cells
 * while preserving ALL original formatting, merges, styles, images.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XlsxPopulate = require('xlsx-populate');

import { Alumno, CambioMalla, TemplateConfig, CampoFormato } from './types';

/** Gets the string/number value for a given campo from student data */
function getCampoValue(
  campo: CampoFormato,
  alumno: Alumno,
  cambio: CambioMalla,
  config: { planAntiguo: string; planNuevo: string }
): string | number {
  const hoy = new Date().toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  switch (campo) {
    case 'nombreAlumno':             return alumno.nombre;
    case 'matricula':                return alumno.matricula;
    case 'carrera':                  return alumno.carrera;
    case 'fecha':                    return hoy;
    case 'planAntiguo':              return config.planAntiguo;
    case 'planNuevo':                return config.planNuevo;
    case 'semestre':                 return alumno.semestre;
    case 'totalCreditosReconocidos': return cambio.totalCreditosReconocidos;
    case 'totalCreditosFaltantes':   return cambio.totalCreditosFaltantes;
    case 'porcentajeAvance':         return `${cambio.porcentajeAvance}%`;
    case 'totalMateriasReconocidas': return cambio.equivalenciasAplicadas.length;
    case 'totalMateriasFaltantes':   return cambio.materiasFaltantes.length;
    default: return '';
  }
}

export async function fillTemplate(
  templateBuffer: Buffer,
  alumno: Alumno,
  cambio: CambioMalla,
  templateCfg: TemplateConfig,
  planConfig: { planAntiguo: string; planNuevo: string }
): Promise<Buffer> {
  const wb = await XlsxPopulate.fromDataAsync(templateBuffer);

  // ── 1. CELDAS FIJAS ──────────────────────────────────────
  for (const celda of templateCfg.celdas) {
    if (!celda.celda?.trim()) continue;
    try {
      const sheet = wb.sheet(celda.hoja ?? 0);
      const valor = getCampoValue(celda.campo, alumno, cambio, planConfig);
      sheet.cell(celda.celda.trim().toUpperCase()).value(valor);
    } catch (e) {
      console.warn(`No se pudo escribir celda ${celda.celda}:`, e);
    }
  }

  // ── 2. FILAS DE EQUIVALENCIAS ─────────────────────────────
  if (templateCfg.equivalencias) {
    const sec = templateCfg.equivalencias;
    const sheet = wb.sheet(sec.hoja ?? 0);
    cambio.equivalenciasAplicadas.forEach((eq, i) => {
      const row = sec.filaInicio + i;
      const { cols } = sec;
      if (cols.claveAntigua)    safeCell(sheet, cols.claveAntigua,    row, eq.materiaAntigua.clave || '');
      if (cols.nombreAntiguo)   safeCell(sheet, cols.nombreAntiguo,   row, eq.materiaAntigua.nombre);
      if (cols.calificacion)    safeCell(sheet, cols.calificacion,    row, eq.calificacion);
      if (cols.creditosAntiguo) safeCell(sheet, cols.creditosAntiguo, row, eq.materiaAntigua.creditos);
      if (cols.claveNueva)      safeCell(sheet, cols.claveNueva,      row, eq.materiaNueva.clave || '');
      if (cols.nombreNuevo)     safeCell(sheet, cols.nombreNuevo,     row, eq.materiaNueva.nombre);
      if (cols.creditosNuevo)   safeCell(sheet, cols.creditosNuevo,   row, eq.creditosReconocidos);
      if (cols.semestre)        safeCell(sheet, cols.semestre,        row, eq.materiaNueva.semestre);
      if (cols.periodo)         safeCell(sheet, cols.periodo,         row, eq.materiaAntigua.periodo || '');
      if (cols.observacion)     safeCell(sheet, cols.observacion,     row, 'Reconocida');
    });
  }

  // ── 3. FILAS DE MATERIAS FALTANTES ───────────────────────
  if (templateCfg.faltantes) {
    const sec = templateCfg.faltantes;
    const sheet = wb.sheet(sec.hoja ?? 0);
    cambio.materiasFaltantes.forEach((f, i) => {
      const row = sec.filaInicio + i;
      const { cols } = sec;
      if (cols.claveNueva)   safeCell(sheet, cols.claveNueva,   row, f.materia.clave || '');
      if (cols.nombreNuevo)  safeCell(sheet, cols.nombreNuevo,  row, f.materia.nombre);
      if (cols.creditosNuevo)safeCell(sheet, cols.creditosNuevo,row, f.materia.creditos);
      if (cols.semestre)     safeCell(sheet, cols.semestre,     row, f.semestre);
      if (cols.observacion)  safeCell(sheet, cols.observacion,  row,
        f.semestre <= 3 ? 'PRIORITARIO - Asegurar cupo' : 'Pendiente');
    });
  }

  return wb.outputAsync() as Promise<Buffer>;
}

/** Safely write to a cell by column letter + row number */
function safeCell(
  sheet: ReturnType<typeof XlsxPopulate.Sheet>,
  col: string,
  row: number,
  value: string | number
): void {
  try {
    sheet.cell(`${col.toUpperCase()}${row}`).value(value);
  } catch (e) {
    console.warn(`No se pudo escribir ${col}${row}:`, e);
  }
}
