export const MATERIA_TYPES = {
  PJL: { label: 'Projeto de Lei', color: 'blue' },
  IND: { label: 'Indicação', color: 'green' },
  MONC: { label: 'Moção', color: 'purple' },
  RQ: { label: 'Requerimento', color: 'yellow' },
  DCTL: { label: 'Projeto de Decreto Legislativo', color: 'red' },
  RES: { label: 'Projeto de Resolução', color: 'indigo' },
  LC: { label: 'Projeto de Lei Complementar', color: 'pink' },
  LO: { label: 'Proposta de Emenda à Lei Orgânica', color: 'orange' },
} as const

export type MateriaType = keyof typeof MATERIA_TYPES

export const API_ENDPOINTS = {
  AUTH: {
    SSO: '/api/auth/sso',
    CALLBACK: '/api/auth/callback',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  MATERIAS: {
    LIST: '/api/materias',
    CREATE: '/api/materias',
    GET: (id: string) => `/api/materias/${id}`,
    UPDATE: (id: string) => `/api/materias/${id}`,
    DELETE: (id: string) => `/api/materias/${id}`,
  },
  SEARCH: {
    SEMANTIC: '/api/semantic-search',
  },
  CHAT: {
    SEND: '/api/chat/send',
    HISTORY: '/api/chat/history',
    CONVERSATIONS: '/api/chat/conversations',
  },
  DOCUMENTS: {
    LIST: '/api/documents',
    UPLOAD: '/api/documents/upload',
    DOWNLOAD: (id: string) => `/api/documents/${id}/download`,
  },
} as const

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  requiredGroup?: string;
  children?: { id: string; label: string; icon: string; href: string }[];
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    href: '/',
    requiredGroup: 'materia_chatbot_user',
  },
  {
    id: 'painel',
    label: 'Painel Legislativo',
    icon: 'BarChart3',
    href: '/painel',
    requiredGroup: 'materia_chatbot_user',
  },
  {
    id: 'chatbot',
    label: 'Chatbot IA',
    icon: 'MessageCircle',
    href: '/chatbot',
    badge: 0,
    requiredGroup: 'materia_chatbot_user',
  },
  {
    id: 'materias',
    label: 'Matérias Legislativas',
    icon: 'FileText',
    href: '/materias',
    requiredGroup: 'materia_chatbot_user',
    children: [
      { id: 'criar', label: 'Criar Matéria', icon: 'Plus', href: '/materias/criar' },
      { id: 'listar', label: 'Minhas Matérias', icon: 'List', href: '/materias' },
    ],
  },
  {
    id: 'discursos',
    label: 'Gerador de Discursos',
    icon: 'Mic2',
    href: '/discursos',
    requiredGroup: 'materia_chatbot_user',
  },
  {
    id: 'biblioteca',
    label: 'Biblioteca Jurídica',
    icon: 'BookOpen',
    href: '/biblioteca',
    requiredGroup: 'materia_chatbot_user',
  },
  {
    id: 'documentos',
    label: 'Meus Documentos',
    icon: 'Folder',
    href: '/documentos',
    requiredGroup: 'materia_chatbot_user',
  },
  {
    id: 'obras',
    label: 'Fiscalização de Obras',
    icon: 'HardHat',
    href: '/obras',
    requiredGroup: 'materia_chatbot_user',
  },
  {
    id: 'agenda',
    label: 'Agenda & Prazos',
    icon: 'Calendar',
    href: '/agenda',
    requiredGroup: 'materia_chatbot_user',
  },
  {
    id: 'tramitacao',
    label: 'Tramitação',
    icon: 'Clock',
    href: '/tramitacao',
    requiredGroup: 'materia_chatbot_user',
  },
  {
    id: 'atas',
    label: 'Atas de Sessão',
    icon: 'ClipboardList',
    href: '/atas',
  },
  {
    id: 'transcricao',
    label: 'Transcrição de Sessões',
    icon: 'Mic',
    href: '/transcricao',
  },
]

export const QUICK_ACTIONS = [
  {
    title: 'Nova Matéria Legislativa',
    description: 'Criar um novo documento legislativo com IA',
    icon: 'FileText',
    href: '/materias/criar',
    color: 'blue',
  },
  {
    title: 'Conversar com IA',
    description: 'Tire dúvidas sobre processos legislativos',
    icon: 'MessageCircle',
    href: '/chatbot',
    color: 'cyan',
  },
  {
    title: 'Biblioteca de Templates',
    description: 'Buscar documentos similares',
    icon: 'BookOpen',
    href: '/biblioteca',
    color: 'green',
  },
  {
    title: 'Meus Documentos',
    description: 'Acessar documentos salvos',
    icon: 'Folder',
    href: '/documentos',
    color: 'purple',
  },
] as const
