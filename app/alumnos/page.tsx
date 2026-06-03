'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Upload, Search, CheckCircle, Clock, FileSpreadsheet, Trash2, ChevronRight, AlertCircle, X } from 'lucide-react';

interface Alumno {
  id: string; matricula: string; nombre: string;
  semestre: number; carrera: string; estado: string;
}

const estadoConfig = {
  pendiente: { label: 'Pendiente',  color: 'text-amber-400 bg-amber-950',   icon: Clock },
  procesado: { label: 'Procesado',  color: 'text-cyan-400 bg-cyan-950',     icon: CheckCircle },
  reportado: { label: 'Reportado',  color: 'text-emerald-400 bg-emerald-950', icon: FileSpreadsheet },
};

interface UploadResult {
  alumnoId: string;
  alumno: { nombre: string; matricula: string; carrera: string; semestre: number };
  kardex: { totalMaterias: number; aprobadas: number };
  cambio: { equivalenciasAplicadas: number; totalCreditosReconocidos: number; porcentajeAvance: number } | null;
  avisos: string[];
  errores: string[];
}

export default function AlumnosPage() {
  const [alumnos, setAlumnos]   = useState<Alumno[]>([]);
  const [search, setSearch]     = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults]   = useState<UploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() =>
    fetch('/api/alumnos').then(r => r.json()).then(setAlumnos), []);

  useEffect(() => { load(); }, [load]);

  const filtered = alumnos.filter(a =>
    a.nombre.toLowerCase().includes(search.toLowerCase()) ||
    a.matricula.includes(search)
  );

  // ── Upload one or multiple kardex files ──────────────────────────────────
  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f: File) =>
      f.name.match(/\.(pdf|xlsx|xls|csv)$/i)
    );
    if (!arr.length) return;

    setUploading(true);
    setResults([]);
    setShowResults(true);
    const newResults: UploadResult[] = [];

    for (const file of arr) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/kardex', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) newResults.push(data);
        else newResults.push({
          alumnoId: '', alumno: { nombre: file.name, matricula: '—', carrera: '', semestre: 0 },
          kardex: { totalMaterias: 0, aprobadas: 0 }, cambio: null,
          avisos: [], errores: [data.error || 'Error desconocido'],
        });
      } catch {
        newResults.push({
          alumnoId: '', alumno: { nombre: file.name, matricula: '—', carrera: '', semestre: 0 },
          kardex: { totalMaterias: 0, aprobadas: 0 }, cambio: null,
          avisos: [], errores: ['Error de conexión'],
        });
      }
      setResults([...newResults]);
    }

    setUploading(false);
    load();
  };

  // Drag & drop handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    uploadFiles(e.dataTransfer.files);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    await fetch(`/api/alumnos/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Alumnos</h1>
        <p className="text-slate-500 text-sm mt-1">
          {alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''} registrado{alumnos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── DROP ZONE ─────────────────────────────────────────────────────── */}
      <div
        ref={dropRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative mb-6 border-2 border-dashed rounded-xl transition-all duration-200 ${
          dragging
            ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]'
            : uploading
            ? 'border-cyan-700 bg-cyan-950/10'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/40'
        }`}
      >
        <label className="flex flex-col items-center justify-center py-10 cursor-pointer">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragging ? 'bg-cyan-500' : 'bg-slate-800'}`}>
            <Upload size={24} className={dragging ? 'text-slate-950' : 'text-slate-400'} />
          </div>
          <p className="text-base font-semibold text-slate-300 mb-1">
            {uploading ? 'Procesando kardex...' : 'Arrastra el kardex aquí'}
          </p>
          <p className="text-sm text-slate-500">
            {uploading
              ? 'Extrayendo datos y calculando equivalencias...'
              : 'o haz clic para seleccionar · Acepta .pdf, .xlsx, .xls, .csv · Puedes subir varios a la vez'}
          </p>
          {uploading && (
            <div className="mt-4 w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full animate-pulse w-full" />
            </div>
          )}
          <input
            type="file" multiple accept=".pdf,.xlsx,.xls,.csv"
            className="hidden" disabled={uploading}
            onChange={e => e.target.files && uploadFiles(e.target.files)}
          />
        </label>
      </div>

      {/* ── RESULTADOS DE CARGA ───────────────────────────────────────────── */}
      {showResults && results.length > 0 && (
        <div className="mb-6 card border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <CheckCircle size={14} className="text-cyan-400" />
              Resultado de la carga ({results.length} archivo{results.length !== 1 ? 's' : ''})
            </h2>
            <button onClick={() => setShowResults(false)} className="text-slate-600 hover:text-slate-400">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm ${r.errores.length ? 'bg-red-950/30 border border-red-900' : 'bg-slate-800/60'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-200">{r.alumno.nombre}</span>
                      {r.alumno.matricula !== '—' && (
                        <span className="font-mono text-xs text-slate-500">{r.alumno.matricula}</span>
                      )}
                      {r.alumno.carrera && (
                        <span className="text-xs text-slate-600">· {r.alumno.carrera}</span>
                      )}
                    </div>
                    {!r.errores.length && (
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        <span>{r.kardex.aprobadas} materias aprobadas de {r.kardex.totalMaterias}</span>
                        {r.cambio && (
                          <>
                            <span className="text-cyan-400 font-medium">{r.cambio.equivalenciasAplicadas} equivalencias reconocidas</span>
                            <span className="text-emerald-400 font-medium">{r.cambio.porcentajeAvance}% de avance</span>
                          </>
                        )}
                        {!r.cambio && (
                          <span className="text-amber-500">Kardex guardado · Configura equivalencias para calcular</span>
                        )}
                      </div>
                    )}
                    {r.errores.map((e, j) => (
                      <p key={j} className="text-xs text-red-400 mt-1">{e}</p>
                    ))}
                    {r.avisos.map((a, j) => (
                      <p key={j} className="text-xs text-amber-500 mt-1">⚠ {a}</p>
                    ))}
                  </div>
                  {r.alumnoId && (
                    <Link href={`/alumnos/${r.alumnoId}`}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors">
                      Ver <ChevronRight size={11} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BÚSQUEDA ──────────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="Buscar por nombre o matrícula..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-700"
        />
      </div>

      {/* ── TABLA ─────────────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Upload size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">
              {search
                ? 'Sin resultados para la búsqueda.'
                : 'Sube el kardex de los alumnos para comenzar.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Matrícula', 'Nombre', 'Carrera', 'Sem.', 'Estado', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const est = estadoConfig[a.estado as keyof typeof estadoConfig] || estadoConfig.pendiente;
                const EstIcon = est.icon;
                return (
                  <tr key={a.id} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${i % 2 === 1 ? 'bg-slate-900/20' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono text-slate-400">{a.matricula}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-100">{a.nombre}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">{a.carrera || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{a.semestre}°</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${est.color}`}>
                        <EstIcon size={11} /> {est.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => handleDelete(a.id, a.nombre)}
                          className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded">
                          <Trash2 size={13} />
                        </button>
                        <Link href={`/alumnos/${a.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors">
                          Ver <ChevronRight size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Nota */}
      {alumnos.length > 0 && (
        <p className="text-xs text-slate-700 mt-3 flex items-center gap-1.5">
          <AlertCircle size={11} />
          Para corregir datos de un alumno, entra a su perfil y sube el kardex nuevamente.
        </p>
      )}
    </div>
  );
}
