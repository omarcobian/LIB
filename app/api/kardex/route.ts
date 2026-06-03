import { NextRequest, NextResponse } from 'next/server';
import {
  getAlumnos, saveAlumno, saveKardex, saveCambioMalla,
  getConfig, generateId, getAlumno,
} from '@/lib/db';
import { parseKardexExcel }         from '@/lib/kardex-parser';
import { parseKardexPdf }           from '@/lib/pdf-parser';
import { computeCambioMalla }       from '@/lib/cambio-engine';
import { KardexAlumno, Alumno }     from '@/lib/types';
import type { ParsedKardex }        from '@/lib/kardex-parser';

export async function POST(req: NextRequest) {
  const formData  = await req.formData();
  const file      = formData.get('file') as File;
  const alumnoIdParam = formData.get('alumnoId') as string | null;

  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext    = file.name.split('.').pop()?.toLowerCase() ?? '';

  // ── 1. Parsear según tipo de archivo ─────────────────────────────────────
  let parsed: ParsedKardex;

  if (ext === 'pdf') {
    parsed = await parseKardexPdf(buffer);
  } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
    parsed = parseKardexExcel(buffer);
  } else {
    return NextResponse.json(
      { error: 'Formato no soportado. Usa PDF, Excel (.xlsx/.xls) o CSV.' },
      { status: 400 }
    );
  }

  if (parsed.errores.length && parsed.materias.length === 0) {
    return NextResponse.json(
      { error: parsed.errores.join(' '), errores: parsed.errores, avisos: parsed.avisos },
      { status: 422 }
    );
  }

  // ── 2. Resolver alumno ────────────────────────────────────────────────────
  let alumno: Alumno | undefined;

  if (alumnoIdParam) {
    alumno = getAlumno(alumnoIdParam);
  }
  if (!alumno && parsed.matricula) {
    alumno = getAlumnos().find(
      a => a.matricula.toUpperCase() === parsed.matricula!.toUpperCase()
    );
  }

  const now = new Date().toISOString();

  if (!alumno) {
    alumno = {
      id:        generateId(),
      matricula: parsed.matricula ?? 'SIN-MATRICULA',
      nombre:    parsed.nombre    ?? 'Alumno sin nombre',
      carrera:   parsed.carrera   ?? '',
      semestre:  parsed.semestre  ?? 1,
      estado:    'pendiente',
      createdAt: now,
    };
    saveAlumno(alumno);
  } else {
    const updated: Alumno = {
      ...alumno,
      nombre:   parsed.nombre   || alumno.nombre,
      carrera:  parsed.carrera  || alumno.carrera,
      semestre: parsed.semestre || alumno.semestre,
    };
    saveAlumno(updated);
    alumno = updated;
  }

  // ── 3. Guardar kardex ─────────────────────────────────────────────────────
  const kardex: KardexAlumno = {
    alumnoId:  alumno.id,
    materias:  parsed.materias,
    cargadoEn: now,
  };
  saveKardex(kardex);

  // ── 4. Calcular cambio de malla ───────────────────────────────────────────
  const config = getConfig();
  let cambio = null;
  if (config.equivalencias.length > 0) {
    cambio = computeCambioMalla(alumno.id, kardex, config);
    saveCambioMalla(cambio);
    saveAlumno({ ...alumno, estado: 'procesado' });
  }

  return NextResponse.json({
    ok: true,
    alumnoId: alumno.id,
    alumno: {
      nombre:    alumno.nombre,
      matricula: alumno.matricula,
      carrera:   alumno.carrera,
      semestre:  alumno.semestre,
    },
    kardex: {
      totalMaterias: parsed.materias.length,
      aprobadas:     parsed.materias.filter(m => m.aprobada).length,
    },
    cambio: cambio ? {
      equivalenciasAplicadas:   cambio.equivalenciasAplicadas.length,
      totalCreditosReconocidos: cambio.totalCreditosReconocidos,
      porcentajeAvance:         cambio.porcentajeAvance,
    } : null,
    avisos:  parsed.avisos,
    errores: parsed.errores,
  });
}
