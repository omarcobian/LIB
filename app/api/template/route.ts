import { NextRequest, NextResponse } from 'next/server';
import {
  getTemplateConfig, saveTemplateConfig,
  saveTemplateFile, getTemplateFile, hasTemplateFile,
  getTemplateSheetNames,
} from '@/lib/db';

export async function GET() {
  const cfg = getTemplateConfig();
  const sheets = cfg.tipo === 'xlsx' ? getTemplateSheetNames() : [];
  return NextResponse.json({ ...cfg, sheets, tieneArchivo: hasTemplateFile() });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'xlsx' && ext !== 'docx') {
    return NextResponse.json({ error: 'Solo se aceptan archivos .xlsx o .docx' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  saveTemplateFile(buffer);

  const existing = getTemplateConfig();
  const newCfg = {
    ...existing,
    activo: true,
    tipo: ext as 'xlsx' | 'docx',
    nombreArchivo: file.name,
    hojaDefault: 0,
  };
  saveTemplateConfig(newCfg);

  const sheets = ext === 'xlsx' ? getTemplateSheetNames() : [];
  return NextResponse.json({ ok: true, tipo: ext, nombreArchivo: file.name, sheets });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  saveTemplateConfig(body);
  return NextResponse.json({ ok: true });
}
