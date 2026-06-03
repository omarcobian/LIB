# Sistema de Cambio de Malla Curricular

Sistema **100% local** para administrar el cambio de plan de estudios. Sin base de datos externa, sin internet. Solo Node.js.

## Inicio rápido

```bash
npm install
npm run dev
# Abrir http://localhost:3000
```

---

## Flujo de trabajo

### 1. Configuración (una sola vez)
Ve a **Configuración** y define:
- Nombre de la carrera y los dos planes (antiguo y nuevo)
- Materias del plan antiguo y nuevo (manual o importando un CSV)
- Equivalencias: qué materia del plan antiguo equivale a cuál del nuevo

**Formato CSV para importar materias:**
```
clave,nombre,semestre,creditos,obligatoria
ISC-101,Cálculo Diferencial,1,10,si
ISC-102,Álgebra Lineal,1,8,si
```

### 2. Agregar alumnos
**Alumnos → Agregar Alumno**: matrícula, nombre, carrera, semestre.

### 3. Subir kardex
En el perfil de cada alumno, sube su kardex en Excel (.xlsx) o CSV.

El parser detecta automáticamente columnas de nombre, calificación, créditos, clave y periodo. Compatible con los formatos comunes de sistemas escolares mexicanos.

El sistema calcula automáticamente:
- Materias reconocidas (del kardex que tienen equivalencia en el nuevo plan)
- Materias faltantes, ordenadas por semestre
- Las de semestres 1-3 se marcan como "ASEGURAR CUPO"

### 4. Descargar formato (machote)
**Botón "Descargar Formato"** → genera Excel con 3 hojas:
- **Equivalencias:** tabla plan antiguo → plan nuevo con calificaciones y créditos reconocidos
- **Materias Faltantes:** lista por semestre con indicador de prioridad
- **Resumen:** hoja de firmas para coordinador

### 5. Lista global
Desde el **Dashboard → "Exportar Lista Global"**:
- Todos los alumnos con su avance en créditos
- Hoja de demanda: cuántos alumnos necesitan cada materia (para reservar cupos)

---

## Respaldo de datos

Los datos se guardan en `/data/`. Para respaldar, copia esa carpeta. Para restaurar, pégala antes de iniciar.

---

## Solución de problemas

**Kardex no se parsea:** Asegúrate de que tenga fila de encabezados con al menos nombre de materia y calificación.

**No se reconocen equivalencias:** Verifica que estén configuradas. El match es por clave exacta o similitud de nombre (≥75%). Usa "Recalcular" tras cambiar configuración.
