/opsx:explore 

## Cambiar Organización por Institucion
- Dado que esta app es para instituciones educativas se debe reemplazar la palabra 'Organización' por 'Institución' en toda la UI. Se puede conservar en la documentacón ténica pero no en la documentación de usuario final. Esta regla debe quedar en AGENTS.md 

## Tarea automática al aceptar la invitación
Se debe crear una tarea de forma automática para todo usuario invitado que acepte la invitación. Tanto si es una invitación se super como si es de admin con las siguientes especificaciones.
1. La tarea se crea solo si el usuario acepta la invitación
2. El responsable es el mismo invitado de tal forma que pueda cambiar el estado.
3. La tarea se crea en estdo activa. 
4. El titulo de la tarea es 'Aprender a usar Docentix'
5. La descripción es un listado de las funciones principales de Docentix, titulo y descripción breve. 
6. Debe incluir un Checklist con las distintas funciones para que el usuario marque lo que va aprendiendo.
