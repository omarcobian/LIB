# Sistema de Equivalencias de Plan de Estudios

Aplicación web con Next.js 14 + Supabase para que estudiantes soliciten equivalencias y coordinación las gestione.

## Requisitos

- Node.js 18+
- Proyecto de Supabase creado

## Configuración local

1. Copia variables de entorno:

```bash
cp .env.example .env.local
```

2. Llena en `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Instala dependencias y ejecuta:

```bash
npm install
npm run dev
```

## 1) Crear proyecto en Supabase

1. Ir a https://supabase.com y crear proyecto.
2. Copiar URL y ANON KEY desde **Project Settings > API**.
3. Pegar esos valores en `.env.local`.

## 2) Correr scripts SQL

En **Supabase SQL Editor**:

1. Ejecutar `schema.sql` para crear tablas.
2. Ejecutar `seed.sql` para cargar materias y equivalencias de prueba.

## 3) Crear usuario coordinador (Supabase Auth)

1. Ir a **Authentication > Users**.
2. Crear usuario con email/contraseña (manual).
3. Usar esas credenciales en `/coordinador/login`.

## 4) Deploy en Vercel

1. Subir repositorio a GitHub.
2. Importar proyecto en Vercel.
3. Configurar variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

## Rutas

- `/` Vista pública de alumno
- `/coordinador/login` Login coordinador
- `/coordinador/dashboard` Panel de solicitudes
- `/coordinador/solicitud/[id]` Detalle editable e impresión
- `/coordinador/materias` Gestión de materias/equivalencias
