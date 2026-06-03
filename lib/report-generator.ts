import * as XLSX from 'xlsx';
import { CambioMalla, Alumno, Config } from './types';

export function generateReporteExcel(
  alumno: Alumno,
  cambio: CambioMalla,
  config: Config
): Buffer {
  const wb = XLSX.utils.book_new();

  // ── HOJA 1: EQUIVALENCIAS RECONOCIDAS ─────────────────
  const eq = cambio.equivalenciasAplicadas;

  const headerStyle = { font: { bold: true, sz: 11 } };

  // Title rows
  const eqData: (string | number)[][] = [
    [`CAMBIO DE PLAN DE ESTUDIOS - ${config.carrera.toUpperCase()}`],
    [`Del plan: ${config.planAntiguo}  →  Al plan: ${config.planNuevo}`],
    [`Alumno: ${alumno.nombre}`, '', `Matrícula: ${alumno.matricula}`],
    [`Fecha: ${new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}`],
    [],
    ['MATERIAS CON EQUIVALENCIA RECONOCIDA'],
    [],
    [
      'PLAN ANTIGUO',   '', '',
      'PLAN NUEVO',     '', '',
      'RESULTADO',
    ],
    [
      'Clave', 'Materia (Plan Antiguo)', 'Calificación',
      'Clave', 'Materia (Plan Nuevo)', 'Créditos Reconocidos',
      'Observación',
    ],
  ];

  for (const e of eq) {
    eqData.push([
      e.materiaAntigua.clave || '—',
      e.materiaAntigua.nombre,
      e.calificacion,
      e.materiaNueva.clave || '—',
      e.materiaNueva.nombre,
      e.creditosReconocidos,
      'Reconocida',
    ]);
  }

  eqData.push([]);
  eqData.push([
    '', '', '',
    '', 'TOTAL CRÉDITOS RECONOCIDOS:',
    cambio.totalCreditosReconocidos,
    `${cambio.porcentajeAvance}% del plan nuevo`,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(eqData);

  // Column widths
  ws1['!cols'] = [
    { wch: 12 }, { wch: 40 }, { wch: 14 },
    { wch: 12 }, { wch: 40 }, { wch: 20 },
    { wch: 18 },
  ];

  // Merge title cells
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 6 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 2 } },
    { s: { r: 7, c: 3 }, e: { r: 7, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Equivalencias');

  // ── HOJA 2: MATERIAS FALTANTES (PRIORIDAD) ────────────
  const faltData: (string | number | boolean)[][] = [
    [`MATERIAS FALTANTES POR CURSAR - ${alumno.nombre}`],
    [`Ordenadas por semestre de importancia (Plan: ${config.planNuevo})`],
    [],
    ['Sem.', 'Clave', 'Materia', 'Créditos', 'Obligatoria', 'Asegurar Cupo'],
  ];

  for (const f of cambio.materiasFaltantes) {
    faltData.push([
      f.materia.semestre,
      f.materia.clave || '—',
      f.materia.nombre,
      f.materia.creditos,
      f.materia.obligatoria ? 'Sí' : 'No',
      f.semestre <= 3 ? 'PRIORITARIO' : 'Normal',
    ]);
  }

  faltData.push([]);
  faltData.push(['', '', 'TOTAL CRÉDITOS FALTANTES:', cambio.totalCreditosFaltantes]);

  const ws2 = XLSX.utils.aoa_to_sheet(faltData);
  ws2['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 16 },
  ];
  ws2['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Materias Faltantes');

  // ── HOJA 3: RESUMEN ───────────────────────────────────
  const resData = [
    ['RESUMEN CAMBIO DE MALLA'],
    [],
    ['Alumno:', alumno.nombre],
    ['Matrícula:', alumno.matricula],
    ['Carrera:', alumno.carrera],
    ['Plan Anterior:', config.planAntiguo],
    ['Plan Nuevo:', config.planNuevo],
    ['Fecha:', new Date().toLocaleDateString('es-MX')],
    [],
    ['RESULTADOS'],
    [],
    ['Materias con equivalencia:', cambio.equivalenciasAplicadas.length],
    ['Créditos reconocidos:', cambio.totalCreditosReconocidos],
    ['Materias faltantes:', cambio.materiasFaltantes.length],
    ['Créditos faltantes:', cambio.totalCreditosFaltantes],
    ['Avance en plan nuevo:', `${cambio.porcentajeAvance}%`],
    [],
    ['Materias faltantes en semestres 1-3 (prioridad alta):',
      cambio.materiasFaltantes.filter(m => m.semestre <= 3).length],
    [],
    ['Firma del alumno: ___________________________'],
    [],
    ['Firma y sello del coordinador: ___________________________'],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(resData);
  ws3['!cols'] = [{ wch: 40 }, { wch: 35 }];
  ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  XLSX.utils.book_append_sheet(wb, ws3, 'Resumen');

  // Write to buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buf);
}

export function generateListaGlobalExcel(
  alumnos: Alumno[],
  cambios: CambioMalla[],
  config: Config
): Buffer {
  const wb = XLSX.utils.book_new();

  // Global student list with stats
  const data: (string | number)[][] = [
    [`LISTA GLOBAL DE CAMBIOS DE MALLA - ${config.carrera}`],
    [`Plan: ${config.planAntiguo} → ${config.planNuevo}`],
    [`Generado: ${new Date().toLocaleDateString('es-MX')}`],
    [],
    ['Matrícula', 'Nombre', 'Semestre', 'Estado', 'Créditos Reconocidos', 'Créditos Faltantes', '% Avance', 'Mats. Faltantes S1-S3'],
  ];

  for (const alumno of alumnos) {
    const cambio = cambios.find(c => c.alumnoId === alumno.id);
    if (cambio) {
      data.push([
        alumno.matricula,
        alumno.nombre,
        alumno.semestre,
        'Procesado',
        cambio.totalCreditosReconocidos,
        cambio.totalCreditosFaltantes,
        `${cambio.porcentajeAvance}%`,
        cambio.materiasFaltantes.filter(m => m.semestre <= 3).length,
      ]);
    } else {
      data.push([alumno.matricula, alumno.nombre, alumno.semestre, 'Pendiente', '', '', '', '']);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 10 }, { wch: 12 },
    { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 22 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Lista Global');

  // Sheet 2: demand for early-semester subjects
  const demandaCount: Record<string, { nombre: string; semestre: number; count: number }> = {};
  for (const cambio of cambios) {
    for (const f of cambio.materiasFaltantes) {
      const id = f.materia.id;
      if (!demandaCount[id]) demandaCount[id] = {
        nombre: f.materia.nombre, semestre: f.semestre, count: 0
      };
      demandaCount[id].count++;
    }
  }

  const demandaData: (string | number)[][] = [
    ['DEMANDA DE MATERIAS (Alumnos que requieren cupo)'],
    [],
    ['Semestre', 'Materia', 'Alumnos que la requieren', 'Prioridad'],
    ...Object.values(demandaCount)
      .sort((a, b) => a.semestre - b.semestre || b.count - a.count)
      .map(d => [
        d.semestre,
        d.nombre,
        d.count,
        d.semestre <= 3 ? 'ALTA - Asegurar cupo' : 'Normal',
      ]),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(demandaData);
  ws2['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 25 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Demanda por Materia');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
