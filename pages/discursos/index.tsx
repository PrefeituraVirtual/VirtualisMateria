import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useAuth } from '@/hooks/useAuth'
import { materiasService } from '@/lib/api'
import { getSecureItem } from '@/lib/secure-storage'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { Mic2, Loader2, Sparkles, Eye, Edit2, Save, Printer, Download, Copy } from 'lucide-react'
import axios from 'axios'

// Helper to simulate persistent progress updates
const useProgressSimulator = (isAnimating: boolean) => {
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Iniciando...')

  useEffect(() => {
    if (!isAnimating) {
      setProgress(0)
      return
    }

    const messages = [
      'Analisando o tema...', 
      'Consultando base legislativa...', 
      'Estruturando argumentos...', 
      'Refinando a retórica...', 
      'Polindo o texto final...'
    ]
    
    let currentMessageIndex = 0
    setStatusText(messages[0])

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95
        // Slower progress as it gets higher
        const increment = prev < 50 ? 5 : prev < 80 ? 2 : 0.5
        return prev + increment
      })
    }, 1000)

    const messageInterval = setInterval(() => {
      currentMessageIndex = (currentMessageIndex + 1) % messages.length
      setStatusText(messages[currentMessageIndex])
    }, 12000) // Change message every 12s (R1 is slow)

    return () => {
      clearInterval(interval)
      clearInterval(messageInterval)
    }
  }, [isAnimating])

  return { progress, statusText }
}

import { documentsService } from '@/lib/api'

export default function SpeechGenerator() {
  const router = useRouter()
  const { user: _user } = useAuth()
  const [activeTab, setActiveTab] = useState('saved')
  
  // Form State
  const [topic, setTopic] = useState('')
  const [selectedMatterId, setSelectedMatterId] = useState('')
  const [tone, setTone] = useState('Sério e Comprometido')
  const [audience, setAudience] = useState('Sessão Plenária')
  
  // Data State
  const [propositions, setPropositions] = useState<any[]>([])
  const [loadingProps, setLoadingProps] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  // Result State
  const [generatedSpeech, setGeneratedSpeech] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  // UI State
  const { progress, statusText } = useProgressSimulator(generating)

  // Fetch Propositions on load
  useEffect(() => {
    fetchPropositions()
  }, [])

  // Pre-select materia from query param (when coming from /materias)
  useEffect(() => {
    const { materiaId } = router.query

    if (materiaId && propositions.length > 0) {
      const exists = propositions.find(p => p.id.toString() === materiaId)
      if (exists) {
        setSelectedMatterId(materiaId as string)
        setActiveTab('saved')
      }
    }
  }, [router.query, propositions])

  const fetchPropositions = async () => {
    try {
      setLoadingProps(true)
      const response = await materiasService.getAll({ limit: 20 })
      if (response.success && Array.isArray(response.data)) {
        setPropositions(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch propositions', error)
      toast.error('Erro ao carregar matérias salvas')
    } finally {
      setLoadingProps(false)
    }
  }

  const handleGenerate = async () => {
    if (activeTab === 'custom' && !topic) {
      toast.error('Por favor, digite o tema do discurso.')
      return
    }
    if (activeTab === 'saved' && !selectedMatterId) {
      toast.error('Por favor, selecione uma matéria.')
      return
    }

    setGenerating(true)
    setGeneratedSpeech('')
    setIsEditing(false)

    try {
      let matterContent = null

      if (activeTab === 'saved') {
        const matter = propositions.find(p => p.id.toString() === selectedMatterId)
        if (matter) {
          matterContent = {
            title: `Projeto ${matter.numero}/${matter.ano}`,
            ementa: matter.ementa,
            content: matter.texto_original || matter.ementa 
          }
        }
      }

      const token = await getSecureItem<string>('authToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await axios.post(`${apiUrl}/api/speech/generate`, {
        topic: activeTab === 'custom' ? topic : undefined,
        matterContent,
        tone,
        audience
      }, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 300000 
      });

      if (response && response.data && response.data.content) {
        setGeneratedSpeech(response.data.content)
        toast.success('Discurso gerado com sucesso!', { icon: '🎙️' })
      }

    } catch (error) {
      console.error('Error generating speech:', error)
      toast.error('Erro ao gerar discurso. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveToDocuments = async () => {
    try {
        if (!generatedSpeech) return
        
        const title = activeTab === 'saved' 
           ? `Discurso - Matéria ID ${selectedMatterId}` 
           : `Discurso - ${topic.substring(0, 30)}...`
           
        await documentsService.create({
            title: title + ` (${new Date().toLocaleDateString()})`,
            content: generatedSpeech,
            type: 'speech'
        })
        
        toast.success('Discurso salvo em "Meus Documentos"!', { icon: '💾' })
    } catch (error) {
        console.error('Error saving document:', error)
        toast.error('Erro ao salvar documento.')
    }
  }

  const handleDownload = () => {
    const blob = new Blob([generatedSpeech], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `discurso-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Download iniciado!')
  }

  const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`
            <html>
                <head>
                    <title>Discurso - Materia Virtualis</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; font-size: 14pt; }
                        h1 { font-size: 18pt; text-align: center; margin-bottom: 30px; }
                    </style>
                </head>
                <body>
                    <h1>Discurso Parlamentar</h1>
                    ${generatedSpeech.replace(/\n/g, '<br/>')}
                    <script>window.print();</script>
                </body>
            </html>
          `);
          printWindow.document.close();
      }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedSpeech)
    toast.success('Copiado para a área de transferência!')
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-2">Gerador de Discursos (IA)</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Crie discursos impactantes para a tribuna usando a inteligência do DeepSeek R1.
                </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                 <Mic2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Discurso</CardTitle>
              <CardDescription>Defina os parâmetros para a IA escrever seu texto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="saved">Minhas Proposições</TabsTrigger>
                  <TabsTrigger value="custom">Tema Livre</TabsTrigger>
                </TabsList>
                
                <TabsContent value="saved" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Selecione a Matéria</Label>
                    <Select value={selectedMatterId} onValueChange={setSelectedMatterId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um projeto..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Selecione uma matéria da lista...</SelectItem>
                        {loadingProps ? (
                           <SelectItem value="loading" disabled>Carregando matérias...</SelectItem>
                        ) : propositions.length > 0 ? (
                           propositions.map((prop) => (
                             <SelectItem key={prop.id} value={prop.id.toString()}>
                               {prop.tipo} {prop.numero}/{prop.ano} - {prop.ementa?.substring(0, 50)}...
                             </SelectItem>
                           ))
                        ) : (
                            <SelectItem value="empty" disabled>Nenhuma matéria encontrada.</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Tema do Discurso</Label>
                    <Textarea 
                      id="topic" 
                      placeholder="Ex: Defesa da reforma de saúde, crítica ao veto do prefeito..." 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tom do Discurso</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sério e Comprometido">Sério e Comprometido</SelectItem>
                      <SelectItem value="Combativo e Enérgico">Combativo e Enérgico</SelectItem>
                      <SelectItem value="Emocional e Inspirador">Emocional e Inspirador</SelectItem>
                      <SelectItem value="Técnico e Didático">Técnico e Didático</SelectItem>
                      <SelectItem value="Conciliador">Conciliador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Público Alvo</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sessão Plenária">Sessão Plenária</SelectItem>
                      <SelectItem value="Base Eleitoral">Base Eleitoral</SelectItem>
                      <SelectItem value="Imprensa">Imprensa / Redes Sociais</SelectItem>
                      <SelectItem value="Comissão Técnica">Comissão Técnica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                    onClick={handleGenerate} 
                    className={`w-full h-14 relative overflow-hidden transition-all ${generating ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                    disabled={generating}
                >
                    {generating && (
                        <div 
                            className="absolute left-0 top-0 h-full bg-blue-500/50 transition-all duration-1000 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    )}
                    <div className="relative z-10 flex flex-col items-center justify-center">
                        {generating ? (
                            <>
                                <div className="flex items-center font-bold text-white">
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                                    {statusText}
                                </div>
                                <span className="text-xs opacity-80 mt-1 text-white">{Math.round(progress)}% Concluído</span>
                            </>
                        ) : (
                            <div className="flex items-center text-lg text-white">
                                <Sparkles className="mr-2 h-5 w-5" /> Gerar Discurso com IA
                            </div>
                        )}
                    </div>
                </Button>
                {generating && <p className="text-xs text-center text-gray-400">Isso pode levar até 2 minutos devido à profundidade da análise.</p>}
              </div>

            </CardContent>
          </Card>

          {/* Result Card */}
          <Card className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 rounded-t-lg">
                <div className="flex items-center justify-between">
                    <CardTitle>Discurso Gerado</CardTitle>
                    <div className="flex space-x-2">
                        {generatedSpeech && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} title={isEditing ? "Ver Preview" : "Editar Texto"}>
                                    {isEditing ? <Eye className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleSaveToDocuments} title="Salvar em Meus Documentos">
                                    <Save className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={handlePrint} title="Imprimir">
                                    <Printer className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleDownload} title="Baixar Arquivo">
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={copyToClipboard} title="Copiar">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative">
                {generatedSpeech ? (
                     isEditing ? (
                        <textarea 
                            className="w-full h-full p-6 resize-none focus:outline-none bg-white dark:bg-slate-950 dark:text-slate-100 font-mono text-sm leading-relaxed"
                            value={generatedSpeech}
                            onChange={(e) => setGeneratedSpeech(e.target.value)}
                        />
                     ) : (
                        <div className="p-6 overflow-y-auto h-full max-h-[600px] prose prose-slate max-w-none dark:prose-invert">
                            <ReactMarkdown>{generatedSpeech}</ReactMarkdown>
                        </div>
                     )
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 py-12">
                        <Mic2 className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-center max-w-xs">Configure os parâmetros e clique em "Gerar".<br/>A IA criará um texto exclusivo para sua fala na tribuna.</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
