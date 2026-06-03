import { NextRequest, NextResponse } from 'next/server';
import { getAlumnos, saveAlumno, generateId } from '@/lib/db';
import { Alumno } from '@/lib/types';

export async function GET() {
  return NextResponse.json(getAlumnos());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const alumno: Alumno = {
    ...body,
    id: body.id || generateId(),
    createdAt: body.createdAt || new Date().toISOString(),
    estado: body.estado || 'pendiente',
  };
  saveAlumno(alumno);
  return NextResponse.json(alumno);
}
