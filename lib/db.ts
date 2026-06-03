import fs from 'fs';
import path from 'path';
import { Config, Alumno, KardexAlumno, CambioMalla, TemplateConfig } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const KARDEX_DIR = path.join(DATA_DIR, 'kardex');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const ALUMNOS_FILE = path.join(DATA_DIR, 'alumnos.json');
const CAMBIOS_FILE = path.join(DATA_DIR, 'cambios.json');
const TEMPLATE_CONFIG_FILE = path.join(DATA_DIR, 'template-config.json');
const TEMPLATE_FILE = path.join(DATA_DIR, 'template.xlsx');

// Ensure directories exist
[DATA_DIR, KARDEX_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function readJSON<T>(file: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(file)) return defaultValue;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

function writeJSON(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ── CONFIG ────────────────────────────────────────────────
export function getConfig(): Config {
  return readJSON<Config>(CONFIG_FILE, {
    carrera: '',
    planAntiguo: '',
    planNuevo: '',
    materiasAntiguas: [],
    materiasNuevas: [],
    equivalencias: [],
    totalCreditosPlanNuevo: 0,
  });
}

export function saveConfig(config: Config): void {
  writeJSON(CONFIG_FILE, config);
}

// ── ALUMNOS ───────────────────────────────────────────────
export function getAlumnos(): Alumno[] {
  return readJSON<Alumno[]>(ALUMNOS_FILE, []);
}

export function getAlumno(id: string): Alumno | undefined {
  return getAlumnos().find(a => a.id === id);
}

export function saveAlumno(alumno: Alumno): void {
  const alumnos = getAlumnos();
  const idx = alumnos.findIndex(a => a.id === alumno.id);
  if (idx >= 0) alumnos[idx] = alumno;
  else alumnos.push(alumno);
  writeJSON(ALUMNOS_FILE, alumnos);
}

export function deleteAlumno(id: string): void {
  const alumnos = getAlumnos().filter(a => a.id !== id);
  writeJSON(ALUMNOS_FILE, alumnos);
  const kardexFile = path.join(KARDEX_DIR, `${id}.json`);
  if (fs.existsSync(kardexFile)) fs.unlinkSync(kardexFile);
}

// ── KARDEX ────────────────────────────────────────────────
export function getKardex(alumnoId: string): KardexAlumno | null {
  const file = path.join(KARDEX_DIR, `${alumnoId}.json`);
  return readJSON<KardexAlumno | null>(file, null);
}

export function saveKardex(kardex: KardexAlumno): void {
  const file = path.join(KARDEX_DIR, `${kardex.alumnoId}.json`);
  writeJSON(file, kardex);
}

// ── CAMBIOS DE MALLA ──────────────────────────────────────
export function getCambiosMalla(): CambioMalla[] {
  return readJSON<CambioMalla[]>(CAMBIOS_FILE, []);
}

export function getCambioMalla(alumnoId: string): CambioMalla | null {
  return getCambiosMalla().find(c => c.alumnoId === alumnoId) ?? null;
}

export function saveCambioMalla(cambio: CambioMalla): void {
  const cambios = getCambiosMalla();
  const idx = cambios.findIndex(c => c.alumnoId === cambio.alumnoId);
  if (idx >= 0) cambios[idx] = cambio;
  else cambios.push(cambio);
  writeJSON(CAMBIOS_FILE, cambios);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ── TEMPLATE ──────────────────────────────────────────────
export function getTemplateConfig(): TemplateConfig {
  return readJSON<TemplateConfig>(TEMPLATE_CONFIG_FILE, {
    activo: false,
    tipo: 'docx' as 'docx' | 'xlsx',
    nombreArchivo: '',
    hojaDefault: 0,
    celdas: [],
    equivalencias: null,
    faltantes: null,
  });
}

export function saveTemplateConfig(cfg: TemplateConfig): void {
  writeJSON(TEMPLATE_CONFIG_FILE, cfg);
}

export function saveTemplateFile(buffer: Buffer): void {
  fs.writeFileSync(TEMPLATE_FILE, buffer);
}

export function getTemplateFile(): Buffer | null {
  if (!fs.existsSync(TEMPLATE_FILE)) return null;
  return fs.readFileSync(TEMPLATE_FILE);
}

export function hasTemplateFile(): boolean {
  return fs.existsSync(TEMPLATE_FILE);
}

/** Returns sheet names from the saved template */
export function getTemplateSheetNames(): string[] {
  if (!fs.existsSync(TEMPLATE_FILE)) return [];
  try {
    const XLSX = require('xlsx');
    const wb = XLSX.read(fs.readFileSync(TEMPLATE_FILE), { type: 'buffer' });
    return wb.SheetNames;
  } catch {
    return [];
  }
}
