// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAxiosError,
  createAxiosResponse,
  mockAxios,
  resetAxiosMocks,
  setupLocalStorageMock,
} from '@/__tests__/utils/api-mocks'
import {
  api,
  adminDataAnalystService,
  adminIntelligenceService,
  adminService,
  agendaService,
  aiAnalysisService,
  atasService,
  authService,
  chatService,
  deepSeekService,
  documentsService,
  materiasService,
  transcriptionService,
  worksService,
} from '@/lib/api'
import type { User } from '@/types/auth'

const mockUser: User = {
  id: 'user-1',
  name: 'Usuario Teste',
  email: 'user@example.com',
  role: 'council_member' as const,
  council_member_id: 'cm-1',
  council_id: 'c-1',
}

describe('API Services', () => {
  beforeEach(() => {
    resetAxiosMocks()
    setupLocalStorageMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('authService', () => {
    it('login stores token and user in api cache', async () => {
      await authService.login('token-123', mockUser)
      // authService now stores in api cache, not directly in localStorage
      expect(api.getAuthToken()).toBe('token-123')
      expect(api.getCachedUser()).toEqual(mockUser)
    })

    it('logout clears auth storage', async () => {
      await authService.login('token-123', mockUser)
      await authService.logout()
      // Check that cache is cleared
      expect(api.getAuthToken()).toBeNull()
      expect(api.getCachedUser()).toBeNull()
    })

    it('getMe calls the auth endpoint', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, user: mockUser })
      await authService.getMe()
      expect(getSpy).toHaveBeenCalledWith('/api/auth/me')
    })

    it('updateProfile calls the profile endpoint', async () => {
      const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ success: true })
      await authService.updateProfile({ name: 'Novo Nome' })
      expect(putSpy).toHaveBeenCalledWith('/api/auth/profile', { name: 'Novo Nome' })
    })

    it('updatePreferences calls the preferences endpoint', async () => {
      const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ success: true })
      await authService.updatePreferences({ theme: 'dark' })
      expect(putSpy).toHaveBeenCalledWith('/api/auth/preferences', { preferences: { theme: 'dark' } })
    })

    it('exportData calls the export endpoint', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await authService.exportData()
      expect(getSpy).toHaveBeenCalledWith('/api/auth/export-data')
    })
  })

  describe('materiasService', () => {
    it('getAll fetches list with params', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [], pagination: {} })
      await materiasService.getAll({ page: 2, limit: 10 })
      expect(getSpy).toHaveBeenCalledWith('/api/materias', { params: { page: 2, limit: 10 } })
    })

    it('get returns material data from wrapped response', async () => {
      const materia = { id: 'm1', titulo: 'Materia' }
      vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: materia })
      const result = await materiasService.get('m1')
      expect(result).toEqual(materia)
    })

    it('get returns material data from direct response', async () => {
      const materia = { id: 'm2', titulo: 'Outra' }
      vi.spyOn(api, 'get').mockResolvedValue(materia)
      const result = await materiasService.get('m2')
      expect(result).toEqual(materia)
    })

    it('create posts new materia', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true, data: { id: 'm3' } })
      await materiasService.create({ tipo: 'PL', ementa: 'Teste' })
      expect(postSpy).toHaveBeenCalledWith('/api/materias', { tipo: 'PL', ementa: 'Teste' })
    })

    it('update posts update payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await materiasService.update('m3', { ementa: 'Atualizada' })
      expect(postSpy).toHaveBeenCalledWith('/api/materias/m3', { ementa: 'Atualizada' })
    })

    it('delete removes materia', async () => {
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ success: true })
      await materiasService.delete('m3')
      expect(deleteSpy).toHaveBeenCalledWith('/api/materias/m3')
    })

    it('search posts semantic query', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true, results: [] })
      await materiasService.search('educacao', 3, { filters: { tipo: 'PL' } })
      expect(postSpy).toHaveBeenCalledWith('/api/search/semantic', { query: 'educacao', page: 3, filters: { tipo: 'PL' } })
    })
  })

  describe('chatService', () => {
    it('getConversations requests conversation list', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      await chatService.getConversations()
      expect(getSpy).toHaveBeenCalledWith('/api/chat/conversations')
    })

    it('createConversation posts title payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await chatService.createConversation('Nova')
      expect(postSpy).toHaveBeenCalledWith('/api/chat/conversations', { title: 'Nova' })
    })

    it('sendMessage posts message payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await chatService.sendMessage({ message: 'Oi', mode: 'fast' })
      expect(postSpy).toHaveBeenCalledWith(
        '/api/chat/send',
        { message: 'Oi', mode: 'fast' },
        expect.objectContaining({ rateLimiter: expect.any(Object) })
      )
    })

    it('getHistory fetches conversation messages', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      await chatService.getHistory('c1')
      expect(getSpy).toHaveBeenCalledWith('/api/chat/conversations/c1')
    })
  })

  describe('transcriptionService', () => {
    it('uploadAudio posts to backend with auth header', async () => {
      const originalBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test'
      // Use api.setAuth to set the token in the cache
      await api.setAuth('token-123', mockUser)
      mockAxios.post.mockResolvedValueOnce(createAxiosResponse({ success: true, jobId: 'job-1' }))

      const file = new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' })
      await transcriptionService.uploadAudio(file)

      const [url, body, config] = mockAxios.post.mock.calls[0]
      expect(url).toBe('http://backend.test/api/transcricao/upload-v2')
      expect(body instanceof FormData).toBe(true)
      expect(config.headers.Authorization).toBe('Bearer token-123')
      process.env.NEXT_PUBLIC_BACKEND_URL = originalBackendUrl
    })

    it('retries upload on timeout and throws after second failure', async () => {
      mockAxios.post
        .mockRejectedValueOnce(createAxiosError({ code: 'ECONNABORTED', message: 'timeout' }))
        .mockRejectedValueOnce(createAxiosError({ code: 'ECONNABORTED', message: 'timeout' }))

      const file = new File(['audio'], 'audio.mp3', { type: 'audio/mpeg' })
      await expect(transcriptionService.uploadAudio(file)).rejects.toThrow(
        'Upload demorou muito. Arquivo muito grande? Tente novamente.'
      )
      expect(mockAxios.post).toHaveBeenCalledTimes(2)
    })

    it('transcribeYouTube posts to the transcription endpoint', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true, jobId: 'job-2' })
      await transcriptionService.transcribeYouTube('https://youtube.com/test', { segmented: true })
      expect(postSpy).toHaveBeenCalledWith('/api/transcricao/youtube', {
        url: 'https://youtube.com/test',
        segmented: true,
      })
    })

    it('listJobs requests transcription jobs with params', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [], pagination: {} })
      await transcriptionService.listJobs({ page: 1, limit: 20 })
      expect(getSpy).toHaveBeenCalledWith('/api/transcricao/jobs', { params: { page: 1, limit: 20 } })
    })

    it('analyzeTranscription calls backend directly', async () => {
      // Use api.setAuth to set the token in the cache
      await api.setAuth('token-123', mockUser)
      mockAxios.post.mockResolvedValueOnce(createAxiosResponse({ success: true, data: { summary: 'ok' } }))

      const result = await transcriptionService.analyzeTranscription('job-9')
      expect(result).toEqual({ success: true, data: { summary: 'ok' } })
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:4000/api/transcricao/job-9/analise',
        {},
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
        })
      )
    })

    it('removes abort listener after analysis completes', async () => {
      const controller = new AbortController()
      const removeSpy = vi.spyOn(controller.signal, 'removeEventListener')
      mockAxios.post.mockResolvedValueOnce(createAxiosResponse({ success: true, data: { summary: 'ok' } }))

      await transcriptionService.analyzeTranscription('job-10', { signal: controller.signal })
      expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function))
    })

    it('getAnalysis fetches existing analysis', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: {} })
      await transcriptionService.getAnalysis('job-11')
      expect(getSpy).toHaveBeenCalledWith('/api/transcricao/job-11/analise')
    })
  })

  describe('documentsService', () => {
    it('getAll fetches documents list', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      await documentsService.getAll()
      expect(getSpy).toHaveBeenCalledWith('/api/documents')
    })

    it('create posts document payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await documentsService.create({ title: 'Doc', content: 'Texto', type: 'pdf' })
      expect(postSpy).toHaveBeenCalledWith('/api/documents', { title: 'Doc', content: 'Texto', type: 'pdf' })
    })

    it('upload sends multipart form data', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true, id: '1', url: 'x' })
      const file = new File(['doc'], 'doc.pdf', { type: 'application/pdf' })
      await documentsService.upload(file)
      const [, formData, config] = postSpy.mock.calls[0]
      expect(formData instanceof FormData).toBe(true)
      expect(config).toEqual(expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
        rateLimiter: expect.any(Object)
      }))
    })

    it('download requests blob response', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue(new Blob(['x']))
      await documentsService.download('doc-1')
      expect(getSpy).toHaveBeenCalledWith('/api/documents/doc-1/download', { responseType: 'blob' })
    })
  })

  describe('deepSeekService', () => {
    it('analyze posts query payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ result: true })
      await deepSeekService.analyze('Resumo', 'fast', { context: true })
      expect(postSpy).toHaveBeenCalledWith('/api/ai/analyze', {
        query: 'Resumo',
        mode: 'fast',
        contextData: { context: true },
      }, expect.objectContaining({ rateLimiter: expect.any(Object) }))
    })

    it('chatWithMode maps fast to standard', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await deepSeekService.chatWithMode('Oi', 'fast', 'c1')
      expect(postSpy).toHaveBeenCalledWith('/api/chat/send', {
        message: 'Oi',
        mode: 'standard',
        conversationId: 'c1',
      }, expect.objectContaining({ rateLimiter: expect.any(Object) }))
    })

    it('classifyQuery posts classifier request', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ intent: 'x' })
      await deepSeekService.classifyQuery('Pergunta')
      expect(postSpy).toHaveBeenCalledWith('/api/ai/classify', { query: 'Pergunta' })
    })

    it('getAnalyses fetches analyses with filters', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      await deepSeekService.getAnalyses({ status: 'done' })
      expect(getSpy).toHaveBeenCalledWith('/api/ai/analyses', { params: { status: 'done' } })
    })

    it('deleteAnalysis removes analysis', async () => {
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ success: true })
      await deepSeekService.deleteAnalysis('a1')
      expect(deleteSpy).toHaveBeenCalledWith('/api/ai/analyses/a1')
    })
  })

  describe('agendaService', () => {
    it('getAll fetches agenda items', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      await agendaService.getAll()
      expect(getSpy).toHaveBeenCalledWith('/api/agenda')
    })

    it('create posts new agenda item', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await agendaService.create({ titulo: 'Sessao', data: '2024-10-01' })
      expect(postSpy).toHaveBeenCalledWith('/api/agenda', { titulo: 'Sessao', data: '2024-10-01' })
    })

    it('update puts agenda item', async () => {
      const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ success: true })
      await agendaService.update(3, { titulo: 'Atualizado' })
      expect(putSpy).toHaveBeenCalledWith('/api/agenda/3', { titulo: 'Atualizado' })
    })

    it('delete removes agenda item', async () => {
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ success: true })
      await agendaService.delete(3)
      expect(deleteSpy).toHaveBeenCalledWith('/api/agenda/3')
    })
  })

  describe('aiAnalysisService', () => {
    it('getAll fetches analysis list', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      await aiAnalysisService.getAll({ status: 'done' })
      expect(getSpy).toHaveBeenCalledWith('/api/ai/analyses', { params: { status: 'done' } })
    })

    it('getById fetches analysis by id', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: {} })
      await aiAnalysisService.getById('a1')
      expect(getSpy).toHaveBeenCalledWith('/api/ai/analyses/a1')
    })

    it('create posts analysis payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      const analysisData = { query: 'Test query', confidence: 0.9 }
      await aiAnalysisService.create(analysisData)
      expect(postSpy).toHaveBeenCalledWith('/api/ai/analyses', analysisData)
    })

    it('update puts analysis payload', async () => {
      const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ success: true })
      const updateData = { confidence: 0.95 }
      await aiAnalysisService.update('a1', updateData)
      expect(putSpy).toHaveBeenCalledWith('/api/ai/analyses/a1', updateData)
    })

    it('delete removes analysis', async () => {
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ success: true })
      await aiAnalysisService.delete('a1')
      expect(deleteSpy).toHaveBeenCalledWith('/api/ai/analyses/a1')
    })

    it('export requests analysis blob', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue(new Blob(['x']))
      await aiAnalysisService.export('a1', 'pdf')
      expect(getSpy).toHaveBeenCalledWith('/api/ai/analyses/a1/export', {
        params: { format: 'pdf' },
        responseType: 'blob',
      })
    })
  })

  describe('worksService', () => {
    it('getAll fetches works for user', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      await worksService.getAll(9)
      expect(getSpy).toHaveBeenCalledWith('/api/works?user_id=9')
    })

    it('create posts work payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await worksService.create({ titulo: 'Obra', descricao: 'Desc', status: 'EM_ANDAMENTO', user_id: 9 })
      expect(postSpy).toHaveBeenCalledWith('/api/works', {
        titulo: 'Obra',
        descricao: 'Desc',
        status: 'EM_ANDAMENTO',
        user_id: 9,
      })
    })

    it('update puts work payload', async () => {
      const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ success: true })
      await worksService.update(4, { status: 'FINALIZADA' })
      expect(putSpy).toHaveBeenCalledWith('/api/works/4', { status: 'FINALIZADA' })
    })

    it('delete removes work', async () => {
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ success: true })
      await worksService.delete(4, 9)
      expect(deleteSpy).toHaveBeenCalledWith('/api/works/4?user_id=9')
    })

    it('getInspections fetches inspections', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      await worksService.getInspections(4)
      expect(getSpy).toHaveBeenCalledWith('/api/works/4/inspections')
    })
  })

  describe('atasService', () => {
    it('getAll fetches atas list with params', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      await atasService.getAll({ page: 1, limit: 10 })
      expect(getSpy).toHaveBeenCalledWith('/api/atas', { params: { page: 1, limit: 10 } })
    })

    it('get fetches ata by id', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await atasService.get(1)
      expect(getSpy).toHaveBeenCalledWith('/api/atas/1')
    })

    it('create posts new ata', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await atasService.create({ titulo: 'Ata' })
      expect(postSpy).toHaveBeenCalledWith('/api/atas', { titulo: 'Ata' })
    })

    it('update puts ata changes', async () => {
      const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ success: true })
      await atasService.update(2, { status: 'APR' })
      expect(putSpy).toHaveBeenCalledWith('/api/atas/2', { status: 'APR' })
    })

    it('delete removes ata', async () => {
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ success: true })
      await atasService.delete(2)
      expect(deleteSpy).toHaveBeenCalledWith('/api/atas/2')
    })

    it('getStats fetches ata stats', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await atasService.getStats()
      expect(getSpy).toHaveBeenCalledWith('/api/atas/stats')
    })

    it('publish archives and approves atas', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await atasService.publish(3)
      await atasService.archive(3)
      await atasService.approve(3)
      expect(postSpy).toHaveBeenCalledWith('/api/atas/3/publish')
      expect(postSpy).toHaveBeenCalledWith('/api/atas/3/archive')
      expect(postSpy).toHaveBeenCalledWith('/api/atas/3/approve')
    })

    it('exportPdf requests ata blob', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue(new Blob(['x']))
      await atasService.exportPdf(3)
      expect(getSpy).toHaveBeenCalledWith('/api/atas/3/export/pdf', { responseType: 'blob' })
    })

    it('participants endpoints update participants', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true, data: [] })
      const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ success: true })
      await atasService.getParticipants(3)
      await atasService.updateParticipants(3, [])
      expect(getSpy).toHaveBeenCalledWith('/api/atas/3/participants')
      expect(putSpy).toHaveBeenCalledWith('/api/atas/3/participants', { participants: [] })
    })
  })

  describe('adminService', () => {
    it('getStats maps date params', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminService.getStats({ from: '2024-01-01', to: '2024-01-31' })
      expect(getSpy).toHaveBeenCalledWith('/api/admin/stats', {
        params: { dateFrom: '2024-01-01', dateTo: '2024-01-31' },
      })
    })

    it('getTrends fetches trends', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminService.getTrends('30d')
      expect(getSpy).toHaveBeenCalledWith('/api/admin/stats/trends', { params: { period: '30d' } })
    })

    it('getConversations fetches admin conversations', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminService.getConversations({ page: 1 })
      expect(getSpy).toHaveBeenCalledWith('/api/admin/conversations', { params: { page: 1 } })
    })

    it('getConversation fetches conversation details', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminService.getConversation('c1')
      expect(getSpy).toHaveBeenCalledWith('/api/admin/conversations/c1')
    })

    it('deleteConversation removes conversation', async () => {
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ success: true })
      await adminService.deleteConversation('c1')
      expect(deleteSpy).toHaveBeenCalledWith('/api/admin/conversations/c1')
    })

    it('flagConversation posts flag payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await adminService.flagConversation('c1', { flagType: 'ml', notes: 'Flagged for review' })
      expect(postSpy).toHaveBeenCalledWith('/api/admin/conversations/c1/flag', { flagType: 'ml', notes: 'Flagged for review' })
    })

    it('exportConversations requests export', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue(new Blob(['x']))
      await adminService.exportConversations({ userId: 'u1' }, 'csv')
      expect(getSpy).toHaveBeenCalledWith('/api/admin/conversations/export', {
        params: { userId: 'u1', format: 'csv' },
        responseType: 'blob',
      })
    })

    it('getUsers fetches users list', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminService.getUsers()
      expect(getSpy).toHaveBeenCalledWith('/api/admin/users')
    })

    it('getHealthStatus fetches health status', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminService.getHealthStatus()
      expect(getSpy).toHaveBeenCalledWith('/api/admin/health/status')
    })

    it('getHealthHistory fetches history', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminService.getHealthHistory(5)
      expect(getSpy).toHaveBeenCalledWith('/api/admin/health/history', { params: { limit: 5 } })
    })

    it('checkIsAdmin resolves true on success', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      const result = await adminService.checkIsAdmin()
      expect(result).toBe(true)
      expect(getSpy).toHaveBeenCalledWith('/api/admin/stats')
    })

    it('checkIsAdmin resolves false on failure', async () => {
      vi.spyOn(api, 'get').mockRejectedValue(new Error('fail'))
      const result = await adminService.checkIsAdmin()
      expect(result).toBe(false)
    })
  })

  describe('adminIntelligenceService', () => {
    it('getOverview fetches overview', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminIntelligenceService.getOverview('7d')
      expect(getSpy).toHaveBeenCalledWith('/api/admin/intelligence/overview', { params: { period: '7d' } })
    })

    it('getTopQuestions fetches top questions', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminIntelligenceService.getTopQuestions('30d', 5)
      expect(getSpy).toHaveBeenCalledWith('/api/admin/intelligence/top-questions', {
        params: { period: '30d', limit: 5 },
      })
    })

    it('getConfusionRate fetches confusion rate', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminIntelligenceService.getConfusionRate('90d')
      expect(getSpy).toHaveBeenCalledWith('/api/admin/intelligence/confusion-rate', { params: { period: '90d' } })
    })

    it('getSentimentTrends fetches sentiment trends', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminIntelligenceService.getSentimentTrends('30d')
      expect(getSpy).toHaveBeenCalledWith('/api/admin/intelligence/sentiment-trends', { params: { period: '30d' } })
    })

    it('getIntentDistribution fetches intent distribution', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminIntelligenceService.getIntentDistribution('30d')
      expect(getSpy).toHaveBeenCalledWith('/api/admin/intelligence/intent-distribution', { params: { period: '30d' } })
    })

    it('triggerReprocess posts reprocess request', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await adminIntelligenceService.triggerReprocess()
      expect(postSpy).toHaveBeenCalledWith('/api/admin/intelligence/reprocess')
    })
  })

  describe('adminDataAnalystService', () => {
    it('query posts question payload', async () => {
      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ success: true })
      await adminDataAnalystService.query({ query: 'Total por mes' })
      expect(postSpy).toHaveBeenCalledWith('/api/admin/data-analyst/query', { question: 'Total por mes' })
    })

    it('getHistory fetches query history', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminDataAnalystService.getHistory({ page: 1 })
      expect(getSpy).toHaveBeenCalledWith('/api/admin/data-analyst/history', { params: { page: 1 } })
    })

    it('getQuery fetches query by id', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminDataAnalystService.getQuery('q1')
      expect(getSpy).toHaveBeenCalledWith('/api/admin/data-analyst/history/q1')
    })

    it('updateQuery patches favorite and title', async () => {
      const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ success: true })
      await adminDataAnalystService.updateQuery('q1', { isFavorite: true, title: 'Titulo' })
      expect(patchSpy).toHaveBeenCalledWith('/api/admin/data-analyst/history/q1', {
        is_favorite: true,
        title: 'Titulo',
      })
    })

    it('deleteQuery removes query', async () => {
      const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ success: true })
      await adminDataAnalystService.deleteQuery('q1')
      expect(deleteSpy).toHaveBeenCalledWith('/api/admin/data-analyst/history/q1')
    })

    it('getSuggestions fetches suggestions', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ success: true })
      await adminDataAnalystService.getSuggestions()
      expect(getSpy).toHaveBeenCalledWith('/api/admin/data-analyst/suggestions')
    })

    it('exportQuery requests export format', async () => {
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue(new Blob(['x']))
      await adminDataAnalystService.exportQuery('q1', 'xlsx')
      expect(getSpy).toHaveBeenCalledWith('/api/admin/data-analyst/queries/q1/export', {
        params: { format: 'xlsx' },
        responseType: 'blob',
      })
    })
  })
})
