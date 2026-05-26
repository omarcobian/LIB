create table materias_antiguas (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  nombre text not null,
  creditos int not null,
  semestre int
);

create table materias_nuevas (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  nombre text not null,
  creditos int not null,
  semestre int
);

create table equivalencias (
  id uuid primary key default gen_random_uuid(),
  materia_antigua_id uuid references materias_antiguas(id),
  materia_nueva_id uuid references materias_nuevas(id),
  unique(materia_antigua_id)
);

create table solicitudes (
  id uuid primary key default gen_random_uuid(),
  nombre_alumno text not null,
  codigo_alumno text not null,
  fecha timestamptz default now(),
  estado text default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  observaciones text
);

create table solicitud_materias (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid references solicitudes(id) on delete cascade,
  materia_antigua_id uuid references materias_antiguas(id),
  materia_nueva_id uuid references materias_nuevas(id)
);
