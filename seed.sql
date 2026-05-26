insert into materias_antiguas (clave, nombre, creditos, semestre) values
('MAT-101', 'Álgebra Lineal I', 6, 1),
('FIS-101', 'Física I', 6, 1),
('QUI-101', 'Química General', 5, 1),
('PRO-101', 'Programación I', 7, 1),
('MAT-201', 'Cálculo Integral', 6, 2),
('FIS-201', 'Física II', 6, 2),
('PRO-201', 'Estructuras de Datos', 7, 2),
('BD-201', 'Bases de Datos I', 6, 3),
('RED-301', 'Redes I', 5, 3),
('IA-401', 'Introducción a la IA', 5, 4);

insert into materias_nuevas (clave, nombre, creditos, semestre) values
('MAT-N101', 'Fundamentos de Álgebra', 6, 1),
('FIS-N101', 'Física Aplicada I', 6, 1),
('QUI-N101', 'Ciencias Químicas', 5, 1),
('PRO-N101', 'Lógica y Programación', 7, 1),
('MAT-N201', 'Cálculo Avanzado', 6, 2),
('FIS-N201', 'Mecánica y Ondas', 6, 2),
('PRO-N201', 'Algoritmos y Estructuras', 7, 2),
('BD-N201', 'Sistemas de Bases de Datos', 6, 3),
('RED-N301', 'Arquitectura de Redes', 5, 3),
('DAT-N401', 'Ciencia de Datos I', 5, 4);

insert into equivalencias (materia_antigua_id, materia_nueva_id)
select a.id, n.id
from (values
('MAT-101', 'MAT-N101'),
('FIS-101', 'FIS-N101'),
('QUI-101', 'QUI-N101'),
('PRO-101', 'PRO-N101'),
('MAT-201', 'MAT-N201'),
('FIS-201', 'FIS-N201'),
('PRO-201', 'PRO-N201'),
('BD-201', 'BD-N201')
) as eq(old_key, new_key)
join materias_antiguas a on a.clave = eq.old_key
join materias_nuevas n on n.clave = eq.new_key;
