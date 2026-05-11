import type { ReactNode } from "react";

export const siteContent = {
  brand: {
    name: "Docentix",
    logo: {
      horizontal: "/images/logo-horizontal.png",
      horizontalDark: "/images/logo-horizontal-dark.png",
      mobile: "/images/logo-movil.png",
      mobileDark: "/images/logo-movil-dark.png",
    },
  },
  nav: {
    login: "Iniciar sesión",
    dashboard: "Ir al panel",
    requestDemo: "Solicitar demo",
    loading: "Cargando",
    sections: [
      { href: "#como-funciona", label: "Cómo funciona" },
      { href: "#caracteristicas", label: "Características" },
      { href: "#planes", label: "Planes" },
      { href: "#faq", label: "Preguntas" },
    ],
  },
  hero: {
    eyebrow: "Para instituciones educativas",
    title: "Tareas docentes claras, con plazos y seguimiento.",
    subtitle:
      "Docentix es la plataforma donde rectores y coordinadores asignan, hacen seguimiento y cierran tareas con sus docentes. Menos WhatsApp, menos correos perdidos, más foco en lo que importa.",
    primaryCta: "Solicitar demo",
    secondaryCta: "Ver cómo funciona",
    image: {
      light: "/images/dashboard.png",
      dark: "/images/dashboard-dark.png",
      alt: "Captura del panel de Docentix mostrando tareas asignadas a docentes con sus plazos de entrega.",
    },
  },
} as const;

export type IconName =
  | "ClipboardText"
  | "CalendarCheck"
  | "ChalkboardTeacher"
  | "Bell"
  | "ChartLine"
  | "Users"
  | "ShieldCheck"
  | "Lightning"
  | "ChatsCircle"
  | "Tag"
  | "Funnel"
  | "Lock"
  | "DeviceMobile";

export const painsContent = {
  eyebrow: "Lo conocido",
  title: "¿Te suena alguno de estos problemas?",
  subtitle:
    "El día a día de coordinar tareas en una institución educativa suele verse así:",
  items: [
    {
      title: "Tareas dispersas entre WhatsApp y correos",
      description:
        "Las asignaciones se pierden entre conversaciones y nadie recuerda qué se pidió ni cuándo.",
    },
    {
      title: "Plazos que se incumplen sin alerta",
      description:
        "Coordinación se entera tarde y todo el cronograma de la institución sufre el retraso.",
    },
    {
      title: "Sin trazabilidad del seguimiento",
      description:
        "No queda registro claro de quién pidió qué, cuándo, ni qué se entregó al final.",
    },
    {
      title: "Reuniones para repasar lo obvio",
      description:
        "Se gasta tiempo presencial revisando estados que deberían estar a la vista de todos.",
    },
    {
      title: "Docentes saturados de canales",
      description:
        "Cada coordinador tiene su propia forma de pedir; el docente no sabe dónde mirar primero.",
    },
    {
      title: "Reportes hechos a mano",
      description:
        "Cierres de período se arman copiando información desde mil lugares distintos.",
    },
  ],
} as const;

export const howItWorksContent = {
  eyebrow: "Cómo funciona",
  title: "Cuatro pasos para dejar el caos atrás",
  subtitle:
    "Un flujo simple, pensado para que el rector mantenga el control sin micromanagement.",
  steps: [
    {
      number: "01",
      title: "Define la tarea",
      description:
        "El rector o coordinador crea la tarea con título, descripción, criterios y fecha límite.",
    },
    {
      number: "02",
      title: "Asigna a los docentes",
      description:
        "Elige a uno o varios docentes. Cada uno recibe la notificación y la tarea aparece en su panel.",
    },
    {
      number: "03",
      title: "Haz seguimiento",
      description:
        "Visualiza el progreso en tiempo real: pendiente, en curso, entregado. Recordatorios automáticos antes del vencimiento.",
    },
    {
      number: "04",
      title: "Cierra y archiva",
      description:
        "El docente entrega, tú revisas y cierras. Todo queda registrado para reportes y auditoría.",
    },
  ],
} as const;

export const featuresContent = {
  eyebrow: "Características",
  title: "Pensado para instituciones educativas reales",
  subtitle:
    "Sin distracciones de productividad genérica: cada función responde a cómo trabajan rectores, coordinadores y docentes.",
  items: [
    {
      icon: "ClipboardText" as IconName,
      title: "Tareas con criterios claros",
      description:
        "Define qué se espera, cómo se entrega y cuándo. Sin ambigüedades.",
    },
    {
      icon: "CalendarCheck" as IconName,
      title: "Plazos visibles",
      description:
        "Cada tarea tiene fecha límite y el sistema avisa antes de que se cumpla.",
    },
    {
      icon: "Users" as IconName,
      title: "Roles y permisos",
      description:
        "Rector, coordinador y docente: cada uno ve lo que necesita y nada más.",
    },
    {
      icon: "Bell" as IconName,
      title: "Notificaciones inteligentes",
      description:
        "Avisos al asignar, al acercarse el vencimiento y al cerrar la tarea.",
    },
    {
      icon: "ChartLine" as IconName,
      title: "Reportes y métricas",
      description:
        "Cumplimiento por docente, por área, por período. Para tomar decisiones con datos.",
    },
    {
      icon: "ChatsCircle" as IconName,
      title: "Comentarios en contexto",
      description:
        "Dudas y aclaraciones quedan dentro de la tarea, no perdidas en un chat aparte.",
    },
    {
      icon: "Tag" as IconName,
      title: "Categorías y etiquetas",
      description:
        "Organiza por área, ciclo, grado o como lo necesite tu institución.",
    },
    {
      icon: "Funnel" as IconName,
      title: "Filtros y vistas",
      description:
        "Encuentra rápido lo que importa: pendientes, vencidas, por docente, por mes.",
    },
    {
      icon: "DeviceMobile" as IconName,
      title: "Adaptado a móvil",
      description:
        "Los docentes acceden desde su teléfono sin necesidad de instalar nada.",
    },
  ],
} as const;

export const audiencesContent = {
  eyebrow: "Para quién es",
  title: "Una herramienta para todo el equipo",
  subtitle:
    "Cada rol ve lo que le suma. Sin ruido, sin pantallas que no le sirven.",
  roles: [
    {
      role: "Rector",
      tagline: "Visión completa de la institución",
      bullets: [
        "Panorama del cumplimiento por área y por docente.",
        "Reportes listos para reuniones de gestión.",
        "Sin necesidad de bajar al detalle si no quiere.",
      ],
    },
    {
      role: "Coordinador",
      tagline: "Asignación y seguimiento al detalle",
      bullets: [
        "Crea tareas con criterios y plazos.",
        "Sigue el avance de su equipo en tiempo real.",
        "Aclara dudas dentro de cada tarea.",
      ],
    },
    {
      role: "Docente",
      tagline: "Claridad sobre qué hacer y cuándo",
      bullets: [
        "Todas sus tareas en un solo lugar.",
        "Avisos antes del vencimiento.",
        "Entrega y cierre en pocos clicks.",
      ],
    },
  ],
} as const;

export const benefitsContent = {
  eyebrow: "Beneficios",
  title: "Lo que cambia desde la primera semana",
  items: [
    {
      title: "Menos reuniones para tareas operativas",
      description:
        "El estado está a la vista, no hace falta convocar una reunión para saber cómo va cada cosa.",
    },
    {
      title: "Mejor cumplimiento de plazos",
      description:
        "Los recordatorios automáticos suben la entrega a tiempo de manera notable.",
    },
    {
      title: "Trazabilidad real",
      description:
        "Cualquier consulta o reclamo tiene historia clara: qué se pidió, cuándo, qué se entregó.",
    },
    {
      title: "Docentes con menos ruido",
      description:
        "Un solo lugar para todas las tareas, sin saltar entre canales y formatos.",
    },
    {
      title: "Decisiones con datos",
      description:
        "Reportes claros para los cierres de período y las reuniones de gestión.",
    },
    {
      title: "Implementación rápida",
      description:
        "El equipo lo entiende en una sesión. Adopción sin curva pronunciada.",
    },
  ],
} as const;

export const integrationsContent = {
  eyebrow: "Integraciones",
  title: "Conecta con lo que tu institución ya usa",
  subtitle:
    "Docentix se integra con las herramientas más comunes en el ámbito educativo, para que nadie tenga que cambiar de hábitos.",
  items: [
    {
      name: "Google Workspace",
      description:
        "Inicio de sesión institucional, correo y calendario en una sola identidad.",
    },
    {
      name: "Microsoft 365",
      description:
        "Compatibilidad con cuentas institucionales y agendas de Outlook.",
    },
    {
      name: "Correo institucional",
      description:
        "Avisos y resúmenes enviados al correo oficial de cada miembro.",
    },
    {
      name: "Calendarios externos",
      description:
        "Sincronización de plazos con Google Calendar y Outlook Calendar.",
    },
  ],
} as const;

export const securityContent = {
  eyebrow: "Seguridad y privacidad",
  title: "Datos institucionales tratados con responsabilidad",
  subtitle:
    "Sabemos que la información de una institución educativa es sensible. Por eso, seguridad y privacidad son base, no extras.",
  bullets: [
    {
      icon: "Lock" as IconName,
      title: "Cifrado en tránsito",
      description:
        "Toda la comunicación entre tu navegador y nuestros servidores está cifrada con TLS.",
    },
    {
      icon: "ShieldCheck" as IconName,
      title: "Control de acceso por rol",
      description:
        "Cada usuario ve únicamente lo que su rol permite. Sin filtraciones internas.",
    },
    {
      icon: "Users" as IconName,
      title: "Cuentas por invitación",
      description:
        "Nadie se registra solo: el rector invita coordinadores y docentes. Sin accesos sorpresa.",
    },
    {
      icon: "Lightning" as IconName,
      title: "Auditoría y trazabilidad",
      description:
        "Cada acción queda registrada con su autor y fecha, para revisión cuando sea necesario.",
    },
  ],
} as const;

export const socialProofContent = {
  eyebrow: "Prueba social",
  title: "Lo que dicen quienes ya lo usan",
  subtitle:
    "Testimonios ilustrativos para esta versión inicial. Pronto reemplazaremos por casos reales de instituciones que confían en Docentix.",
  testimonials: [
    {
      name: "María Restrepo",
      role: "Rectora",
      institution: "Colegio San Ignacio",
      quote:
        "Pasamos de no saber qué tarea estaba pendiente a tener todo a la vista. Las reuniones operativas bajaron a la mitad.",
    },
    {
      name: "Andrés Cárdenas",
      role: "Coordinador Académico",
      institution: "Instituto Bilingüe del Norte",
      quote:
        "Por fin un lugar donde el equipo entiende qué se le pide y para cuándo. Los docentes lo agradecen.",
    },
    {
      name: "Lucía Mendoza",
      role: "Docente",
      institution: "Escuela Normal Superior",
      quote:
        "Tengo todas mis tareas en un solo sitio, con recordatorios. Es como tener una agenda institucional clara.",
    },
  ],
} as const;

export const pricingContent = {
  eyebrow: "Planes",
  title: "Planes pensados para distintos tamaños",
  subtitle:
    "Estructura preliminar. Los valores definitivos se acuerdan en la conversación de demo según el tamaño y necesidades de tu institución.",
  plans: [
    {
      name: "Básico",
      price: "A medida",
      description:
        "Para instituciones pequeñas que están empezando a ordenar la asignación de tareas.",
      features: [
        "Hasta 25 docentes",
        "Rector + 2 coordinadores",
        "Tareas, plazos y notificaciones",
        "Reportes básicos",
      ],
      cta: "Solicitar demo",
      highlighted: false,
    },
    {
      name: "Institucional",
      price: "A medida",
      description:
        "Para colegios y centros con varias áreas y necesidad de reportes detallados.",
      features: [
        "Hasta 100 docentes",
        "Coordinadores ilimitados",
        "Reportes avanzados y exportables",
        "Integración con Google Workspace o Microsoft 365",
        "Soporte prioritario",
      ],
      cta: "Solicitar demo",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "A medida",
      description:
        "Para redes educativas y instituciones grandes con requisitos específicos.",
      features: [
        "Docentes ilimitados",
        "Múltiples sedes y áreas",
        "Roles personalizados",
        "Onboarding asistido",
        "SLA y soporte dedicado",
      ],
      cta: "Solicitar demo",
      highlighted: false,
    },
  ],
} as const;

export const faqContent = {
  eyebrow: "Preguntas frecuentes",
  title: "Lo que suelen preguntarnos",
  items: [
    {
      question: "¿Cómo se crean las cuentas de los docentes?",
      answer:
        "Las cuentas son por invitación. El rector crea la cuenta de la institución y desde ahí invita a coordinadores y docentes. No hay registro público abierto: eso protege a la comunidad educativa.",
    },
    {
      question: "¿Necesitamos instalar algo en los computadores de la institución?",
      answer:
        "No. Docentix funciona en el navegador, tanto en computador como en celular. Los docentes acceden con su correo institucional.",
    },
    {
      question: "¿Qué pasa con los datos si dejamos de usar la plataforma?",
      answer:
        "Podés exportar las tareas y reportes históricos antes de cancelar el servicio. Después, los datos se eliminan según lo acordado en el contrato institucional.",
    },
    {
      question: "¿El sistema reemplaza al correo o a WhatsApp?",
      answer:
        "No reemplaza, ordena. Las tareas formales viven en Docentix; el correo y el chat siguen siendo útiles para conversaciones espontáneas.",
    },
    {
      question: "¿Cuánto demora implementarlo?",
      answer:
        "Una institución típica está operando en menos de una semana. Acompañamos la migración inicial y entrenamos al equipo en una sola sesión.",
    },
    {
      question: "¿Tiene un período de prueba?",
      answer:
        "Trabajamos con pilotos guiados: hacemos una demo con tu equipo, definimos un alcance de prueba y vemos resultados antes de cualquier compromiso anual.",
    },
    {
      question: "¿Funciona en celular?",
      answer:
        "Sí. La interfaz está pensada mobile-first. Los docentes pueden ver, comentar y entregar tareas desde el celular sin instalar nada.",
    },
  ],
} as const;

export const finalCtaContent = {
  title: "¿Listo para ordenar la asignación de tareas en tu institución?",
  subtitle:
    "Agendamos una demo de 30 minutos, con tu equipo, mostrando casos reales aplicables a tu colegio o instituto.",
  cta: "Solicitar demo",
} as const;

export const footerContent = {
  description:
    "Docentix es una plataforma de gestión de tareas pensada exclusivamente para instituciones educativas.",
  columns: [
    {
      title: "Producto",
      links: [
        { label: "Cómo funciona", href: "#como-funciona" },
        { label: "Características", href: "#caracteristicas" },
        { label: "Planes", href: "#planes" },
        { label: "Preguntas frecuentes", href: "#faq" },
      ],
    },
    {
      title: "Empresa",
      links: [
        { label: "Solicitar demo", href: "#contacto" },
        { label: "Contacto", href: "mailto:hola@docentix.com" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Política de privacidad", href: "#privacidad" },
        { label: "Términos de uso", href: "#terminos" },
      ],
    },
  ],
  contactEmail: "hola@docentix.com",
} as const;

export const requestDemoForm = {
  title: "Solicitar una demo",
  description:
    "Cuéntanos sobre tu institución y nos ponemos en contacto para coordinar una sesión de 30 minutos.",
  fields: {
    fullName: { label: "Nombre completo", placeholder: "María Restrepo" },
    institutionalEmail: {
      label: "Correo institucional",
      placeholder: "rectoria@tu-colegio.edu",
    },
    institutionName: {
      label: "Institución",
      placeholder: "Colegio San Ignacio",
    },
    department: {
      label: "Departamento",
      placeholder: "Selecciona un departamento",
      options: [
        { value: "amazonas", label: "Amazonas" },
        { value: "antioquia", label: "Antioquia" },
        { value: "arauca", label: "Arauca" },
        { value: "atlantico", label: "Atlántico" },
        { value: "bogota", label: "Bogotá D.C." },
        { value: "bolivar", label: "Bolívar" },
        { value: "boyaca", label: "Boyacá" },
        { value: "caldas", label: "Caldas" },
        { value: "caqueta", label: "Caquetá" },
        { value: "casanare", label: "Casanare" },
        { value: "cauca", label: "Cauca" },
        { value: "cesar", label: "Cesar" },
        { value: "choco", label: "Chocó" },
        { value: "cordoba", label: "Córdoba" },
        { value: "cundinamarca", label: "Cundinamarca" },
        { value: "guainia", label: "Guainía" },
        { value: "guaviare", label: "Guaviare" },
        { value: "huila", label: "Huila" },
        { value: "la-guajira", label: "La Guajira" },
        { value: "magdalena", label: "Magdalena" },
        { value: "meta", label: "Meta" },
        { value: "narino", label: "Nariño" },
        { value: "norte-de-santander", label: "Norte de Santander" },
        { value: "putumayo", label: "Putumayo" },
        { value: "quindio", label: "Quindío" },
        { value: "risaralda", label: "Risaralda" },
        { value: "san-andres", label: "San Andrés y Providencia" },
        { value: "santander", label: "Santander" },
        { value: "sucre", label: "Sucre" },
        { value: "tolima", label: "Tolima" },
        { value: "valle-del-cauca", label: "Valle del Cauca" },
        { value: "vaupes", label: "Vaupés" },
        { value: "vichada", label: "Vichada" },
      ],
    },
    municipality: {
      label: "Municipio",
      placeholder: "Ej: Medellín",
    },
    role: {
      label: "Rol",
      placeholder: "Selecciona tu rol",
      options: [
        { value: "rector", label: "Rector / Rectora" },
        { value: "coordinator", label: "Coordinador / Coordinadora" },
        { value: "other", label: "Otro" },
      ],
    },
    teacherCount: {
      label: "Cantidad aproximada de docentes",
      placeholder: "Ej: 35",
    },
    message: {
      label: "Comentario (opcional)",
      placeholder: "Cuéntanos brevemente qué necesitas resolver.",
    },
  },
  submit: "Enviar solicitud",
  submitting: "Enviando…",
  success:
    "Recibimos tu solicitud. Te contactaremos al correo institucional en las próximas 48 horas.",
  errorGeneric:
    "No pudimos enviar tu solicitud. Por favor intentá de nuevo en unos minutos.",
} as const;

export type SiteContent = typeof siteContent;
export type RenderableNode = ReactNode;
