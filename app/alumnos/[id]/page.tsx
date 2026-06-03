'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload, Download, RefreshCw, ChevronLeft,
  CheckCircle, XCircle, AlertCircle, BookOpen, List
} from 'lucide-react';

interface Alumno { id: string; matricula: string; nombre: string; semestre: number; carrera: string; estado: string; }
interface KardexMateria { clave: string; nombre: string; calificacion: number; creditos: number; aprobada: boolean; periodo?: string; }
interface KardexAlumno { materias: KardexMateria[]; cargadoEn: string; }
interface EquivalenciaAplicada {
  materiaAntigua: KardexMateria;
  materiaNueva: { clave: string; nombre: string; creditos: number; semestre: number };
  creditosReconocidos: number; calificacion: number;
}
interface MateriaFaltante { materia: { clave: string; nombre: string; creditos: number; semestre: number; obligatoria: boolean }; semestre: number; }
interface CambioMalla {
  equivalenciasAplicadas: EquivalenciaAplicada[];
  materiasFaltantes: MateriaFaltante[];
  totalCreditosReconocidos: number;
  totalCreditosFaltantes: number;
  porcentajeAvance: number;
  fechaGenerado: string;
}

export default function AlumnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [kardex, setKardex] = useState<KardexAlumno | null>(null);
  const [cambio, setCambio] = useState<CambioMalla | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [tab, setTab] = useState<'equivalencias' | 'faltantes' | 'kardex'>('equivalencias');

  const load = () => {
    fetch(`/api/alumnos/${id}`).then(r => r.json()).then(data => {
      setAlumno(data.alumno);
      setKardex(data.kardex);
      setCambio(data.cambio);
    });
  };

  useEffect(() => { load(); }, [id]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadMsg('');
    const form = new FormData();
    form.append('alumnoId', id);
    form.append('file', file);
    const res = await fetch('/api/kardex', { method: 'POST', body: form });
    const data = await res.json();
    if (res.ok) {
      const { kardex, cambio, avisos } = data;
      let msg = `✓ ${kardex.aprobadas} materias aprobadas de ${kardex.totalMaterias} encontradas.`;
      if (cambio) msg += ` · ${cambio.equivalenciasAplicadas} equivalencias · ${cambio.porcentajeAvance}% de avance.`;
      if (avisos?.length) msg += ` ⚠ ${avisos[0]}`;
      setUploadMsg(msg);
      load();
    } else {
      setUploadMsg(`✗ ${data.error}`);
    }
    setUploading(false);
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    await fetch('/api/reporte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumnoId: id }),
    });
    setRecomputing(false);
    load();
  };

  if (!alumno) return <div className="p-8 text-slate-500">Cargando...</div>;

  const semColors = ['', 'bg-cyan-950 text-cyan-400', 'bg-blue-950 text-blue-400',
    'bg-violet-950 text-violet-400', 'bg-slate-800 text-slate-400',
    'bg-slate-800 text-slate-400', 'bg-slate-800 text-slate-400'];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/alumnos" className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-sm mb-3 transition-colors">
            <ChevronLeft size={14} /> Alumnos
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">{alumno.nombre}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Mat: <span className="font-mono text-slate-400">{alumno.matricula}</span>
            {alumno.carrera && <> · {alumno.carrera}</>}
            {' '}· {alumno.semestre}° semestre
          </p>
        </div>
        <div className="flex items-center gap-2">
          {kardex && (
            <button onClick={handleRecompute} disabled={recomputing}
              className="flex items-center gap-2 px-3 py-2 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-lg text-sm transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={recomputing ? 'animate-spin' : ''} />
              Recalcular
            </button>
          )}
          {cambio && (
            <a href={`/api/reporte?alumnoId=${id}`}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">
              <Download size={14} /> Descargar Formato
            </a>
          )}
        </div>
      </div>

      {/* Upload kardex */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Upload size={14} className="text-cyan-400" /> Kardex del Alumno
        </h2>
        {kardex && (
          <div className="mb-3 text-sm flex items-center gap-3">
            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
            <span className="text-slate-400">
              {kardex.materias.length} materias · {kardex.materias.filter(m => m.aprobada).length} aprobadas
              · Cargado {new Date(kardex.cargadoEn).toLocaleDateString('es-MX')}
            </span>
          </div>
        )}
        <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${uploading ? 'border-cyan-700 bg-cyan-950/20' : 'border-slate-700 hover:border-cyan-700 hover:bg-cyan-950/10'}`}>
          <Upload size={16} className="text-slate-500" />
          <div>
            <p className="text-sm text-slate-400">
              {uploading ? 'Procesando...' : kardex ? 'Reemplazar kardex (PDF/Excel)' : 'Subir kardex (PDF/Excel)'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {uploading ? 'Extrayendo datos automáticamente...' : 'El sistema actualizará los datos del alumno automáticamente · .xlsx, .xls, .csv'}
            </p>
          </div>
          <input type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv"
            disabled={uploading}
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </label>
        {uploadMsg && (
          <p className={`mt-2 text-xs ${uploadMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
            {uploadMsg}
          </p>
        )}
      </div>

      {/* Cambio malla results */}
      {cambio && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card text-center">
              <p className="text-3xl font-bold text-cyan-400">{cambio.equivalenciasAplicadas.length}</p>
              <p className="text-xs text-slate-500 mt-1">Materias reconocidas</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-emerald-400">{cambio.totalCreditosReconocidos}</p>
              <p className="text-xs text-slate-500 mt-1">Créditos reconocidos</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-amber-400">{cambio.porcentajeAvance}%</p>
              <p className="text-xs text-slate-500 mt-1">Avance en plan nuevo</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-slate-900 p-1 rounded-lg w-fit">
            {[
              { key: 'equivalencias', label: `Equivalencias (${cambio.equivalenciasAplicadas.length})`, icon: CheckCircle },
              { key: 'faltantes', label: `Materias faltantes (${cambio.materiasFaltantes.length})`, icon: List },
              { key: 'kardex', label: `Kardex completo`, icon: BookOpen },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key as typeof tab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${tab === key ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {/* Equivalencias tab */}
          {tab === 'equivalencias' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs text-slate-500 px-4 py-3" colSpan={3}>Plan Antiguo</th>
                    <th className="text-left text-xs text-slate-500 px-4 py-3" colSpan={3}>Plan Nuevo (equivalente)</th>
                  </tr>
                  <tr className="border-b border-slate-800">
                    {['Clave', 'Materia cursada', 'Cal.', 'Clave', 'Equivalente en plan nuevo', 'Créd.'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-600 px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cambio.equivalenciasAplicadas.map((eq, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{eq.materiaAntigua.clave || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{eq.materiaAntigua.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${eq.calificacion >= 8 ? 'text-emerald-400' : eq.calificacion >= 6 ? 'text-amber-400' : 'text-red-400'}`}>
                          {eq.calificacion}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{eq.materiaNueva.clave || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{eq.materiaNueva.nombre}</td>
                      <td className="px-4 py-3 text-cyan-400 font-semibold">{eq.creditosReconocidos}</td>
                    </tr>
                  ))}
                  {cambio.equivalenciasAplicadas.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-600">Sin equivalencias encontradas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Faltantes tab */}
          {tab === 'faltantes' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Sem.', 'Clave', 'Materia Faltante', 'Créd.', 'Tipo', 'Prioridad'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cambio.materiasFaltantes.map((f, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${semColors[Math.min(f.semestre, 6)] || 'bg-slate-800 text-slate-400'}`}>
                          S{f.semestre}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{f.materia.clave || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{f.materia.nombre}</td>
                      <td className="px-4 py-3 text-slate-400">{f.materia.creditos}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${f.materia.obligatoria ? 'text-red-400' : 'text-slate-500'}`}>
                          {f.materia.obligatoria ? 'Obligatoria' : 'Optativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {f.semestre <= 3 && (
                          <span className="text-xs bg-amber-950 text-amber-400 px-2 py-0.5 rounded font-semibold">
                            ⚠ ASEGURAR CUPO
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kardex tab */}
          {tab === 'kardex' && kardex && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Clave', 'Materia', 'Cal.', 'Créd.', 'Periodo', 'Estado'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kardex.materias.map((m, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.clave || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{m.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${m.aprobada ? (m.calificacion >= 8 ? 'text-emerald-400' : 'text-amber-400') : 'text-red-400'}`}>
                          {m.calificacion || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{m.creditos || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{m.periodo || '—'}</td>
                      <td className="px-4 py-3">
                        {m.aprobada
                          ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={11} /> Aprobada</span>
                          : <span className="flex items-center gap-1 text-xs text-slate-600"><XCircle size={11} /> No aprobada</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!cambio && kardex && (
        <div className="card flex items-center gap-3 text-slate-400">
          <AlertCircle size={18} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium">Kardex cargado pero sin equivalencias configuradas.</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Ve a <Link href="/configuracion" className="text-cyan-400 underline">Configuración</Link> para definir las equivalencias y luego haz clic en "Recalcular".
            </p>
          </div>
        </div>
      )}

      {!kardex && (
        <div className="card flex items-center gap-3 text-slate-500 border-dashed">
          <Upload size={18} className="shrink-0" />
          <p className="text-sm">Sube el kardex del alumno para generar el análisis de cambio de malla.</p>
        </div>
      )}
    </div>
  );
}
