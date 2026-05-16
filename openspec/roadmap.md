# Roadmap

1. **Revision de control por layout.** Actualmente super no puede usar admin ni member. Se requiere que pueda participar de tareas.

- Corregir errro de redireccion infinita cuando el usuario tiene una institucion como admin y otra como miembro. El problema puede resolverse, creo de dos formas. 
- Unificando el layout incluso el de super y mas bien condicionando visibilidad de componentes o 
- Mendiante aplicación del filtro de la organizacion activa, pues creo que no está tomando en cuenta el rol según la organización.

Más...
- Actualizar landing page con base en especificaciones
- Documentacion con fumadocs y playwrigth


# Version 2

1. **Tareas invidivuales.** Es decir que una misma tarea se pueda asignar a varias personas para entrega (responsable individual)

2. **Mis propias tareas.** Los members podrian crear tareas e invitar participantes, pero por defecto el responsable en este caso es el mismo autor y no se puede quitar. Es decir que la invitación aquí es como compartir el acceso, pero no define responsabilidad.

3. **Estadísticas de Super.** Usuarios, Tareas, Accesos, Almacenamiento, etc.

4. **Cambio de estado de instituciones.** Permitir la activación e inactivación de inhabilitación de acceso de usuarios

5. **Inpersonación auditada de usuarios.** Poder acceder en nombre de un usuario para simular su experiencia y dar soporte.

6. **Modulo de Notificaciones.** Cuando se asignan las tareas y cuando se cambia de estado, se debe notificar a las partes interesadas. Las notificaciones deberian verse en la aplidacion (solo listado), en email del usuario (analizar consumo de email y condicionar según plan de pago), en whatsapp mediante cuenta oficial del cliente con activación en plan y sin cobro por mensaje (uso de la api del cliente), se cobra configuración.
