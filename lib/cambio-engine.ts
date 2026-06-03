import {
  Config,
  KardexAlumno,
  CambioMalla,
  EquivalenciaAplicada,
  MateriaFaltante,
} from './types';
import { normalizeName, similarity } from './kardex-parser';

export function computeCambioMalla(
  alumnoId: string,
  kardex: KardexAlumno,
  config: Config
): CambioMalla {
  const equivalenciasAplicadas: EquivalenciaAplicada[] = [];
  const materiasNuevasYaCubiertas = new Set<string>();

  // Process each equivalencia defined in config
  for (const eq of config.equivalencias) {
    const materiaAntigua = config.materiasAntiguas.find(m => m.id === eq.materiaAntiguaId);
    const materiaNueva = config.materiasNuevas.find(m => m.id === eq.materiaNuevaId);
    if (!materiaAntigua || !materiaNueva) continue;

    // Find this subject in student's kardex (by clave or name similarity)
    const kardexEntry = kardex.materias.find(km => {
      if (!km.aprobada) return false;
      // Match by clave first
      if (km.clave && materiaAntigua.clave &&
          km.clave.toUpperCase() === materiaAntigua.clave.toUpperCase()) return true;
      // Then by name similarity
      return similarity(km.nombre, materiaAntigua.nombre) >= 0.75;
    });

    if (kardexEntry) {
      equivalenciasAplicadas.push({
        materiaAntigua: kardexEntry,
        materiaNueva,
        creditosReconocidos: materiaNueva.creditos,
        calificacion: kardexEntry.calificacion,
      });
      materiasNuevasYaCubiertas.add(materiaNueva.id);
    }
  }

  // Build list of pending subjects (new plan subjects not yet covered)
  const materiasFaltantes: MateriaFaltante[] = config.materiasNuevas
    .filter(mn => !materiasNuevasYaCubiertas.has(mn.id))
    .map(mn => ({
      materia: mn,
      semestre: mn.semestre,
      prioridad: mn.semestre, // Lower semestre = higher priority
    }))
    .sort((a, b) => a.prioridad - b.prioridad);

  const totalCreditosReconocidos = equivalenciasAplicadas.reduce(
    (s, e) => s + e.creditosReconocidos, 0
  );

  const totalCreditosFaltantes = materiasFaltantes.reduce(
    (s, m) => s + m.materia.creditos, 0
  );

  const totalCreditos = config.totalCreditosPlanNuevo ||
    config.materiasNuevas.reduce((s, m) => s + m.creditos, 0);

  const porcentajeAvance = totalCreditos > 0
    ? Math.round((totalCreditosReconocidos / totalCreditos) * 100)
    : 0;

  return {
    alumnoId,
    fechaGenerado: new Date().toISOString(),
    equivalenciasAplicadas,
    materiasFaltantes,
    totalCreditosReconocidos,
    totalCreditosFaltantes,
    porcentajeAvance,
  };
}

/**
 * Returns global stats across all students for dashboard.
 */
export function computeStatsGlobales(cambios: CambioMalla[], totalAlumnos: number) {
  if (cambios.length === 0) return {
    totalAlumnos,
    procesados: 0,
    pendientes: totalAlumnos,
    promedioCredReconocidos: 0,
    materiasMasSolicitadas: [],
  };

  const promedioCredReconocidos = Math.round(
    cambios.reduce((s, c) => s + c.totalCreditosReconocidos, 0) / cambios.length
  );

  // Count how many students need each pending subject
  const materiaCount: Record<string, { nombre: string; count: number }> = {};
  for (const cambio of cambios) {
    for (const faltante of cambio.materiasFaltantes) {
      const id = faltante.materia.id;
      if (!materiaCount[id]) materiaCount[id] = { nombre: faltante.materia.nombre, count: 0 };
      materiaCount[id].count++;
    }
  }

  const materiasMasSolicitadas = Object.values(materiaCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalAlumnos,
    procesados: cambios.length,
    pendientes: totalAlumnos - cambios.length,
    promedioCredReconocidos,
    materiasMasSolicitadas,
  };
}
