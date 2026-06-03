'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Link2, Upload, AlertCircle, FileSpreadsheet, CheckCircle, Layers } from 'lucide-react';
import { CAMPOS_FORMATO, type CampoFormato, type CeldaFija, type SeccionFilas, type TemplateConfig } from '@/lib/types';

interface Materia { id: string; clave: string; nombre: string; semestre: number; creditos: number; obligatoria?: boolean; }
interface Equivalencia { id: string; materiaAntiguaId: string; materiaNuevaId: string; }
interface Config {
  carrera: string; planAntiguo: string; planNuevo: string;
  materiasAntiguas: Materia[]; materiasNuevas: Materia[];
  equivalencias: Equivalencia[]; totalCreditosPlanNuevo: number;
}

const emptyMateria = (): Materia => ({
  id: Date.now().toString(36) + Math.random().toString(36).slice(2,5), clave: '', nombre: '', semestre: 1, creditos: 0, obligatoria: true,
});

const COLS_EQUIVALENCIAS = [
  { key: 'claveAntigua',    label: 'Clave materia antigua' },
  { key: 'nombreAntiguo',   label: 'Nombre materia antigua' },
  { key: 'calificacion',    label: 'Calificación obtenida' },
  { key: 'creditosAntiguo', label: 'Créditos (plan antiguo)' },
  { key: 'claveNueva',      label: 'Clave materia nueva' },
  { key: 'nombreNuevo',     label: 'Nombre materia nueva' },
  { key: 'creditosNuevo',   label: 'Créditos reconocidos' },
  { key: 'semestre',        label: 'Semestre (plan nuevo)' },
  { key: 'periodo',         label: 'Periodo cursado' },
  { key: 'observacion',     label: 'Observación' },
] as const;

export default function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [tab, setTab] = useState<'general' | 'antiguo' | 'nuevo' | 'equiv' | 'formato'>('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newEquiv, setNewEquiv] = useState({ antId: '', nuevoId: '' });

  // Template state
  const [tplCfg, setTplCfg] = useState<TemplateConfig & { sheets: string[]; tieneArchivo: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);
  const [savedTpl, setSavedTpl] = useState(false);

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig);
    fetch('/api/template').then(r => r.json()).then(setTplCfg);
  }, []);

  // ── Config save ───────────────────────────────────────────
  const save = async () => {
    if (!config) return;
    setSaving(true);
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const addMateria = (plan: 'antiguas' | 'nuevas') => {
    const k = plan === 'antiguas' ? 'materiasAntiguas' : 'materiasNuevas';
    setConfig(c => c ? { ...c, [k]: [...c[k], emptyMateria()] } : c);
  };

  const updateMateria = (plan: 'Antiguas' | 'Nuevas', id: string, field: string, value: string | number | boolean) => {
    const k = `materias${plan}` as 'materiasAntiguas' | 'materiasNuevas';
    setConfig(c => c ? { ...c, [k]: c[k].map(m => m.id === id ? { ...m, [field]: value } : m) } : c);
  };

  const deleteMateria = (plan: 'Antiguas' | 'Nuevas', id: string) => {
    const k = `materias${plan}` as 'materiasAntiguas' | 'materiasNuevas';
    setConfig(c => c ? { ...c, [k]: c[k].filter(m => m.id !== id) } : c);
  };

  const addEquivalencia = () => {
    if (!newEquiv.antId || !newEquiv.nuevoId) return;
    const eq: Equivalencia = { id: Date.now().toString(36), materiaAntiguaId: newEquiv.antId, materiaNuevaId: newEquiv.nuevoId };
    setConfig(c => c ? { ...c, equivalencias: [...c.equivalencias, eq] } : c);
    setNewEquiv({ antId: '', nuevoId: '' });
  };

  const importCSV = async (file: File, plan: 'Antiguas' | 'Nuevas') => {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      return { id: Date.now().toString(36) + Math.random().toString(36).slice(2,5), clave: cols[0]||'', nombre: cols[1]||'', semestre: parseInt(cols[2])||1, creditos: parseInt(cols[3])||0, obligatoria: (cols[4]||'si').toLowerCase().startsWith('s') };
    }).filter(m => m.nombre);
    const k = `materias${plan}` as 'materiasAntiguas' | 'materiasNuevas';
    setConfig(c => c ? { ...c, [k]: [...c[k], ...rows] } : c);
  };

  // ── Template handlers ─────────────────────────────────────
  const handleTemplateUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/template', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok) {
      const cfg = await fetch('/api/template').then(r => r.json());
      setTplCfg(cfg);
    } else {
      alert(data.error);
    }
    setUploading(false);
  };

  const saveTpl = async () => {
    if (!tplCfg) return;
    setSavingTpl(true);
    const { sheets, tieneArchivo, ...rest } = tplCfg;
    await fetch('/api/template', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rest) });
    setSavingTpl(false); setSavedTpl(true); setTimeout(() => setSavedTpl(false), 2000);
  };

  const setCelda = (campo: CampoFormato, value: string) => {
    setTplCfg(t => {
      if (!t) return t;
      const existing = t.celdas.find(c => c.campo === campo);
      const celdas = existing
        ? t.celdas.map(c => c.campo === campo ? { ...c, celda: value } : c)
        : [...t.celdas, { campo, celda: value, hoja: t.hojaDefault }];
      return { ...t, celdas };
    });
  };

  const getCelda = (campo: CampoFormato): string =>
    tplCfg?.celdas.find(c => c.campo === campo)?.celda ?? '';

  const updateSeccion = (sec: 'equivalencias' | 'faltantes', field: string, value: string | number) => {
    setTplCfg(t => {
      if (!t) return t;
      const current = t[sec] ?? { hoja: 0, filaInicio: 1, cols: {} };
      if (field === 'hoja' || field === 'filaInicio') {
        return { ...t, [sec]: { ...current, [field]: Number(value) } };
      }
      return { ...t, [sec]: { ...current, cols: { ...current.cols, [field]: value } } };
    });
  };

  const getSecCol = (sec: 'equivalencias' | 'faltantes', key: string): string =>
    (tplCfg?.[sec]?.cols as Record<string, string> | undefined)?.[key] ?? '';

  if (!config || !tplCfg) return <div className="p-8 text-slate-500">Cargando...</div>;

  const tabs = [
    { key: 'general',  label: 'General' },
    { key: 'antiguo',  label: `Plan Antiguo (${config.materiasAntiguas.length})` },
    { key: 'nuevo',    label: `Plan Nuevo (${config.materiasNuevas.length})` },
    { key: 'equiv',    label: `Equivalencias (${config.equivalencias.length})` },
    { key: 'formato',  label: '📋 Formato Institucional', highlight: true },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Configuración</h1>
          <p className="text-slate-500 text-sm mt-1">Planes, equivalencias y formato institucional</p>
        </div>
        {tab !== 'formato' ? (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
            <Save size={15} /> {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        ) : (
          <button onClick={saveTpl} disabled={savingTpl}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
            <Save size={15} /> {savingTpl ? 'Guardando...' : savedTpl ? '✓ Guardado' : 'Guardar mapeo'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-slate-700 text-slate-100' : t.highlight ? 'text-cyan-400 hover:text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {tab === 'general' && (
        <div className="card max-w-lg space-y-4">
          {[
            { key: 'carrera', label: 'Nombre de la carrera' },
            { key: 'planAntiguo', label: 'Nombre del plan antiguo', placeholder: 'Ej: Plan 2015' },
            { key: 'planNuevo', label: 'Nombre del plan nuevo', placeholder: 'Ej: Plan 2024' },
            { key: 'totalCreditosPlanNuevo', label: 'Total de créditos del plan nuevo', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
              <input type={f.type || 'text'} placeholder={f.placeholder || ''}
                value={String((config as unknown as Record<string, unknown>)[f.key] ?? '')}
                onChange={e => setConfig(c => c ? { ...c, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value } : c)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500" />
            </div>
          ))}
        </div>
      )}

      {/* ── PLANES ── */}
      {(tab === 'antiguo' || tab === 'nuevo') && (() => {
        const plan = tab === 'antiguo' ? 'Antiguas' : 'Nuevas';
        const materias = tab === 'antiguo' ? config.materiasAntiguas : config.materiasNuevas;
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => addMateria(tab === 'antiguo' ? 'antiguas' : 'nuevas')}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">
                <Plus size={14} /> Agregar materia
              </button>
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 rounded-lg text-sm transition-colors cursor-pointer">
                <Upload size={14} /> Importar CSV
                <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && importCSV(e.target.files[0], plan)} />
              </label>
              <span className="text-xs text-slate-600">CSV: clave, nombre, semestre, creditos, obligatoria</span>
            </div>
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Clave', 'Nombre de la materia', 'Sem.', 'Créditos', tab === 'nuevo' ? 'Obligatoria' : '', ''].filter(Boolean).map((h, i) => (
                      <th key={i} className="text-left text-xs text-slate-500 px-3 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materias.map(m => (
                    <tr key={m.id} className="border-b border-slate-800/50">
                      <td className="px-3 py-2"><input value={m.clave} onChange={e => updateMateria(plan, m.id, 'clave', e.target.value)} placeholder="Clave" className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-600" /></td>
                      <td className="px-3 py-2"><input value={m.nombre} onChange={e => updateMateria(plan, m.id, 'nombre', e.target.value)} placeholder="Nombre" className="w-full min-w-52 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-600" /></td>
                      <td className="px-3 py-2"><input type="number" min="1" max="12" value={m.semestre} onChange={e => updateMateria(plan, m.id, 'semestre', Number(e.target.value))} className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-600" /></td>
                      <td className="px-3 py-2"><input type="number" min="0" value={m.creditos} onChange={e => updateMateria(plan, m.id, 'creditos', Number(e.target.value))} className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-600" /></td>
                      {tab === 'nuevo' && <td className="px-3 py-2"><input type="checkbox" checked={m.obligatoria ?? true} onChange={e => updateMateria(plan, m.id, 'obligatoria', e.target.checked)} className="accent-cyan-500" /></td>}
                      <td className="px-3 py-2"><button onClick={() => deleteMateria(plan, m.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                  {materias.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-600">Sin materias. Agrega manualmente o importa CSV.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── EQUIVALENCIAS ── */}
      {tab === 'equiv' && (
        <div>
          {(config.materiasAntiguas.length === 0 || config.materiasNuevas.length === 0) ? (
            <div className="card flex items-center gap-3 text-slate-400 border-dashed mb-4">
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              <p className="text-sm">Primero define las materias del Plan Antiguo y del Plan Nuevo.</p>
            </div>
          ) : (
            <div className="card mb-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Link2 size={14} className="text-cyan-400" /> Agregar equivalencia
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Materia del Plan Antiguo</label>
                  <select value={newEquiv.antId} onChange={e => setNewEquiv(p => ({ ...p, antId: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500">
                    <option value="">Seleccionar...</option>
                    {config.materiasAntiguas.map(m => <option key={m.id} value={m.id}>{m.nombre}{m.clave ? ` (${m.clave})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Equivale en Plan Nuevo</label>
                  <select value={newEquiv.nuevoId} onChange={e => setNewEquiv(p => ({ ...p, nuevoId: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500">
                    <option value="">Seleccionar...</option>
                    {config.materiasNuevas.map(m => <option key={m.id} value={m.id}>{m.nombre}{m.clave ? ` (${m.clave})` : ''}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={addEquivalencia} disabled={!newEquiv.antId || !newEquiv.nuevoId}
                className="mt-3 flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40">
                <Plus size={14} /> Agregar
              </button>
            </div>
          )}
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Materia Plan Antiguo', 'Materia Plan Nuevo', ''].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.equivalencias.map(eq => {
                  const ant = config.materiasAntiguas.find(m => m.id === eq.materiaAntiguaId);
                  const nuevo = config.materiasNuevas.find(m => m.id === eq.materiaNuevaId);
                  return (
                    <tr key={eq.id} className="border-b border-slate-800/50">
                      <td className="px-4 py-3 text-slate-300">{ant?.nombre || <span className="text-red-400">Eliminada</span>} {ant?.clave && <span className="text-xs text-slate-600">({ant.clave})</span>}</td>
                      <td className="px-4 py-3 text-cyan-300">{nuevo?.nombre || <span className="text-red-400">Eliminada</span>} {nuevo?.clave && <span className="text-xs text-slate-600">({nuevo.clave})</span>}</td>
                      <td className="px-4 py-3"><button onClick={() => setConfig(c => c ? { ...c, equivalencias: c.equivalencias.filter(e => e.id !== eq.id) } : c)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
                {config.equivalencias.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-600">Sin equivalencias.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FORMATO INSTITUCIONAL ── */}
      {tab === 'formato' && (
        <div className="space-y-6 max-w-3xl">

          {/* Step 1: Upload */}
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold flex items-center justify-center">1</span>
              Subir el formato institucional
            </h2>
            <p className="text-xs text-slate-500 mb-4 ml-7">
              Sube tu formato en <strong className="text-slate-400">Word (.docx)</strong> o <strong className="text-slate-400">Excel (.xlsx)</strong>.
              El sistema lo llenará sin tocar el diseño original.
            </p>

            {tplCfg.tieneArchivo && (
              <div className="flex items-center gap-3 mb-3 ml-7">
                <CheckCircle size={14} className="text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">{tplCfg.nombreArchivo}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${tplCfg.tipo === 'docx' ? 'bg-blue-950 text-blue-400' : 'bg-emerald-950 text-emerald-400'}`}>
                  .{tplCfg.tipo}
                </span>
                {tplCfg.sheets.length > 0 && (
                  <span className="text-slate-500 text-xs">{tplCfg.sheets.length} hoja(s): {tplCfg.sheets.join(', ')}</span>
                )}
              </div>
            )}

            <label className={`ml-7 flex items-center gap-3 cursor-pointer px-4 py-3 border-2 border-dashed rounded-lg transition-colors w-fit ${uploading ? 'border-cyan-700' : 'border-slate-700 hover:border-cyan-700 hover:bg-cyan-950/10'}`}>
              <FileSpreadsheet size={16} className="text-slate-400" />
              <span className="text-sm text-slate-400">
                {uploading ? 'Subiendo...' : tplCfg.tieneArchivo ? 'Cambiar formato (.docx o .xlsx)' : 'Seleccionar formato (.docx o .xlsx)'}
              </span>
              <input type="file" accept=".xlsx,.docx" className="hidden" disabled={uploading}
                onChange={e => e.target.files?.[0] && handleTemplateUpload(e.target.files[0])} />
            </label>
          </div>

          {/* ═══ WORD CONFIG ═══════════════════════════════════════ */}
          {tplCfg.tieneArchivo && tplCfg.tipo === 'docx' && (
            <>
              {/* Instructions for Word */}
              <div className="card border-blue-900 bg-blue-950/20">
                <h2 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">2</span>
                  Cómo preparar tu formato Word
                </h2>
                <p className="text-xs text-slate-400 mb-3 ml-7">
                  Abre tu .docx y agrega estos marcadores exactamente donde quieres que aparezca cada dato. El sistema los reemplaza al generar.
                </p>
                <div className="ml-7 grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                  <div className="font-semibold text-slate-500 mb-1">Campos del alumno</div>
                  <div className="font-semibold text-slate-500 mb-1">Totales</div>
                  {[
                    ['{nombreAlumno}', 'Nombre completo'],
                    ['{matricula}', 'Matrícula'],
                    ['{carrera}', 'Carrera'],
                    ['{fecha}', 'Fecha de llenado'],
                    ['{planAntiguo}', 'Plan anterior'],
                    ['{planNuevo}', 'Plan nuevo'],
                    ['{semestre}', 'Semestre actual'],
                  ].map(([tag, desc]) => (
                    <div key={tag} className="flex items-center gap-2 py-0.5">
                      <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-xs">{tag}</code>
                      <span className="text-slate-500">{desc}</span>
                    </div>
                  ))}
                  {[
                    ['{totalCreditosReconocidos}', 'Créditos reconocidos'],
                    ['{totalCreditosFaltantes}', 'Créditos faltantes'],
                    ['{porcentajeAvance}', '% avance'],
                    ['{totalMateriasReconocidas}', 'Materias reconocidas'],
                    ['{totalMateriasFaltantes}', 'Materias faltantes'],
                  ].map(([tag, desc]) => (
                    <div key={tag} className="flex items-center gap-2 py-0.5">
                      <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-xs">{tag}</code>
                      <span className="text-slate-500">{desc}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 ml-7 p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Tabla de materias revalidadas (filas variables)</p>
                  <p className="text-xs text-slate-500 mb-2">En tu tabla de Word, la <strong className="text-slate-400">fila de datos</strong> (no el encabezado) debe contener:</p>
                  <div className="bg-slate-950 rounded p-2 font-mono text-xs text-cyan-300 space-y-0.5">
                    <div>{'Celda 1 de la fila: {#revalidadas}'}</div>
                    <div>{'Celda 2: {claveAntigua}'}</div>
                    <div>{'Celda 3: {nombreAntiguo}'}</div>
                    <div>{'Celda 4: {calificacion}'}</div>
                    <div>{'Celda 5: {claveNueva}'}</div>
                    <div>{'Celda 6: {nombreNuevo}'}</div>
                    <div>{'Celda 7: {creditosNuevo}'}</div>
                    <div>{'Última celda: {/revalidadas}'}</div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">docxtemplater duplicará esa fila una vez por cada materia revalidada del alumno.</p>
                </div>

                <div className="mt-3 ml-7 p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Tabla de materias faltantes (opcional)</p>
                  <div className="bg-slate-950 rounded p-2 font-mono text-xs text-cyan-300 space-y-0.5">
                    <div>{'Celda 1 de la fila: {#faltantes}'}</div>
                    <div>{'Celda 2: {clave}'}</div>
                    <div>{'Celda 3: {nombre}'}</div>
                    <div>{'Celda 4: {creditos}'}</div>
                    <div>{'Celda 5: {semestre}'}</div>
                    <div>{'Celda 6: {prioridad}'}</div>
                    <div>{'Última celda: {/faltantes}'}</div>
                  </div>
                </div>

                <div className="mt-3 ml-7 flex items-start gap-2 text-xs text-amber-500">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>No dejes espacios dentro de los marcadores: <code className="bg-slate-800 px-1 rounded">{'{ nombreAlumno }'}</code> no funciona, debe ser <code className="bg-slate-800 px-1 rounded">{'{nombreAlumno}'}</code>.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-950/30 border border-emerald-900 rounded-lg text-xs text-emerald-400">
                <CheckCircle size={14} className="shrink-0" />
                <span>Formato Word listo. No necesitas más configuración. Al descargar el reporte de cada alumno se generará un .docx con las filas exactas que correspondan.</span>
              </div>
            </>
          )}

          {/* ═══ EXCEL CONFIG ══════════════════════════════════════ */}
          {tplCfg.tieneArchivo && tplCfg.tipo === 'xlsx' && (
            <>
              {/* Sheet selector */}
              {tplCfg.sheets.length > 1 && (
                <div className="card">
                  <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold flex items-center justify-center">2</span>
                    Hoja del formato
                  </h2>
                  <div className="ml-7 flex gap-2 flex-wrap">
                    {tplCfg.sheets.map((s, i) => (
                      <button key={i} onClick={() => setTplCfg(t => t ? { ...t, hojaDefault: i } : t)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${tplCfg.hojaDefault === i ? 'bg-cyan-500 border-cyan-500 text-slate-950 font-semibold' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Static cells */}
              <div className="card">
                <h2 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold flex items-center justify-center">{tplCfg.sheets.length > 1 ? '3' : '2'}</span>
                  Celdas fijas
                </h2>
                <p className="text-xs text-slate-500 mb-4 ml-7">
                  Escribe la dirección de la celda donde va cada dato (ej: <code className="bg-slate-800 px-1 rounded">B5</code>). Deja vacío lo que no aplique.
                </p>
                <div className="ml-7 grid grid-cols-2 gap-x-6 gap-y-3">
                  {CAMPOS_FORMATO.map(({ campo, etiqueta }) => (
                    <div key={campo} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 flex-1">{etiqueta}</span>
                      <input value={getCelda(campo)} onChange={e => setCelda(campo, e.target.value.toUpperCase())}
                        placeholder="B5" maxLength={6}
                        className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-center" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Equivalencias rows */}
              <div className="card">
                <h2 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold flex items-center justify-center">{tplCfg.sheets.length > 1 ? '4' : '3'}</span>
                  Tabla de materias revalidadas
                </h2>
                <p className="text-xs text-slate-500 mb-1 ml-7">
                  Indica la primera fila de datos y la columna de cada campo. Deja vacías las columnas que no uses.
                </p>
                <p className="text-xs text-amber-600 mb-4 ml-7">
                  ⚠ Para Excel, deja suficientes filas vacías con el mismo formato en tu plantilla (ej. 30 filas). El sistema las llenará de arriba hacia abajo.
                </p>
                <div className="ml-7 space-y-4">
                  <div className="flex gap-4 items-end">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Primera fila de datos (nº)</label>
                      <input type="number" min="1" value={tplCfg.equivalencias?.filaInicio ?? 1}
                        onChange={e => updateSeccion('equivalencias', 'filaInicio', e.target.value)}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
                    </div>
                    {tplCfg.sheets.length > 1 && (
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Hoja</label>
                        <select value={tplCfg.equivalencias?.hoja ?? 0}
                          onChange={e => updateSeccion('equivalencias', 'hoja', e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500">
                          {tplCfg.sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {COLS_EQUIVALENCIAS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 flex-1">{label}</span>
                        <input value={getSecCol('equivalencias', key)} onChange={e => updateSeccion('equivalencias', key, e.target.value.toUpperCase())}
                          placeholder="A" maxLength={3}
                          className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-center" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Faltantes rows */}
              <div className="card border-dashed">
                <h2 className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
                  <Layers size={14} className="text-slate-500" /> Materias faltantes <span className="text-xs text-slate-600 font-normal">(opcional)</span>
                </h2>
                <div className="space-y-4 mt-3">
                  <div className="flex gap-4 items-end">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Primera fila</label>
                      <input type="number" min="1" value={tplCfg.faltantes?.filaInicio ?? 1}
                        onChange={e => updateSeccion('faltantes', 'filaInicio', e.target.value)}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
                    </div>
                    {tplCfg.sheets.length > 1 && (
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Hoja</label>
                        <select value={tplCfg.faltantes?.hoja ?? 0}
                          onChange={e => updateSeccion('faltantes', 'hoja', e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500">
                          {tplCfg.sheets.map((s, i) => <option key={i} value={i}>{s}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      { key: 'claveNueva', label: 'Clave materia' },
                      { key: 'nombreNuevo', label: 'Nombre de la materia' },
                      { key: 'creditosNuevo', label: 'Créditos' },
                      { key: 'semestre', label: 'Semestre' },
                      { key: 'observacion', label: 'Observación / Prioridad' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 flex-1">{label}</span>
                        <input value={getSecCol('faltantes', key)} onChange={e => updateSeccion('faltantes', key, e.target.value.toUpperCase())}
                          placeholder="A" maxLength={3}
                          className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-center" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 px-4 py-3 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-500">
                <AlertCircle size={14} className="text-cyan-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400 font-medium mb-0.5">Cómo encontrar las celdas</p>
                  <p>Abre tu formato en Excel, haz clic en el campo y la dirección aparece arriba a la izquierda (ej: <code className="bg-slate-800 px-1 rounded">B7</code>).</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

