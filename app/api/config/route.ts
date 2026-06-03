import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/db';
import { Config } from '@/lib/types';

export async function GET() {
  return NextResponse.json(getConfig());
}

export async function POST(req: NextRequest) {
  const body: Config = await req.json();
  saveConfig(body);
  return NextResponse.json({ ok: true });
}
