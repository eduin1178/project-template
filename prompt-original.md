/opsx:explore 

1. Cualquier usario admin de una organización puede crear tareas. Las tareas tienen los siguientes atributos.
- Titulo
- Descripción
- Plazo. Fecha y hora líminte para que la tarea esté en estado Terminada. A partir de esta fecha aunque no esté terminada, tanto para el responsable, como para equipo de apoyo se pierde la posibilidad de modificar, adjuntar documentos, etc. Solo queda disponible la opción de agregar comentarios
- Visibilidad => borrador, activa, archivada
- Estado => pendiente, en proceso, terminada
- Documentos (pdf, word, exel, zip, pptx, etc.)
- Responsable. Un usuario de la misma organizacion directamente responsable de la tarea.
- Usuarios asignados. Uno o varios usuarios que podrán ver la tarea y participar en su desarrollo.
- Comentarios. Comentarios que todos pueden hacer acerca de la tarea, son visibles para todo el equipo, incluidos el autor y el responsable.
- Checklist. Una lista simple de chequeo que puede ser creada o modificada por el autor o por cada uno de los usuarios asignados.
2. La tarea se crea por defecto en estado pendiente y visibilidad borrador.
3. El autor de la tarea puede:
- Asignar/cambiar el usuario responsable
- Asignar/quitar usuarios del equipo de apoyo (otros usuarios d ela misma organizacion)
- Modifciar el plazo de la tarea
- Modificar la visibilidad de la tarea.
- Modificar el estado de la tarea. 
- Adjuntar douementos
- Eliminar documentos (todos incluidos los que el no adjuntó)

4. Transiciones de visibilidad válidas
- borrador => activa = valida
- borrador => archivada = no valida
- activa => archivada = valida
- activa => borrador = valida
- archivada => activa = valida
- archivada => borrador = no valida

5. Filtro de tareas segun visibilidad
- borrador => solo visible para el autor
- activa => visible para el autor, el responsable y los asignados
- archivada => visible solo para el autor.

7. Transiciones válidas del Estados de la tarea
Todas las transiciones son válidas excepto de pendiente => terminada

8. El equipo de apoyo puede incluido el usuario responsable
- Ver la tarea.
- Descargar los documentos
- Agregar comentarios
- Adjuntar documentos
- Eliminar documetnos, solo si este fue cargado por el mismo usuario.
- Eliminar sus propios comentarios, siempre que estos no tengan una duración superior a una hora. Además los comentarios realmetne no se eliminan sino que se marca como eliminado y en la ui se renderiza el texto: "Comentario eliminado por el autor."

9. El responsable puede:
- Cambiar el estado de la tarea. Siempre y cuando no se haya cumplido el plazo. El cambio de estado se debe hacer siempre acompañado de un comentario.
- Realizar todas las acciones que le son permitidas al equipo de apoyo.