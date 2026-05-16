/opsx:explore 

1. Actualmente si un usuario es rol admin y es invitado a una organizacion como miembro, se presenta un redirect infinito al momento de autenticarse. 

2. Si un usuario super es invitado a una organizacion, no puede acceder, pues siempre es redirigido a super. 

3. Se requiere que haya un solo layout principal unificado para todos los roles. Que solo varie en las opcionmes de menús que se muestran a cada rol y solo si es necesario que super tenga un layout anidado en la ruta /super pero siempre podrá tener acceso como usuario a las organizaciones en las que sea usuario admin o miembro.