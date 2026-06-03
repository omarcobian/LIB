import * as XLSX from 'xlsx';
import { KardexMateria } from './types';

export interface ParsedKardex {
  nombre?:    string;
  matricula?: string;
  carrera?:   string;
  semestre?:  number;
  materias:   KardexMateria[];
  errores:    string[];
  avisos:     string[];  // datos que se asumieron o no se encontraron
  pdfAnalysis?: {
    hasText: boolean;
    textCoverage: number;
    strategyUsed: 'embedded_text' | 'ocr' | 'hybrid';
    diagnostics: {
      pageCount: number;
      pagesWithText: number;
      pagesWithImages: number;
      imageBased: boolean;
      parserErrors: string[];
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  PATRONES DE ETIQUETAS (lo que el sistema busca como "label" en el archivo)
// ─────────────────────────────────────────────────────────────────────────────
const LABEL_NOMBRE = [
  'nombre del alumno', 'nombre de alumno', 'nombre alumno',
  'nombre completo', 'alumno', 'estudiante', 'nombre:', 'nombre',
  'apellidos y nombre', 'apellido y nombre',
];
const LABEL_MATRICULA = [
  'matrícula', 'matricula', 'no. de control', 'no de control',
  'número de control', 'numero de control', 'no. control', 'no control',
  'clave del alumno', 'clave alumno', 'id alumno', 'id del alumno',
  'expediente', 'folio', 'control escolar',
];
const LABEL_CARRERA = [
  'carrera', 'programa educativo', 'programa', 'licenciatura',
  'ingeniería', 'ingenieria', 'plan de estudios', 'plan',
  'especialidad', 'área', 'area',
];
const LABEL_SEMESTRE = [
  'semestre actual', 'semestre que cursa', 'semestre en curso',
  'semestre', 'ciclo escolar actual', 'nivel',
];

// ─────────────────────────────────────────────────────────────────────────────
//  NORMALIZACIÓN
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function matchesLabel(cell: string, labels: string[]): boolean {
  const n = norm(cell).replace(/[:\-_]/g, '').trim();
  return labels.some(l => n === l || n.startsWith(l) || n.endsWith(l));
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXTRACCIÓN DE DATOS DE ENCABEZADO
//  Estrategia: escanear celda por celda las primeras ~25 filas.
//  El valor puede estar (a) en la misma celda después de ":", o
//  (b) en la celda siguiente de la misma fila, o (c) en la fila siguiente.
// ─────────────────────────────────────────────────────────────────────────────
function extractHeaderInfo(rows: string[][]): {
  nombre?: string; matricula?: string; carrera?: string; semestre?: number;
} {
  const result: { nombre?: string; matricula?: string; carrera?: string; semestre?: number } = {};
  const scanRows = Math.min(30, rows.length);

  for (let r = 0; r < scanRows; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] ?? '').toString().trim();
      if (!cell) continue;

      // ── Intentar extraer valor inline (misma celda, después de ":")
      // Ej: "NOMBRE DEL ALUMNO: García López Juan Carlos"
      const colonIdx = cell.indexOf(':');
      const label = colonIdx >= 0 ? cell.slice(0, colonIdx).trim() : cell;
      const inlineVal = colonIdx >= 0 ? cell.slice(colonIdx + 1).trim() : '';

      // Valor en la siguiente celda de la misma fila
      const nextCell = (row[c + 1] ?? '').toString().trim();
      // Valor en la celda equivalente de la siguiente fila
      const belowCell = ((rows[r + 1] ?? [])[c] ?? '').toString().trim();

      const getValue = () => {
        if (inlineVal) return inlineVal;
        if (nextCell && !matchesAnyLabel(nextCell)) return nextCell;
        if (belowCell && !matchesAnyLabel(belowCell)) return belowCell;
        return '';
      };

      // ── NOMBRE ──────────────────────────────────────────────────────────
      if (!result.nombre && matchesLabel(label, LABEL_NOMBRE)) {
        const val = getValue();
        if (val && val.length >= 5 && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3}/.test(val)) {
          // Limpiar prefijos comunes ("LIC.", "ING.", etc.)
          result.nombre = val.replace(/^(lic\.?|ing\.?|dr\.?|mtro\.?)\s+/i, '').trim();
        }
      }

      // ── MATRÍCULA ────────────────────────────────────────────────────────
      if (!result.matricula && matchesLabel(label, LABEL_MATRICULA)) {
        const val = getValue();
        // Acepta formatos: 20210001, 21CS001, A1234567, etc.
        const m = val.match(/([A-Z0-9]{5,15})/i);
        if (m) result.matricula = m[1].toUpperCase();
      }

      // ── CARRERA ──────────────────────────────────────────────────────────
      if (!result.carrera && matchesLabel(label, LABEL_CARRERA)) {
        const val = getValue();
        if (val && val.length >= 5) {
          // Quitar código si viene "ISC - Ingeniería en Sistemas" → "Ingeniería en Sistemas"
          result.carrera = val.replace(/^[A-Z0-9]{2,6}\s*[-–]\s*/i, '').trim();
        }
      }

      // ── SEMESTRE ─────────────────────────────────────────────────────────
      if (!result.semestre && matchesLabel(label, LABEL_SEMESTRE)) {
        const val = getValue();
        const num = parseInt(val);
        if (!isNaN(num) && num >= 1 && num <= 14) result.semestre = num;
      }
    }
  }

  // ── Fallback: buscar matrícula por patrón numérico en cualquier celda ─────
  if (!result.matricula) {
    for (let r = 0; r < scanRows; r++) {
      for (const cell of rows[r]) {
        const s = cell.toString().trim();
        // Matrícula sola en una celda: 6-12 dígitos o alfanumérico
        if (/^\d{7,12}$/.test(s) || /^[A-Z]{1,3}\d{5,10}$/i.test(s)) {
          result.matricula = s.toUpperCase();
          break;
        }
      }
      if (result.matricula) break;
    }
  }

  // ── Fallback: buscar nombre en texto libre si hay algo que parece un nombre ─
  if (!result.nombre) {
    for (let r = 0; r < scanRows; r++) {
      for (const cell of rows[r]) {
        const s = cell.toString().trim();
        // Nombre: 2+ palabras, solo letras y espacios, mín 10 chars, primer letra mayúscula
        if (
          s.length >= 10 && s.length <= 80 &&
          /^[A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/.test(s) &&
          s.split(' ').filter(Boolean).length >= 2
        ) {
          result.nombre = s;
          break;
        }
      }
      if (result.nombre) break;
    }
  }

  return result;
}

function matchesAnyLabel(val: string): boolean {
  return (
    matchesLabel(val, LABEL_NOMBRE) ||
    matchesLabel(val, LABEL_MATRICULA) ||
    matchesLabel(val, LABEL_CARRERA) ||
    matchesLabel(val, LABEL_SEMESTRE)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PARSER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function parseKardexExcel(buffer: Buffer): ParsedKardex {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as string[][];

  const result: ParsedKardex = { materias: [], errores: [], avisos: [] };

  // ── 1. Extraer datos del alumno del encabezado ──────────────────────────
  const header = extractHeaderInfo(rows);
  result.nombre    = header.nombre;
  result.matricula = header.matricula;
  result.carrera   = header.carrera;
  result.semestre  = header.semestre;

  if (!result.nombre)    result.avisos.push('No se encontró el nombre del alumno en el encabezado.');
  if (!result.matricula) result.avisos.push('No se encontró la matrícula en el encabezado.');
  if (!result.carrera)   result.avisos.push('No se encontró la carrera en el encabezado.');

  // ── 2. Encontrar fila de encabezados de materias ────────────────────────
  const headerPatterns = [
    /clave|cód|codigo|no\.|asign/i,
    /materia|nombre|asignatura|descripci/i,
    /calificaci|cal\b|nota|grade|calif/i,
  ];

  let headerRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].join(' ');
    if (headerPatterns.filter(p => p.test(rowText)).length >= 2) {
      headerRow = i;
      break;
    }
  }

  // Fallback: fila con ≥3 celdas no numéricas
  if (headerRow === -1) {
    for (let i = 0; i < Math.min(25, rows.length); i++) {
      const row = rows[i].filter(c => c.trim());
      if (row.length >= 3 && row.filter(c => isNaN(Number(c))).length >= 3) {
        headerRow = i;
        break;
      }
    }
  }

  if (headerRow === -1) {
    result.errores.push('No se encontró la tabla de materias. Verifica el formato del archivo.');
    return result;
  }

  const headers = rows[headerRow].map(h => h.toString().toLowerCase().trim());

  const colIdx = {
    clave:        findCol(headers, ['clave', 'código', 'codigo', 'cve', 'no.', 'num', 'id', 'asign']),
    nombre:       findCol(headers, ['nombre', 'materia', 'asignatura', 'descripción', 'descripcion', 'asig']),
    calificacion: findCol(headers, ['calificación', 'calificacion', 'calific', 'cal', 'nota', 'grade', 'calif', 'prom']),
    creditos:     findCol(headers, ['créditos', 'creditos', 'créd', 'cred', 'hrs', 'horas', 'unidades', 'uc']),
    periodo:      findCol(headers, ['periodo', 'ciclo', 'fecha', 'sem']),
    tipo:         findCol(headers, ['tipo', 'modalidad', 'carácter', 'caracter']),
  };

  if (colIdx.nombre === -1) {
    // Último intento: col con más texto largo
    let bestCol = -1, bestLen = 0;
    for (let c = 0; c < headers.length; c++) {
      const sample = rows.slice(headerRow + 1, headerRow + 6)
        .map(r => (r[c] ?? '').toString().trim())
        .filter(Boolean);
      const avgLen = sample.reduce((s, v) => s + v.length, 0) / (sample.length || 1);
      if (avgLen > bestLen) { bestLen = avgLen; bestCol = c; }
    }
    if (bestCol >= 0 && bestLen > 8) colIdx.nombre = bestCol;
    else {
      result.errores.push('No se encontró la columna de materias.');
      return result;
    }
  }

  // ── 3. Parsear filas de materias ─────────────────────────────────────────
  let maxSemestre = 0;
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c.toString().trim())) continue;

    const nombre = (row[colIdx.nombre] ?? '').toString().trim();
    if (!nombre) continue;

    // Saltar filas de totales/promedios/secciones
    const nl = nombre.toLowerCase();
    if (/^(total|promedio|créditos|creditos|subtotal|suma|resumen|periodo|semestre\s*\d)/i.test(nl)) continue;
    if (nombre.length < 3 || /^\d+$/.test(nombre)) continue;

    const calStr = colIdx.calificacion >= 0 ? (row[colIdx.calificacion] ?? '').toString().trim() : '';
    const calificacion = parseFloat(calStr.replace(',', '.')) || 0;
    const aprobada = calificacion >= 6 && !['np', 'na', 'baja', 'sd', '--', '', 'nr', 'nc', 'nac'].includes(calStr.toLowerCase());

    const creditosStr = colIdx.creditos >= 0 ? (row[colIdx.creditos] ?? '').toString().trim() : '';
    const creditos = parseInt(creditosStr) || 0;

    const periodo = colIdx.periodo >= 0 ? (row[colIdx.periodo] ?? '').toString().trim() : '';

    // Inferir semestre cursado desde periodo si hay formato "sem 3", "3er semestre", etc.
    const semMatch = periodo.match(/(\d+)/);
    if (semMatch) maxSemestre = Math.max(maxSemestre, parseInt(semMatch[1]));

    result.materias.push({
      clave:        colIdx.clave >= 0 ? (row[colIdx.clave] ?? '').toString().trim() : '',
      nombre,
      calificacion,
      creditos,
      periodo,
      tipo: colIdx.tipo >= 0 ? (row[colIdx.tipo] ?? '').toString().trim() : '',
      aprobada,
    });
  }

  // ── 4. Inferir semestre si no se encontró explícitamente ─────────────────
  if (!result.semestre && maxSemestre > 0) {
    result.semestre = maxSemestre;
  }
  if (!result.semestre && result.materias.length > 0) {
    // Estimación por cantidad de materias (aprox. 6-8 por semestre)
    const aprobadas = result.materias.filter(m => m.aprobada).length;
    result.semestre = Math.min(Math.ceil(aprobadas / 7) + 1, 12);
    result.avisos.push(`Semestre estimado automáticamente basado en materias aprobadas (${aprobadas}).`);
  }

  if (result.materias.length === 0) {
    result.errores.push('No se encontraron materias. Verifica que el formato sea correcto.');
  }

  return result;
}

function findCol(headers: string[], keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex(h => h.includes(kw));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  const intersection = [...wordsA].filter(w => wordsB.has(w) && w.length > 2).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}
