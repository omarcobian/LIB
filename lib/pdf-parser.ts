/**
 * PDF Kardex Parser
 *
 * Strategy:
 * 1. Try text extraction with pdf-parse (works for digital/system-generated PDFs)
 * 2. If text is too short / garbled → PDF is scanned image → use Tesseract OCR
 *
 * After text is obtained, parseKardexText() handles the structured extraction.
 * It handles the most common Mexican university formats:
 *   - SIIA (Tecnológico Nacional, BUAP, UAM, etc.)
 *   - Banner / Ellucian
 *   - Sistemas propios con tabla clave-nombre-calificación-créditos
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { KardexMateria } from './types';
import { ParsedKardex } from './kardex-parser';

const execFileAsync = promisify(execFile);
const DEFAULT_OCR_LANG = process.env.KARDEX_OCR_LANGS?.trim() || 'spa';
const DEFAULT_OCR_MAX_PAGES = (() => {
  const n = Number.parseInt(process.env.KARDEX_OCR_MAX_PAGES ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 8;
})();

// ─────────────────────────────────────────────────────────────────────────────
//  EXTRACCIÓN DE TEXTO DEL PDF
// ─────────────────────────────────────────────────────────────────────────────

/** Extracts raw text from a PDF buffer. Returns null if extraction fails. */
async function extractPdfText(buffer: Buffer, preserveLayout = true): Promise<string | null> {
  try {
    const data = preserveLayout
      ? await pdfParse(buffer, {
        // Preserve layout as much as possible
        pagerender: undefined,
      })
      : await pdfParse(buffer);
    return data.text as string;
  } catch {
    return null;
  }
}

/** Returns true if the extracted text looks like usable content */
function isUsableText(text: string): boolean {
  if (!text) return false;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length < 35) return false;

  const words = text.match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]{3,}/g) ?? [];
  const letters = text.match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]/g)?.length ?? 0;
  const printable = text.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/g)?.length ?? 0;
  const hasKeywords = /(kardex|calificaci[oó]n|cr[eé]ditos?|matr[ií]cula|carrera|materia|asignatura|promedio|semestre)/i.test(text);
  const replacementChars = text.match(/�/g)?.length ?? 0;

  if (replacementChars > 0 && replacementChars / clean.length > 0.08) return false;

  if (hasKeywords && words.length >= 3 && letters >= 20) return true;
  if (words.length >= 8 && letters >= 40) return true;
  if (clean.length >= 250 && printable / clean.length >= 0.4 && words.length >= 5) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  OCR CON TESSERACT (para PDFs escaneados)
// ─────────────────────────────────────────────────────────────────────────────

async function renderPdfToImages(buffer: Buffer, maxPages: number): Promise<{ imagePaths: string[]; cleanup: () => Promise<void> }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kardex-ocr-'));
  const pdfPath = path.join(tempDir, 'documento.pdf');
  const outputPrefix = path.join(tempDir, 'pagina');

  const cleanup = async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  };

  try {
    await fs.writeFile(pdfPath, buffer);
    const renderCommands: string[][] = [
      ['-png', '-f', '1', '-l', String(maxPages), pdfPath, outputPrefix], // pdftocairo
      ['-png', '-f', '1', '-l', String(maxPages), pdfPath, outputPrefix], // pdftoppm
    ];

    try {
      await execFileAsync('pdftocairo', renderCommands[0], { timeout: 60_000 });
    } catch {
      await execFileAsync('pdftoppm', renderCommands[1], { timeout: 60_000 });
    }

    const files = await fs.readdir(tempDir);
    const imagePaths = files
      .filter(file => file.startsWith('pagina-') && file.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map(file => path.join(tempDir, file));

    if (imagePaths.length === 0) {
      throw new Error('No se pudieron renderizar páginas del PDF para OCR.');
    }

    return { imagePaths, cleanup };
  } catch (e) {
    await cleanup();

    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        'No se encontró Poppler (pdftocairo/pdftoppm). Instálalo localmente para habilitar OCR de PDFs escaneados.'
      );
    }

    throw e;
  }
}

async function ocrPdf(buffer: Buffer): Promise<{ text: string; pagesProcessed: number }> {
  const maxPages = DEFAULT_OCR_MAX_PAGES;
  const { imagePaths, cleanup } = await renderPdfToImages(buffer, maxPages);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Tesseract = require('tesseract.js');
    const worker = await Tesseract.createWorker(DEFAULT_OCR_LANG, 1, {
      logger: () => {},
    });
    try {
      const pageTexts: string[] = [];
      for (const imagePath of imagePaths) {
        const { data: { text } } = await worker.recognize(imagePath);
        pageTexts.push((text as string).trim());
      }
      return {
        text: pageTexts.filter(Boolean).join('\n\n'),
        pagesProcessed: imagePaths.length,
      };
    } finally {
      await worker.terminate();
    }
  } catch (e) {
    throw new Error(`OCR falló: ${String(e)}`);
  } finally {
    await cleanup();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  NORMALIZACIÓN
// ─────────────────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXTRACCIÓN DE DATOS DEL ALUMNO DEL TEXTO
// ─────────────────────────────────────────────────────────────────────────────

interface StudentInfo {
  nombre?:    string;
  matricula?: string;
  carrera?:   string;
  semestre?:  number;
}

function extractStudentInfo(lines: string[]): StudentInfo {
  const info: StudentInfo = {};

  // Patrones de etiquetas comunes en kardex mexicanos
  const patterns = {
    nombre: [
      /(?:nombre\s*(?:del?\s*)?alumno?|alumno|estudiante|nombre\s*completo)\s*[:\-]?\s*(.+)/i,
      /^nombre\s*[:\-]\s*(.+)/i,
    ],
    matricula: [
      /(?:matr[íi]cula|no\.?\s*(?:de\s*)?control|n[úu]mero\s*(?:de\s*)?control|clave\s*(?:del?\s*)?alumno|expediente|folio)\s*[:\-]?\s*([A-Z0-9]{5,15})/i,
      /control\s*[:\-]\s*([A-Z0-9]{5,15})/i,
    ],
    carrera: [
      /(?:carrera|programa\s*(?:educativo)?|licenciatura|ingeniería|plan\s*(?:de\s*)?estudios|especialidad)\s*[:\-]?\s*(.{5,80})/i,
    ],
    semestre: [
      /(?:semestre\s*(?:actual|en\s*curso|que\s*cursa)?|nivel)\s*[:\-]?\s*(\d{1,2})/i,
    ],
  };

  const scanLines = lines.slice(0, Math.min(40, lines.length));

  for (const line of scanLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!info.nombre) {
      for (const p of patterns.nombre) {
        const m = trimmed.match(p);
        if (m && m[1].trim().length >= 5 && /[a-záéíóúñ]/i.test(m[1])) {
          info.nombre = m[1].trim().replace(/\s+/g, ' ');
          break;
        }
      }
    }

    if (!info.matricula) {
      for (const p of patterns.matricula) {
        const m = trimmed.match(p);
        if (m) { info.matricula = m[1].toUpperCase(); break; }
      }
      // Fallback: line that is just a matricula
      if (!info.matricula && /^\d{7,12}$/.test(trimmed)) {
        info.matricula = trimmed;
      }
    }

    if (!info.carrera) {
      for (const p of patterns.carrera) {
        const m = trimmed.match(p);
        if (m) {
          info.carrera = m[1].trim()
            .replace(/^[A-Z0-9]{2,6}\s*[-–]\s*/i, '') // remove "ISC - " prefix
            .replace(/\s+/g, ' ');
          break;
        }
      }
    }

    if (!info.semestre) {
      for (const p of patterns.semestre) {
        const m = trimmed.match(p);
        if (m) {
          const n = parseInt(m[1]);
          if (n >= 1 && n <= 14) { info.semestre = n; break; }
        }
      }
    }
  }

  return info;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PARSEO DE MATERIAS DEL TEXTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects and parses subject rows from PDF text.
 *
 * Handles two common layouts:
 *
 * Layout A (columnar, SIIA-style):
 *   ISC-101  Cálculo Diferencial       9.0   10   2021-1
 *   ISC-102  Álgebra Lineal            8.5   8    2021-1
 *
 * Layout B (one subject per line block):
 *   Materia: Cálculo Diferencial
 *   Calificación: 9.0    Créditos: 10
 *
 * Layout C (compact, clave + nombre + cal en una línea):
 *   ISC-101 Cálculo Diferencial 9.0
 */
function extractMaterias(lines: string[]): KardexMateria[] {
  const materias: KardexMateria[] = [];

  // ── Approach 1: Look for a header line then parse columns ──────────────
  // Find the line that looks like a table header
  const headerPatterns = [
    /clave.{0,20}(?:materia|asignatura|nombre).{0,20}(?:calificaci|cal|nota)/i,
    /(?:materia|asignatura).{0,20}(?:calificaci|cal).{0,20}(?:cr[eé]d|hrs)/i,
    /no\.?.{0,15}(?:materia|asignatura).{0,15}(?:calificaci|cal)/i,
  ];

  let headerLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headerPatterns.some(p => p.test(lines[i]))) {
      headerLineIdx = i;
      break;
    }
  }

  if (headerLineIdx >= 0) {
    const headerLine = lines[headerLineIdx];

    // Detect column positions from the header line
    const colPositions = detectColumnPositions(headerLine);

    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const line = lines[i].trimEnd();
      if (!line.trim()) continue;

      // Stop if we hit a footer/total line
      if (/^(total|promedio|cr[eé]ditos\s+totales|firma|observaci)/i.test(line.trim())) continue;

      const materia = parseColumnarLine(line, colPositions);
      if (materia) materias.push(materia);
    }
  }

  // ── Approach 2: Regex-based line matching (works without header) ────────
  if (materias.length === 0) {
    for (const line of lines) {
      const materia = parseSubjectLine(line);
      if (materia) materias.push(materia);
    }
  }

  // Deduplicate by clave+nombre
  const seen = new Set<string>();
  return materias.filter(m => {
    const key = `${m.clave}|${m.nombre}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface ColPositions {
  clave?: number;
  nombre?: number;
  cal?: number;
  creditos?: number;
  periodo?: number;
}

function detectColumnPositions(headerLine: string): ColPositions {
  const positions: ColPositions = {};
  const checks: [keyof ColPositions, RegExp][] = [
    ['clave',    /clave|c[oó]d|no\./i],
    ['nombre',   /materia|asignatura|nombre/i],
    ['cal',      /calificaci|cal\b|nota/i],
    ['creditos', /cr[eé]d|horas|unidades/i],
    ['periodo',  /periodo|ciclo|fecha/i],
  ];
  for (const [key, pattern] of checks) {
    const m = pattern.exec(headerLine);
    if (m) (positions as Record<string, number>)[key] = m.index;
  }
  return positions;
}

function parseColumnarLine(line: string, cols: ColPositions): KardexMateria | null {
  // If we have at least nombre and cal positions, try to extract by position
  if (cols.nombre !== undefined && cols.cal !== undefined) {
    const nombre = line.slice(cols.nombre, cols.cal).trim();
    const rest = line.slice(cols.cal).trim();
    const calStr = rest.split(/\s+/)[0] ?? '';
    const cal = parseFloat(calStr.replace(',', '.'));

    if (!nombre || nombre.length < 3) return null;
    if (isNaN(cal) || cal < 0 || cal > 10) return null;

    const clave = cols.clave !== undefined
      ? line.slice(cols.clave, cols.nombre).trim()
      : '';

    const creditosStr = cols.creditos !== undefined
      ? line.slice(cols.creditos).split(/\s+/)[0] ?? ''
      : rest.split(/\s+/)[1] ?? '';
    const creditos = parseInt(creditosStr) || 0;

    const periodo = cols.periodo !== undefined
      ? line.slice(cols.periodo).split(/\s+/)[0] ?? ''
      : '';

    // Skip non-subject lines
    if (/^(total|promedio|subtotal|suma)/i.test(nombre)) return null;

    return {
      clave,
      nombre: nombre.replace(/\s+/g, ' '),
      calificacion: cal,
      creditos,
      periodo,
      tipo: '',
      aprobada: cal >= 6,
    };
  }
  return parseSubjectLine(line);
}

/**
 * Tries to match a line as a subject entry using common patterns.
 *
 * Examples it handles:
 *  "ISC-101  Cálculo Diferencial  9.0  10  2021-1"
 *  "ISC101 CALCULO DIFERENCIAL 9.0 10"
 *  "  Cálculo Diferencial   9.0   10  "
 *  "1  Cálculo Diferencial  9.0  10  1er. Semestre"
 */
function parseSubjectLine(line: string): KardexMateria | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 8) return null;

  // Must contain a number that looks like a grade (4.0–10.0 or 4–10)
  // and some text that looks like a subject name
  const gradePattern = /\b([4-9]\.\d|10(?:\.0)?|[4-9](?:\.\d)?|10)\b/;
  const gradeMatch = gradePattern.exec(trimmed);
  if (!gradeMatch) return null;

  const cal = parseFloat(gradeMatch[1]);
  if (isNaN(cal) || cal < 4 || cal > 10) return null;

  const beforeGrade = trimmed.slice(0, gradeMatch.index).trim();
  const afterGrade  = trimmed.slice(gradeMatch.index + gradeMatch[0].length).trim();

  // Extract subject name from beforeGrade
  // Remove leading clave (alphanumeric code like ISC-101, C1001, etc.)
  const clavePattern = /^([A-Z]{1,5}[-_]?\d{2,5}[A-Z]?|[A-Z]\d{4,6}|\d{4,7})\s+/i;
  const claveMatch = clavePattern.exec(beforeGrade);
  const clave = claveMatch ? claveMatch[1].toUpperCase() : '';
  const nombre = claveMatch
    ? beforeGrade.slice(claveMatch[0].length).trim()
    : beforeGrade.replace(/^\d+\.\s*/, '').trim(); // remove leading "1. "

  if (!nombre || nombre.length < 4) return null;

  // Must look like a real subject name (has at least some letters)
  if (!/[a-záéíóúñ]{3}/i.test(nombre)) return null;

  // Skip totals/headers/footers
  if (/^(total|promedio|cr[eé]d|horas|firma|leyenda|observ)/i.test(nombre)) return null;

  // Credits: first integer after the grade
  const creditosMatch = afterGrade.match(/^(\d{1,3})/);
  const creditos = creditosMatch ? parseInt(creditosMatch[1]) : 0;

  // Periodo: date-like or semestre-like pattern after credits
  const periodoMatch = afterGrade.match(/(\d{4}[-/]\d{1,2}|\d{4}[AB]|[12][°]?\s*sem\w*|\w+\s*\d{4})/i);
  const periodo = periodoMatch ? periodoMatch[1].trim() : '';

  return {
    clave,
    nombre: nombre.replace(/\s+/g, ' '),
    calificacion: cal,
    creditos,
    periodo,
    tipo: '',
    aprobada: cal >= 6,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export async function parseKardexPdf(buffer: Buffer): Promise<ParsedKardex> {
  const result: ParsedKardex = { materias: [], errores: [], avisos: [] };
  let text: string | null = null;
  let usedOcr = false;

  // ── 1. Intentar extracción de texto digital ─────────────────────────────
  text = await extractPdfText(buffer, true);

  if (!isUsableText(text ?? '')) {
    const altText = await extractPdfText(buffer, false);
    if (isUsableText(altText ?? '')) {
      text = altText;
    }
  }

  if (!isUsableText(text ?? '')) {
    // ── 2. Fallback: OCR con Tesseract ──────────────────────────────────
    result.avisos.push('No se pudo extraer texto confiable del PDF; intentando OCR...');
    try {
      const ocrResult = await ocrPdf(buffer);
      text = ocrResult.text;
      usedOcr = true;
      if (ocrResult.pagesProcessed >= DEFAULT_OCR_MAX_PAGES) {
        result.avisos.push(`OCR procesó ${ocrResult.pagesProcessed} páginas. Ajusta KARDEX_OCR_MAX_PAGES si tu PDF es más largo.`);
      }
      if (!isUsableText(text)) {
        result.errores.push('No se pudo extraer texto del PDF. Verifica que el archivo no esté dañado o protegido.');
        return result;
      }
    } catch (e) {
      result.errores.push(
        `Error en OCR: ${String(e)}. ` +
        'Instala Poppler (pdftocairo/pdftoppm) y verifica que Tesseract pueda descargar/usar el idioma configurado.'
      );
      return result;
    }
  }

  if (usedOcr) {
    result.avisos.push('Texto extraído por OCR. Revisa que los datos sean correctos.');
  }

  // ── 3. Dividir en líneas y limpiar ──────────────────────────────────────
  const lines = (text ?? '')
    .split('\n')
    .map(l => l.replace(/\r/g, '').replace(/\t/g, '  '))
    .filter(l => l.trim().length > 0);

  // ── 4. Extraer datos del alumno ─────────────────────────────────────────
  const studentInfo = extractStudentInfo(lines);
  result.nombre    = studentInfo.nombre;
  result.matricula = studentInfo.matricula;
  result.carrera   = studentInfo.carrera;
  result.semestre  = studentInfo.semestre;

  if (!result.nombre)    result.avisos.push('No se encontró el nombre del alumno en el PDF.');
  if (!result.matricula) result.avisos.push('No se encontró la matrícula en el PDF.');
  if (!result.carrera)   result.avisos.push('No se encontró la carrera en el PDF.');

  // ── 5. Extraer materias ─────────────────────────────────────────────────
  result.materias = extractMaterias(lines);

  // ── 6. Inferir semestre si falta ────────────────────────────────────────
  if (!result.semestre && result.materias.length > 0) {
    const aprobadas = result.materias.filter(m => m.aprobada).length;
    result.semestre = Math.min(Math.ceil(aprobadas / 7) + 1, 12);
    result.avisos.push(`Semestre estimado automáticamente (${aprobadas} materias aprobadas).`);
  }

  if (result.materias.length === 0) {
    result.errores.push(
      'No se encontraron materias en el PDF. ' +
      (usedOcr
        ? 'La calidad del escaneo puede ser baja.'
        : 'El formato del PDF puede no ser compatible. Intenta exportar el kardex como Excel desde el portal escolar.')
    );
  }

  return result;
}
