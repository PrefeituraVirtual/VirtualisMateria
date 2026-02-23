import { z } from 'zod'
import { MATERIA_TYPES } from '@/lib/constants'

// Validation constants
export const MAX_MESSAGE_LENGTH = 10000
export const MAX_TEMA_LENGTH = 500
export const MAX_EMENTA_LENGTH = 1000
export const MAX_ASSUNTO_LENGTH = 5000
export const MAX_TEXTO_ORIGINAL_LENGTH = 50000
export const MAX_AGENDA_TITLE_LENGTH = 200
export const MAX_AGENDA_LOCATION_LENGTH = 200
export const MAX_AGENDA_DESCRIPTION_LENGTH = 1000
export const MAX_OBRA_TITLE_LENGTH = 200
export const MAX_OBRA_DESCRIPTION_LENGTH = 2000
export const MAX_OBRA_LOCATION_LENGTH = 300
export const MIN_PASSWORD_LENGTH = 6
export const VALID_MATERIA_TYPES = Object.keys(MATERIA_TYPES)

const materiaTypeKeys = Array.from(
  new Set([...Object.keys(MATERIA_TYPES), 'PL', 'REQ'])
) as [string, ...string[]]

/**
 * Extract error messages from Zod error
 */
export function getZodErrors(zodError: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  // Zod v4 uses 'issues' property instead of 'errors'
  for (const issue of zodError.issues) {
    const path = issue.path.join('.')
    if (path && !errors[path]) {
      errors[path] = issue.message
    }
  }
  return errors
}

export const materiaCreateSchema = z.object({
  tipo: z.enum(materiaTypeKeys),
  tema: z.string()
    .min(10, 'Tema deve ter pelo menos 10 caracteres.')
    .max(MAX_TEMA_LENGTH, `Tema deve ter no maximo ${MAX_TEMA_LENGTH} caracteres.`)
    .refine((value) => value.trim().length >= 10, 'Tema deve ter pelo menos 10 caracteres.'),
  ementa: z.string().max(MAX_EMENTA_LENGTH, `Ementa deve ter no maximo ${MAX_EMENTA_LENGTH} caracteres.`).optional(),
  assunto: z.string().max(MAX_ASSUNTO_LENGTH, `Assunto deve ter no maximo ${MAX_ASSUNTO_LENGTH} caracteres.`).optional(),
  texto_original: z.string().max(MAX_TEXTO_ORIGINAL_LENGTH, `Texto original deve ter no maximo ${MAX_TEXTO_ORIGINAL_LENGTH} caracteres.`).optional(),
})

// Step 3 schema for materia creation wizard (content step)
export const materiaStep3Schema = z.object({
  ementa: z.string().min(10, 'Ementa deve ter pelo menos 10 caracteres.').max(MAX_EMENTA_LENGTH, `Ementa deve ter no maximo ${MAX_EMENTA_LENGTH} caracteres.`),
  assunto: z.string().max(MAX_ASSUNTO_LENGTH, `Assunto deve ter no maximo ${MAX_ASSUNTO_LENGTH} caracteres.`).optional(),
  texto_original: z.string().max(MAX_TEXTO_ORIGINAL_LENGTH, `Texto original deve ter no maximo ${MAX_TEXTO_ORIGINAL_LENGTH} caracteres.`).optional(),
})

// Final schema for materia creation (requires ementa)
export const materiaCreateFinalSchema = z.object({
  ementa: z.string().min(20, 'Ementa deve ter pelo menos 20 caracteres.').max(MAX_EMENTA_LENGTH, `Ementa deve ter no maximo ${MAX_EMENTA_LENGTH} caracteres.`),
  assunto: z.string().max(MAX_ASSUNTO_LENGTH, `Assunto deve ter no maximo ${MAX_ASSUNTO_LENGTH} caracteres.`).optional(),
  texto_original: z.string().max(MAX_TEXTO_ORIGINAL_LENGTH, `Texto original deve ter no maximo ${MAX_TEXTO_ORIGINAL_LENGTH} caracteres.`).optional(),
})

export const materiaEditSchema = z.object({
  ementa: z.string().min(20, 'Ementa deve ter pelo menos 20 caracteres.').max(MAX_EMENTA_LENGTH, `Ementa deve ter no maximo ${MAX_EMENTA_LENGTH} caracteres.`),
  assunto: z.string().max(MAX_ASSUNTO_LENGTH, `Assunto deve ter no maximo ${MAX_ASSUNTO_LENGTH} caracteres.`).optional(),
  texto_original: z.string().max(MAX_TEXTO_ORIGINAL_LENGTH, `Texto original deve ter no maximo ${MAX_TEXTO_ORIGINAL_LENGTH} caracteres.`).optional(),
  observacao: z.string().max(1000, 'Observacao deve ter no maximo 1000 caracteres.').optional(),
})

export const agendaEventSchema = z.object({
  title: z.string().min(3, 'Titulo deve ter pelo menos 3 caracteres.').max(MAX_AGENDA_TITLE_LENGTH, `Titulo deve ter no maximo ${MAX_AGENDA_TITLE_LENGTH} caracteres.`),
  type: z.enum(['SESSAO', 'COMISSAO', 'AUDIENCIA', 'PRAZO', 'GABINETE', 'EXTERNO']),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida. Use formato YYYY-MM-DD.')
    .refine((date) => {
      const parsedDate = new Date(date)
      return parsedDate instanceof Date && !isNaN(parsedDate.getTime())
    }, 'Data invalida.'),
  time: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora invalida. Use formato HH:MM.'),
  location: z.string().max(MAX_AGENDA_LOCATION_LENGTH, `Local deve ter no maximo ${MAX_AGENDA_LOCATION_LENGTH} caracteres.`).optional(),
  description: z.string().max(MAX_AGENDA_DESCRIPTION_LENGTH, `Descricao deve ter no maximo ${MAX_AGENDA_DESCRIPTION_LENGTH} caracteres.`).optional(),
})

export const obraSchema = z.object({
  titulo: z.string().min(5, 'Titulo deve ter pelo menos 5 caracteres.').max(MAX_OBRA_TITLE_LENGTH, `Titulo deve ter no maximo ${MAX_OBRA_TITLE_LENGTH} caracteres.`),
  descricao: z.string().max(MAX_OBRA_DESCRIPTION_LENGTH, `Descricao deve ter no maximo ${MAX_OBRA_DESCRIPTION_LENGTH} caracteres.`).optional(),
  localizacao: z.string().max(MAX_OBRA_LOCATION_LENGTH, `Localizacao deve ter no maximo ${MAX_OBRA_LOCATION_LENGTH} caracteres.`).optional(),
  orcamento: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        return isNaN(parsed) ? 0 : parsed
      }
      return value
    },
    z.number().min(0, 'Orcamento deve ser um valor positivo.')
  ).optional(),
  data_previsao_fim: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida. Use formato YYYY-MM-DD.')
    .refine((date) => {
      const parsedDate = new Date(date)
      return parsedDate instanceof Date && !isNaN(parsedDate.getTime())
    }, 'Data invalida.')
    .optional(),
})

export const loginSchema = z.object({
  email: z.string().refine((value) => {
    const emailResult = z.string().email().safeParse(value)
    if (emailResult.success) {
      return true
    }
    return /^\d{11}$/.test(value) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)
  }, 'Email invalido.'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.'),
})

const stripControlChars = (value: string) => {
  const filtered: string[] = []
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      continue
    }
    filtered.push(char)
  }
  return filtered.join('')
}

export function sanitizeInput(text: string): string {
  if (!text) return ''
  let sanitized = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/<(iframe|object|embed|link|meta|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
  sanitized = sanitized.replace(/<[^>]*>/g, '')
  sanitized = stripControlChars(sanitized)
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  return sanitized
}

export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized: Record<string, any> = { ...data }

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key])
    }
  }

  return sanitized as T
}

export const chatMessageSchema = z.object({
  message: z.preprocess(
    (value) => (typeof value === 'string' ? sanitizeInput(value) : value),
    z.string()
      .min(1, 'Mensagem nao pode estar vazia.')
      .max(MAX_MESSAGE_LENGTH, `Mensagem excede o limite maximo de ${MAX_MESSAGE_LENGTH} caracteres.`)
  ),
  conversationId: z.string().optional(),
  mode: z.enum(['fast', 'deep', 'sql', 'r1', 'standard']).optional().default('fast'),
})

export function validateFileSize(file: File, maxMB: number): boolean {
  return file.size <= maxMB * 1024 * 1024
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}
