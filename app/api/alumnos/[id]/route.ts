import { NextRequest, NextResponse } from 'next/server';
import {
  getAlumno, saveAlumno, deleteAlumno,
  getKardex, saveKardex, getCambioMalla, saveCambioMalla,
  getConfig,
} from '@/lib/db';
import { computeCambioMalla } from '@/lib/cambio-engine';
import { parseKardexExcel } from '@/lib/kardex-parser';
import { generateReporteExcel } from '@/lib/report-generator';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const alumno = getAlumno(id);
  if (!alumno) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const kardex = getKardex(id);
  const cambio = getCambioMalla(id);
  return NextResponse.json({ alumno, kardex, cambio });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const alumno = getAlumno(id);
  if (!alumno) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  saveAlumno({ ...alumno, ...body });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  deleteAlumno(id);
  return NextResponse.json({ ok: true });
}
