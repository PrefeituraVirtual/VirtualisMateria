import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  materiaCreateSchema,
  materiaStep3Schema,
  materiaEditSchema,
  agendaEventSchema,
  obraSchema,
  loginSchema,
  chatMessageSchema,
  sanitizeInput,
  sanitizeFormData,
  validateFileSize,
  validateFileType,
  getZodErrors,
  MAX_MESSAGE_LENGTH,
  MAX_TEMA_LENGTH,
  MAX_EMENTA_LENGTH,
  MAX_ASSUNTO_LENGTH,
  MAX_TEXTO_ORIGINAL_LENGTH,
  MAX_AGENDA_TITLE_LENGTH,
  MAX_AGENDA_LOCATION_LENGTH,
  MAX_AGENDA_DESCRIPTION_LENGTH,
  MAX_OBRA_TITLE_LENGTH,
  MAX_OBRA_DESCRIPTION_LENGTH,
  MAX_OBRA_LOCATION_LENGTH,
  MIN_PASSWORD_LENGTH,
  VALID_MATERIA_TYPES,
} from '../validation'

// ============================================================================
// MATERIA CREATE SCHEMA TESTS
// ============================================================================

describe('materiaCreateSchema', () => {
  describe('casos de sucesso', () => {
    it('deve aceitar dados validos com todos os campos', () => {
      const validData = {
        tipo: 'PL' as const,
        tema: 'Projeto de lei sobre educacao municipal',
        ementa: 'Dispoe sobre a melhoria da educacao nas escolas municipais',
        assunto: 'Educacao, escolas, ensino fundamental',
        texto_original: 'Art. 1o. Esta lei dispoe sobre a melhoria da educacao...',
      }

      const result = materiaCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tipo).toBe('PL')
        expect(result.data.tema).toBe(validData.tema)
      }
    })

    it('deve aceitar dados validos com campos opcionais ausentes', () => {
      const minimalData = {
        tipo: 'REQ' as const,
        tema: 'Requerimento para informacoes sobre obras',
      }

      const result = materiaCreateSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar todos os tipos de materia validos', () => {
      for (const tipo of VALID_MATERIA_TYPES) {
        const data = {
          tipo,
          tema: 'Tema valido com pelo menos 10 caracteres',
        }
        const result = materiaCreateSchema.safeParse(data)
        expect(result.success).toBe(true)
      }
    })

    it('deve aceitar ementa vazia (string vazia)', () => {
      const data = {
        tipo: 'PL' as const,
        tema: 'Tema valido com pelo menos 10 caracteres',
        ementa: '',
      }

      const result = materiaCreateSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('casos de falha', () => {
    it('deve rejeitar tipo invalido', () => {
      const invalidData = {
        tipo: 'INVALIDO',
        tema: 'Tema valido com pelo menos 10 caracteres',
      }

      const result = materiaCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = getZodErrors(result.error)
        expect(errors.tipo).toBeDefined()
      }
    })

    it('deve rejeitar tema muito curto (< 10 chars)', () => {
      const invalidData = {
        tipo: 'PL' as const,
        tema: 'Curto',
      }

      const result = materiaCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = getZodErrors(result.error)
        expect(errors.tema).toContain('10 caracteres')
      }
    })

    it('deve rejeitar tema que e apenas espacos', () => {
      const invalidData = {
        tipo: 'PL' as const,
        tema: '          ',
      }

      const result = materiaCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar tema muito longo (> MAX_TEMA_LENGTH chars)', () => {
      const invalidData = {
        tipo: 'PL' as const,
        tema: 'a'.repeat(MAX_TEMA_LENGTH + 1),
      }

      const result = materiaCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = getZodErrors(result.error)
        expect(errors.tema).toContain('maximo')
      }
    })

    it('deve rejeitar ementa muito longa (> MAX_EMENTA_LENGTH chars)', () => {
      const invalidData = {
        tipo: 'PL' as const,
        tema: 'Tema valido com pelo menos 10 caracteres',
        ementa: 'a'.repeat(MAX_EMENTA_LENGTH + 1),
      }

      const result = materiaCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = getZodErrors(result.error)
        expect(errors.ementa).toContain('maximo')
      }
    })

    it('deve rejeitar assunto muito longo (> MAX_ASSUNTO_LENGTH chars)', () => {
      const invalidData = {
        tipo: 'PL' as const,
        tema: 'Tema valido com pelo menos 10 caracteres',
        assunto: 'a'.repeat(MAX_ASSUNTO_LENGTH + 1),
      }

      const result = materiaCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar texto_original muito longo (> MAX_TEXTO_ORIGINAL_LENGTH chars)', () => {
      const invalidData = {
        tipo: 'PL' as const,
        tema: 'Tema valido com pelo menos 10 caracteres',
        texto_original: 'a'.repeat(MAX_TEXTO_ORIGINAL_LENGTH + 1),
      }

      const result = materiaCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar quando tipo esta ausente', () => {
      const invalidData = {
        tema: 'Tema valido com pelo menos 10 caracteres',
      }

      const result = materiaCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar quando tema esta ausente', () => {
      const invalidData = {
        tipo: 'PL' as const,
      }

      const result = materiaCreateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// MATERIA STEP 3 SCHEMA TESTS
// ============================================================================

describe('materiaStep3Schema', () => {
  it('deve aceitar dados validos com ementa obrigatoria', () => {
    const validData = {
      tipo: 'PL' as const,
      tema: 'Tema valido com pelo menos 10 caracteres',
      ementa: 'Ementa valida com pelo menos 10 caracteres na descricao',
    }

    const result = materiaStep3Schema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('deve rejeitar ementa muito curta (< 10 chars)', () => {
    const invalidData = {
      tipo: 'PL' as const,
      tema: 'Tema valido com pelo menos 10 caracteres',
      ementa: 'Curta',
    }

    const result = materiaStep3Schema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar ementa vazia no step 3', () => {
    const invalidData = {
      tipo: 'PL' as const,
      tema: 'Tema valido com pelo menos 10 caracteres',
      ementa: '',
    }

    const result = materiaStep3Schema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar ementa ausente no step 3', () => {
    const invalidData = {
      tipo: 'PL' as const,
      tema: 'Tema valido com pelo menos 10 caracteres',
    }

    const result = materiaStep3Schema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// MATERIA EDIT SCHEMA TESTS
// ============================================================================

describe('materiaEditSchema', () => {
  it('deve aceitar dados validos com campos opcionais ausentes', () => {
    const validData = {
      ementa: 'Ementa valida com pelo menos vinte caracteres',
    }

    const result = materiaEditSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('deve aceitar dados validos completos', () => {
    const validData = {
      ementa: 'Ementa valida com pelo menos vinte caracteres',
      assunto: 'Assunto curto',
      texto_original: 'Texto original com conteudo simples',
      observacao: 'Observacao interna',
    }

    const result = materiaEditSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('deve rejeitar ementa muito curta (< 20 chars)', () => {
    const invalidData = {
      ementa: 'Muito curta',
    }

    const result = materiaEditSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar assunto muito longo', () => {
    const invalidData = {
      ementa: 'Ementa valida com pelo menos vinte caracteres',
      assunto: 'a'.repeat(MAX_ASSUNTO_LENGTH + 1),
    }

    const result = materiaEditSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar observacao muito longa', () => {
    const invalidData = {
      ementa: 'Ementa valida com pelo menos vinte caracteres',
      observacao: 'a'.repeat(1001),
    }

    const result = materiaEditSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// LOGIN SCHEMA TESTS
// ============================================================================

describe('loginSchema', () => {
  describe('casos de sucesso', () => {
    it('deve aceitar email e senha validos', () => {
      const validData = {
        email: 'usuario@exemplo.com',
        password: 'senha123',
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar CPF valido como identificador', () => {
      const validData = {
        email: '12345678901',
        password: 'senha123',
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar CPF formatado', () => {
      const validData = {
        email: '123.456.789-01',
        password: 'senha123',
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar senha no limite minimo', () => {
      const validData = {
        email: 'usuario@exemplo.com',
        password: 'a'.repeat(MIN_PASSWORD_LENGTH),
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('casos de falha', () => {
    it('deve rejeitar email invalido (formato incorreto)', () => {
      const invalidData = {
        email: 'email-invalido',
        password: 'senha123',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = getZodErrors(result.error)
        expect(errors.email).toBeDefined()
      }
    })

    it('deve rejeitar email sem dominio', () => {
      const invalidData = {
        email: 'usuario@',
        password: 'senha123',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar senha muito curta (< MIN_PASSWORD_LENGTH chars)', () => {
      const invalidData = {
        email: 'usuario@exemplo.com',
        password: 'a'.repeat(MIN_PASSWORD_LENGTH - 1),
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = getZodErrors(result.error)
        expect(errors.password).toContain(String(MIN_PASSWORD_LENGTH))
      }
    })

    it('deve rejeitar campos vazios - email vazio', () => {
      const invalidData = {
        email: '',
        password: 'senha123',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar campos vazios - senha vazia', () => {
      const invalidData = {
        email: 'usuario@exemplo.com',
        password: '',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar CPF com tamanho incorreto', () => {
      const invalidData = {
        email: '1234567890', // 10 digitos ao inves de 11
        password: 'senha123',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// CHAT MESSAGE SCHEMA TESTS
// ============================================================================

describe('chatMessageSchema', () => {
  describe('casos de sucesso', () => {
    it('deve aceitar mensagem valida', () => {
      const validData = {
        message: 'Qual o quorum para aprovacao de projeto de lei?',
      }

      const result = chatMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mode).toBe('fast') // default value
      }
    })

    it('deve aceitar com conversationId valido', () => {
      const validData = {
        message: 'Mensagem de teste',
        conversationId: 'abc-123-xyz',
      }

      const result = chatMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar com mode fast', () => {
      const validData = {
        message: 'Mensagem de teste',
        mode: 'fast' as const,
      }

      const result = chatMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mode).toBe('fast')
      }
    })

    it('deve aceitar com mode deep', () => {
      const validData = {
        message: 'Mensagem de teste',
        mode: 'deep' as const,
      }

      const result = chatMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar com mode sql', () => {
      const validData = {
        message: 'Quantos projetos foram aprovados em 2024?',
        mode: 'sql' as const,
      }

      const result = chatMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar com mode r1', () => {
      const validData = {
        message: 'Analise a constitucionalidade deste projeto',
        mode: 'r1' as const,
      }

      const result = chatMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar com mode standard', () => {
      const validData = {
        message: 'Mensagem padrao',
        mode: 'standard' as const,
      }

      const result = chatMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve aceitar mensagem no limite maximo', () => {
      const validData = {
        message: 'a'.repeat(MAX_MESSAGE_LENGTH),
      }

      const result = chatMessageSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('casos de falha', () => {
    it('deve rejeitar mensagem vazia', () => {
      const invalidData = {
        message: '',
      }

      const result = chatMessageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = getZodErrors(result.error)
        expect(errors.message).toContain('vazia')
      }
    })

    it('deve rejeitar mensagem muito longa (> MAX_MESSAGE_LENGTH chars)', () => {
      const invalidData = {
        message: 'a'.repeat(MAX_MESSAGE_LENGTH + 1),
      }

      const result = chatMessageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = getZodErrors(result.error)
        expect(errors.message).toContain('maximo')
      }
    })

    it('deve rejeitar mensagem com apenas espacos', () => {
      const invalidData = {
        message: '     ',
      }

      const result = chatMessageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('deve rejeitar mode invalido', () => {
      const invalidData = {
        message: 'Mensagem valida',
        mode: 'invalido',
      }

      const result = chatMessageSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// AGENDA EVENT SCHEMA TESTS
// ============================================================================

describe('agendaEventSchema', () => {
  it('deve aceitar evento valido', () => {
    const validData = {
      title: 'Reuniao com secretario de obras',
      type: 'GABINETE' as const,
      date: '2024-05-10',
      time: '14:30',
      location: 'Sala 2',
      description: 'Alinhamento de prioridades',
    }

    const result = agendaEventSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('deve rejeitar titulo muito curto', () => {
    const invalidData = {
      title: 'Oi',
      type: 'GABINETE' as const,
      date: '2024-05-10',
      time: '14:30',
    }

    const result = agendaEventSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar data com formato invalido', () => {
    const invalidData = {
      title: 'Reuniao valida',
      type: 'GABINETE' as const,
      date: '10/05/2024',
      time: '14:30',
    }

    const result = agendaEventSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar data inexistente', () => {
    const invalidData = {
      title: 'Reuniao valida',
      type: 'GABINETE' as const,
      date: '2024-13-01',
      time: '14:30',
    }

    const result = agendaEventSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar hora invalida', () => {
    const invalidData = {
      title: 'Reuniao valida',
      type: 'GABINETE' as const,
      date: '2024-05-10',
      time: '25:00',
    }

    const result = agendaEventSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar local muito longo', () => {
    const invalidData = {
      title: 'Reuniao valida',
      type: 'GABINETE' as const,
      date: '2024-05-10',
      time: '14:30',
      location: 'a'.repeat(MAX_AGENDA_LOCATION_LENGTH + 1),
    }

    const result = agendaEventSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar titulo muito longo', () => {
    const invalidData = {
      title: 'a'.repeat(MAX_AGENDA_TITLE_LENGTH + 1),
      type: 'GABINETE' as const,
      date: '2024-05-10',
      time: '14:30',
    }

    const result = agendaEventSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar descricao muito longa', () => {
    const invalidData = {
      title: 'Reuniao valida',
      type: 'GABINETE' as const,
      date: '2024-05-10',
      time: '14:30',
      description: 'a'.repeat(MAX_AGENDA_DESCRIPTION_LENGTH + 1),
    }

    const result = agendaEventSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// OBRA SCHEMA TESTS
// ============================================================================

describe('obraSchema', () => {
  it('deve aceitar obra valida', () => {
    const validData = {
      titulo: 'Reforma da escola municipal',
      descricao: 'Reforma completa do telhado e pintura',
      localizacao: 'Centro',
      orcamento: '120000.50',
      data_previsao_fim: '2024-12-31',
    }

    const result = obraSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.orcamento).toBe(120000.5)
    }
  })

  it('deve aceitar obra com campos opcionais ausentes', () => {
    const validData = {
      titulo: 'Pavimentacao da rua A',
    }

    const result = obraSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('deve rejeitar titulo muito curto', () => {
    const invalidData = {
      titulo: 'ABC',
    }

    const result = obraSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar titulo muito longo', () => {
    const invalidData = {
      titulo: 'a'.repeat(MAX_OBRA_TITLE_LENGTH + 1),
    }

    const result = obraSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar descricao muito longa', () => {
    const invalidData = {
      titulo: 'Obra valida com titulo longo',
      descricao: 'a'.repeat(MAX_OBRA_DESCRIPTION_LENGTH + 1),
    }

    const result = obraSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar orcamento negativo', () => {
    const invalidData = {
      titulo: 'Obra valida com titulo longo',
      orcamento: '-10',
    }

    const result = obraSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar localizacao muito longa', () => {
    const invalidData = {
      titulo: 'Obra valida com titulo longo',
      localizacao: 'a'.repeat(MAX_OBRA_LOCATION_LENGTH + 1),
    }

    const result = obraSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar data invalida', () => {
    const invalidData = {
      titulo: 'Obra valida com titulo longo',
      data_previsao_fim: '2024-13-01',
    }

    const result = obraSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// SANITIZE INPUT TESTS
// ============================================================================

describe('sanitizeInput', () => {
  it('deve remover tags script', () => {
    const input = "<script>alert('xss')</script>"
    const result = sanitizeInput(input)
    expect(result).toBe('')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('</script>')
  })

  it('deve remover tags HTML gerais e preservar conteudo', () => {
    const input = '<div>texto</div>'
    const result = sanitizeInput(input)
    expect(result).toBe('texto')
    expect(result).not.toContain('<div>')
    expect(result).not.toContain('</div>')
  })

  it('deve fazer trim de espacos', () => {
    const input = '  espacos  '
    const result = sanitizeInput(input)
    expect(result).toBe('espacos')
  })

  it('deve preservar texto normal sem alteracoes', () => {
    const input = 'Texto normal sem tags HTML'
    const result = sanitizeInput(input)
    expect(result).toBe('Texto normal sem tags HTML')
  })

  it('deve lidar com strings vazias', () => {
    const result = sanitizeInput('')
    expect(result).toBe('')
  })

  it('deve lidar com valores null/undefined', () => {
    // @ts-expect-error - testing null handling
    const resultNull = sanitizeInput(null)
    expect(resultNull).toBe('')

    // @ts-expect-error - testing undefined handling
    const resultUndefined = sanitizeInput(undefined)
    expect(resultUndefined).toBe('')
  })

  it('deve remover multiplas tags aninhadas', () => {
    const input = '<div><span><strong>texto</strong></span></div>'
    const result = sanitizeInput(input)
    expect(result).toBe('texto')
  })

  it('deve remover tags com atributos', () => {
    const input = '<a href="http://malicious.com" onclick="steal()">link</a>'
    const result = sanitizeInput(input)
    expect(result).toBe('link')
  })

  it('deve fazer trim e remover tags combinados', () => {
    const input = '   <p>conteudo</p>   '
    const result = sanitizeInput(input)
    expect(result).toBe('conteudo')
  })

  it('deve remover tags de estilo', () => {
    const input = '<style>.class { color: red; }</style>texto visivel'
    const result = sanitizeInput(input)
    expect(result).toBe('texto visivel')
  })

  it('deve remover tags img', () => {
    const input = '<img src="image.jpg" alt="imagem">texto'
    const result = sanitizeInput(input)
    expect(result).toBe('texto')
  })

  it('deve remover atributos de evento', () => {
    const input = '<div onclick="alert(1)">Clique aqui</div>'
    const result = sanitizeInput(input)
    expect(result).toBe('Clique aqui')
  })

  it('deve remover tags perigosas com conteudo', () => {
    const input = '<iframe src="https://malicioso.example">conteudo</iframe>texto'
    const result = sanitizeInput(input)
    expect(result).toBe('texto')
  })

  it('deve normalizar multiplos espacos', () => {
    const input = 'Texto   com   varios   espacos'
    const result = sanitizeInput(input)
    expect(result).toBe('Texto com varios espacos')
  })
})

// ============================================================================
// SANITIZE FORM DATA TESTS
// ============================================================================

describe('sanitizeFormData', () => {
  it('deve sanitizar apenas campos string', () => {
    const input = {
      titulo: '<b>Titulo</b>',
      orcamento: 1200,
      ativo: true,
    }

    const result = sanitizeFormData(input)
    expect(result.titulo).toBe('Titulo')
    expect(result.orcamento).toBe(1200)
    expect(result.ativo).toBe(true)
  })

  it('deve lidar com campos string vazios', () => {
    const input = {
      descricao: '',
      localizacao: '  Centro  ',
    }

    const result = sanitizeFormData(input)
    expect(result.descricao).toBe('')
    expect(result.localizacao).toBe('Centro')
  })
})

// ============================================================================
// VALIDATE FILE SIZE TESTS
// ============================================================================

describe('validateFileSize', () => {
  // Helper function to create mock File
  function createMockFile(sizeInBytes: number, name = 'test.txt'): File {
    const content = new Array(sizeInBytes).fill('a').join('')
    return new File([content], name, { type: 'text/plain' })
  }

  it('deve retornar true para arquivo menor que limite', () => {
    const file = createMockFile(1 * 1024 * 1024) // 1MB
    const result = validateFileSize(file, 5) // 5MB limit
    expect(result).toBe(true)
  })

  it('deve retornar true para arquivo igual ao limite', () => {
    const file = createMockFile(5 * 1024 * 1024) // 5MB
    const result = validateFileSize(file, 5) // 5MB limit
    expect(result).toBe(true)
  })

  it('deve retornar false para arquivo maior que limite', () => {
    const file = createMockFile(10 * 1024 * 1024) // 10MB
    const result = validateFileSize(file, 5) // 5MB limit
    expect(result).toBe(false)
  })

  it('deve aceitar arquivo de 0 bytes', () => {
    const file = createMockFile(0)
    const result = validateFileSize(file, 1)
    expect(result).toBe(true)
  })

  it('deve funcionar com limites decimais', () => {
    const file = createMockFile(1.5 * 1024 * 1024) // 1.5MB
    const result = validateFileSize(file, 1.6) // 1.6MB limit
    expect(result).toBe(true)
  })

  it('deve rejeitar arquivo ligeiramente maior que limite', () => {
    const file = createMockFile(5 * 1024 * 1024 + 1) // 5MB + 1 byte
    const result = validateFileSize(file, 5) // 5MB limit
    expect(result).toBe(false)
  })
})

// ============================================================================
// VALIDATE FILE TYPE TESTS
// ============================================================================

describe('validateFileType', () => {
  function createMockFileWithType(type: string, name = 'test.txt'): File {
    return new File(['content'], name, { type })
  }

  it('deve retornar true para tipo permitido', () => {
    const file = createMockFileWithType('application/pdf', 'document.pdf')
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    const result = validateFileType(file, allowedTypes)
    expect(result).toBe(true)
  })

  it('deve retornar false para tipo nao permitido', () => {
    const file = createMockFileWithType('application/exe', 'virus.exe')
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    const result = validateFileType(file, allowedTypes)
    expect(result).toBe(false)
  })

  it('deve validar tipos de imagem', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']

    const jpegFile = createMockFileWithType('image/jpeg', 'photo.jpg')
    expect(validateFileType(jpegFile, allowedTypes)).toBe(true)

    const pngFile = createMockFileWithType('image/png', 'image.png')
    expect(validateFileType(pngFile, allowedTypes)).toBe(true)

    const gifFile = createMockFileWithType('image/gif', 'animation.gif')
    expect(validateFileType(gifFile, allowedTypes)).toBe(true)
  })

  it('deve validar tipos de documento', () => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    const pdfFile = createMockFileWithType('application/pdf', 'doc.pdf')
    expect(validateFileType(pdfFile, allowedTypes)).toBe(true)

    const docFile = createMockFileWithType('application/msword', 'doc.doc')
    expect(validateFileType(docFile, allowedTypes)).toBe(true)
  })

  it('deve retornar false para lista vazia de tipos permitidos', () => {
    const file = createMockFileWithType('application/pdf', 'document.pdf')
    const result = validateFileType(file, [])
    expect(result).toBe(false)
  })

  it('deve rejeitar MIME type similar mas diferente', () => {
    const file = createMockFileWithType('application/x-pdf', 'document.pdf')
    const allowedTypes = ['application/pdf']
    const result = validateFileType(file, allowedTypes)
    expect(result).toBe(false) // application/x-pdf is not the same as application/pdf
  })

  it('deve validar tipos de audio', () => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg']

    const mp3File = createMockFileWithType('audio/mpeg', 'song.mp3')
    expect(validateFileType(mp3File, allowedTypes)).toBe(true)

    const wavFile = createMockFileWithType('audio/wav', 'audio.wav')
    expect(validateFileType(wavFile, allowedTypes)).toBe(true)
  })

  it('deve validar tipos de video', () => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']

    const mp4File = createMockFileWithType('video/mp4', 'video.mp4')
    expect(validateFileType(mp4File, allowedTypes)).toBe(true)
  })
})

// ============================================================================
// GET ZOD ERRORS TESTS
// ============================================================================

describe('getZodErrors', () => {
  it('deve extrair erros de ZodError em formato Record<string, string>', () => {
    const schema = z.object({
      name: z.string().min(1, 'Nome obrigatorio'),
      email: z.string().email('Email invalido'),
    })

    const result = schema.safeParse({ name: '', email: 'invalid' })
    expect(result.success).toBe(false)

    if (!result.success) {
      const errors = getZodErrors(result.error)
      expect(errors.name).toBe('Nome obrigatorio')
      expect(errors.email).toBe('Email invalido')
    }
  })

  it('deve lidar com erros aninhados (paths)', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string().min(1, 'Nome do perfil obrigatorio'),
        }),
      }),
    })

    const result = schema.safeParse({ user: { profile: { name: '' } } })
    expect(result.success).toBe(false)

    if (!result.success) {
      const errors = getZodErrors(result.error)
      expect(errors['user.profile.name']).toBe('Nome do perfil obrigatorio')
    }
  })

  it('deve retornar objeto vazio para ZodError sem issues', () => {
    // Create a synthetic ZodError with no issues
    const emptyError = new z.ZodError([])
    const errors = getZodErrors(emptyError)
    expect(errors).toEqual({})
  })

  it('deve retornar apenas primeiro erro para campo com multiplos erros', () => {
    const schema = z.object({
      password: z
        .string()
        .min(6, 'Senha muito curta')
        .regex(/[A-Z]/, 'Deve conter maiuscula')
        .regex(/[0-9]/, 'Deve conter numero'),
    })

    const result = schema.safeParse({ password: 'abc' })
    expect(result.success).toBe(false)

    if (!result.success) {
      const errors = getZodErrors(result.error)
      // Should only have one error for password, the first one
      expect(errors.password).toBe('Senha muito curta')
    }
  })

  it('deve lidar com erros de array', () => {
    const schema = z.object({
      items: z.array(z.string().min(1, 'Item nao pode estar vazio')),
    })

    const result = schema.safeParse({ items: ['valid', '', 'another valid'] })
    expect(result.success).toBe(false)

    if (!result.success) {
      const errors = getZodErrors(result.error)
      expect(errors['items.1']).toBe('Item nao pode estar vazio')
    }
  })

  it('deve converter paths numericos corretamente', () => {
    const schema = z.array(
      z.object({
        value: z.number().positive('Valor deve ser positivo'),
      })
    )

    const result = schema.safeParse([{ value: 1 }, { value: -1 }, { value: 3 }])
    expect(result.success).toBe(false)

    if (!result.success) {
      const errors = getZodErrors(result.error)
      expect(errors['1.value']).toBe('Valor deve ser positivo')
    }
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  describe('validacao de fluxo completo de materia', () => {
    it('deve validar criacao de materia legislativa completa', () => {
      const materia = {
        tipo: 'PL' as const,
        tema: 'Projeto de lei para melhoria da mobilidade urbana',
        ementa: 'Dispoe sobre a criacao de ciclovias e calcadas acessiveis no municipio',
        assunto: 'Mobilidade urbana, acessibilidade, transporte sustentavel',
        texto_original: `
          Art. 1o. Fica instituido o Plano Municipal de Mobilidade Sustentavel.
          Art. 2o. O Plano tera como diretrizes:
          I - Priorizacao do transporte coletivo;
          II - Implantacao de ciclovias;
          III - Melhoria da acessibilidade.
        `,
      }

      const result = materiaCreateSchema.safeParse(materia)
      expect(result.success).toBe(true)
    })
  })

  describe('validacao de fluxo completo de chat', () => {
    it('deve validar mensagem de chat com sanitizacao', () => {
      const rawMessage = '  <b>Qual</b> o quorum para aprovacao?  '
      const sanitized = sanitizeInput(rawMessage)

      const chatData = {
        message: sanitized,
        mode: 'standard' as const,
      }

      const result = chatMessageSchema.safeParse(chatData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.message).toBe('Qual o quorum para aprovacao?')
      }
    })
  })
})
