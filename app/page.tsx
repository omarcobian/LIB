'use client';
import { useEffect, useState } from 'react';
import { Users, CheckCircle, Clock, TrendingUp, Download, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalAlumnos: number;
  procesados: number;
  pendientes: number;
  promedioCredReconocidos: number;
  materiasMasSolicitadas: { nombre: string; count: number }[];
}

interface Config {
  carrera: string;
  planAntiguo: string;
  planNuevo: string;
  equivalencias: unknown[];
  materiasNuevas: unknown[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/alumnos').then(r => r.json()),
      fetch('/api/config').then(r => r.json()),
      fetch('/api/reporte?tipo=stats').then(r => r.ok ? r.json() : null),
    ]).then(([alumnos, cfg, statsData]) => {
      setConfig(cfg);
      const procesados = alumnos.filter((a: { estado: string }) => a.estado !== 'pendiente').length;
      setStats({
        totalAlumnos: alumnos.length,
        procesados,
        pendientes: alumnos.length - procesados,
        promedioCredReconocidos: statsData?.promedioCredReconocidos ?? 0,
        materiasMasSolicitadas: statsData?.materiasMasSolicitadas ?? [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const pct = stats && stats.totalAlumnos > 0
    ? Math.round((stats.procesados / stats.totalAlumnos) * 100) : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        {config?.carrera && (
          <p className="text-slate-400 mt-1">
            {config.carrera} · {config.planAntiguo} → {config.planNuevo}
          </p>
        )}
      </div>

      {/* Config warning */}
      {config && !config.carrera && (
        <div className="mb-6 p-4 bg-amber-950 border border-amber-800 rounded-lg flex items-center gap-3">
          <BookOpen size={18} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-amber-300 font-medium text-sm">Configuración pendiente</p>
            <p className="text-amber-500 text-xs mt-0.5">
              Ve a{' '}
              <Link href="/configuracion" className="underline">Configuración</Link>
              {' '}para definir los planes y equivalencias antes de procesar alumnos.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Total Alumnos', value: stats?.totalAlumnos ?? 0, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-950' },
          { label: 'Procesados', value: stats?.procesados ?? 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-950' },
          { label: 'Pendientes', value: stats?.pendientes ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-950' },
          { label: 'Créditos reconocidos (prom.)', value: stats?.promedioCredReconocidos ?? 0, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-950' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-100">{loading ? '—' : value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {stats && stats.totalAlumnos > 0 && (
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-slate-300">Progreso general</span>
            <span className="text-sm font-bold text-cyan-400">{pct}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-2">
            {stats.procesados} de {stats.totalAlumnos} alumnos con cambio de malla generado
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <Link href="/alumnos"
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-sm font-semibold transition-colors">
          <Users size={15} /> Gestionar Alumnos
        </Link>
        <a href="/api/reporte?tipo=global"
          className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-slate-100 rounded-lg text-sm font-medium transition-colors">
          <Download size={15} /> Exportar Lista Global
        </a>
      </div>

      {/* Top materias faltantes */}
      {stats && stats.materiasMasSolicitadas.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            Materias más solicitadas (mayor demanda de cupos)
          </h2>
          <div className="space-y-2">
            {stats.materiasMasSolicitadas.slice(0, 8).map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-5 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-300">{m.nombre}</span>
                    <span className="text-xs text-slate-500">{m.count} alumnos</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${(m.count / (stats.totalAlumnos || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
