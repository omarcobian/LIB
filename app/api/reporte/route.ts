import { NextRequest, NextResponse } from 'next/server';
import {
  getAlumno, getKardex, getCambioMalla, saveCambioMalla,
  saveAlumno, getConfig, getAlumnos, getCambiosMalla,
  getTemplateConfig, getTemplateFile,
} from '@/lib/db';
import { computeCambioMalla, computeStatsGlobales } from '@/lib/cambio-engine';
import { generateReporteExcel, generateListaGlobalExcel } from '@/lib/report-generator';
import { fillTemplate } from '@/lib/template-filler';
import { fillWordTemplate } from '@/lib/word-filler';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const alumnoId = searchParams.get('alumnoId');
  const tipo = searchParams.get('tipo');
  const config = getConfig();

  if (tipo === 'stats') {
    return NextResponse.json(computeStatsGlobales(getCambiosMalla(), getAlumnos().length));
  }

  if (tipo === 'global' || !alumnoId) {
    const buf = generateListaGlobalExcel(getAlumnos(), getCambiosMalla(), config);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="lista_global_cambio_malla.xlsx"`,
      },
    });
  }

  const alumno = getAlumno(alumnoId);
  if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });

  let cambio = getCambioMalla(alumnoId);
  if (!cambio) {
    const kardex = getKardex(alumnoId);
    if (!kardex) return NextResponse.json({ error: 'Kardex no cargado' }, { status: 400 });
    cambio = computeCambioMalla(alumnoId, kardex, config);
    saveCambioMalla(cambio);
  }

  saveAlumno({ ...alumno, estado: 'reportado' });

  const tplCfg = getTemplateConfig();
  const tplBuffer = getTemplateFile();
  const planConfig = { planAntiguo: config.planAntiguo, planNuevo: config.planNuevo };

  // ── Word template ──────────────────────────────────────
  if (tplCfg.activo && tplCfg.tipo === 'docx' && tplBuffer) {
    try {
      const filled = fillWordTemplate(tplBuffer, alumno, cambio, planConfig);
      const fname = `revalidacion_${alumno.matricula}.docx`;
      return new NextResponse(new Uint8Array(filled), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fname)}"`,
        },
      });
    } catch (err) {
      console.error('Error llenando template Word:', err);
      return NextResponse.json({
        error: 'Error al llenar el formato Word. Verifica que los marcadores estén correctamente escritos.',
        detalle: String(err),
      }, { status: 500 });
    }
  }

  // ── Excel template ─────────────────────────────────────
  if (tplCfg.activo && tplCfg.tipo === 'xlsx' && tplBuffer && tplCfg.celdas.length > 0) {
    try {
      const filled = await fillTemplate(tplBuffer, alumno, cambio, tplCfg, planConfig);
      const fname = `revalidacion_${alumno.matricula}.xlsx`;
      return new NextResponse(new Uint8Array(filled), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fname)}"`,
        },
      });
    } catch (err) {
      console.error('Error llenando template Excel:', err);
    }
  }

  // ── Fallback: generic report ───────────────────────────
  const buf = generateReporteExcel(alumno, cambio, config);
  const fname = `revalidacion_${alumno.matricula}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fname)}"`,
    },
  });
}

export async function POST(req: NextRequest) {
  const { alumnoId } = await req.json();
  const alumno = getAlumno(alumnoId);
  const kardex = getKardex(alumnoId);
  const config = getConfig();
  if (!alumno || !kardex) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  const cambio = computeCambioMalla(alumnoId, kardex, config);
  saveCambioMalla(cambio);
  saveAlumno({ ...alumno, estado: 'procesado' });
  return NextResponse.json(cambio);
}
