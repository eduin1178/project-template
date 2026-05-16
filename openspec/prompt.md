/opsx:explore 

- Tanto los usuarios admin/owner como los usuarios miembros deben tener un dashboard que muestre lo siguiente: 
  - Tareas totales por estado. 
  - Total de tareas vencidas sin terminar en la organizacion para admin y del usuario para miembros
  - Top 5 de tareas pendientes mas recientes ordenadas por fecha de creacion de forma descendente, es decir las mas recientes primero. Debe navegar a la tarea.
  - Top 5 de tareas en curso ordenadas por fecha de última actualizacion, es decir las mas recientes primero. Debe navegar a la tarea
  - Cantidad de usuario de la organizacion (solo administradores)
  - Uso total de almacenamiento de la organizacion. Almacenamiento de documentos (administradores toda la organizacion, miembros solo documetnos cargados por si mismo)
  - Estoy abierto a que me propongas cualquier otra estadística relevante.


- En el caso de los usuarios miembros, los datos solo deben corresponder a las tareas en las que ha sido asignado como participante. Por lo que no aplica mostrarle la cantidad de usuarios de la organización.

- Debes usar compoentes de shadcn-ui, si no está disponible el mcp debes pedirlo.