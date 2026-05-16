## MODIFIED Requirements

### Requirement: Header del panel `/super` identifica como Plataforma

El layout `app/super/(protected)/layout.tsx` SHALL renderizar en el header del sidebar un identificador textual que comunique explícitamente que es el panel de plataforma, no un dashboard de workspace. El copy SHALL ser `"Plataforma Docentix"` o `"Panel de plataforma"` (cualquiera de los dos), en español neutral, sin voseo.

#### Scenario: Header identifica plataforma
- **WHEN** un super navega a `/super`
- **THEN** el header del shell muestra "Plataforma Docentix" o "Panel de plataforma", NO "Panel super"

### Requirement: Sidebar del panel `/super` permite volver al workspace

El sidebar configurado en `components/layout/contexts/super.ts` SHALL incluir un ítem de navegación con etiqueta `"Volver a mi institución"` y `href = "/post-login"`. El destino `/post-login` SHALL resolver al dashboard correcto vía `redirectToDashboard()` basado en la org activa del super.

#### Scenario: Clic en "Volver a mi institución" lleva al workspace
- **WHEN** un super con `activeOrganizationId === <orgPlataforma.id>` hace clic en "Volver a mi institución"
- **THEN** la navegación termina en `/admin` (porque su rol en la org plataforma es owner)

#### Scenario: Volver a workspace cuando la org activa es un tenant
- **WHEN** un super que tiene `activeOrganizationId === <orgTenantX.id>` (member) hace clic en "Volver a mi institución" desde `/super`
- **THEN** la navegación termina en `/app` (rol-en-org-activa = member)
