import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Palette, Database, Sun, Moon, Monitor, Check, Download, FileSpreadsheet, FileText, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { MainLayout } from '@/components/layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/lib/api'

export default function Configuracoes() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('appearance') // appearance, data

  // Wait for hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  const convertToCSV = (data: any[]) => {
    if (!data || data.length === 0) return ''
    
    // Get all unique keys from all objects (in case some objects define keys others don't)
    const allKeys = Array.from(new Set(data.flatMap(Object.keys)))
    
    const headers = allKeys.join(',')
    
    const rows = data.map(obj => 
      allKeys.map(key => {
        const val = obj[key]
        if (val === null || val === undefined) return ''
        const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
        // Escape quotes and wrap in quotes
        return `"${stringVal.replace(/"/g, '""')}"`
      }).join(',')
    ).join('\n')
    
    return `${headers}\n${rows}`
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleExportData = async (format: 'json' | 'csv-materias' | 'csv-documentos') => {
    try {
      if (!user) return
      
      const toastId = toast.loading('Gerando exportação...')
      
      // Fetch full data from backend
      const response = await authService.exportData()
      const exportData = response.data as { materias?: unknown[]; documents?: unknown[] }
      const materias = Array.isArray(exportData.materias) ? exportData.materias : []
      const documents = Array.isArray(exportData.documents) ? exportData.documents : []
      
      const dateStr = new Date().toISOString().split('T')[0]
      const prefix = `materia_virtualis_export_${user.council_member_id}_${dateStr}`

      if (format === 'json') {
        downloadFile(
          JSON.stringify(exportData, null, 2), 
          `${prefix}_full.json`, 
          'application/json'
        )
        toast.success('Backup completo (JSON) exportado!', { id: toastId })
      } else if (format === 'csv-materias') {
        if (materias.length > 0) {
          const csv = convertToCSV(materias)
          downloadFile(csv, `${prefix}_materias.csv`, 'text/csv')
          toast.success('Lista de Matérias (CSV) exportada!', { id: toastId })
        } else {
          toast.error('Nenhuma matéria encontrada para exportar.', { id: toastId })
        }
      } else if (format === 'csv-documentos') {
        if (documents.length > 0) {
          const csv = convertToCSV(documents)
          downloadFile(csv, `${prefix}_documentos.csv`, 'text/csv')
          toast.success('Meus Documentos (CSV) exportados!', { id: toastId })
        } else {
          toast.error('Nenhum documento encontrado para exportar.', { id: toastId })
        }
      }

    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Erro ao exportar dados')
    }
  }

  const handleClearCache = () => {
    try {
      // Limpar itens específicos do localStorage
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('doc-analysis-') || key.startsWith('analysis-'))) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key))
      toast.success(`${keysToRemove.length} itens de cache removidos!`)
    } catch (error) {
      console.error('Error clearing cache:', error)
      toast.error('Erro ao limpar cache')
    }
  }

  const savePreferences = async (newTheme: string) => {
    setTheme(newTheme)
    
    // Salvar no backend também
    if (user) {
      try {
        await authService.updatePreferences({ theme: newTheme })
      } catch (error) {
        console.error('Erro ao salvar preferência de tema no backend:', error)
      }
    }
  }

  if (!mounted) return null

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gerencie suas preferências e dados do sistema.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === 'appearance'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'}
              `}
            >
              <Palette className="h-4 w-4" />
              Aparência
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === 'data'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'}
              `}
            >
              <Database className="h-4 w-4" />
              Dados e Cache
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tema da Interface</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Light Mode */}
                  <button
                    onClick={() => savePreferences('light')}
                    className={`
                      relative flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${theme === 'light' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full">
                        <Sun className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">Claro</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Visual limpo e brilhante</p>
                      </div>
                    </div>
                    {theme === 'light' && <Check className="h-5 w-5 text-blue-500" />}
                  </button>

                  {/* Dark Mode */}
                  <button
                    onClick={() => savePreferences('dark')}
                    className={`
                      relative flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${theme === 'dark' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800 text-gray-200 rounded-full">
                        <Moon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">Escuro</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Confortável para uso noturno</p>
                      </div>
                    </div>
                    {theme === 'dark' && <Check className="h-5 w-5 text-blue-500" />}
                  </button>

                  {/* System Mode */}
                  <button
                    onClick={() => savePreferences('system')}
                    className={`
                      relative flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${theme === 'system' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 text-gray-600 rounded-full">
                        <Monitor className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">Sistema</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Segue a configuração do seu OS</p>
                      </div>
                    </div>
                    {theme === 'system' && <Check className="h-5 w-5 text-blue-500" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="space-y-8">
              {/* Export Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Seus Dados</h3>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                        <Download className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Exportação Completa</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Baixe todos os seus dados (Backup).
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExportData('json')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Exportar Backup (JSON)
                    </button>
                  </div>

                   <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex gap-4">
                      <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Relatórios em Planilha</h5>
                          <div className="flex gap-2">
                            <button
                                onClick={() => handleExportData('csv-materias')}
                                className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                Lista de Matérias (CSV)
                              </button>
                              <button
                                onClick={() => handleExportData('csv-documentos')}
                                className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <FileText className="h-4 w-4 text-blue-600" />
                                Meus Documentos (CSV)
                              </button>
                          </div>
                      </div>
                   </div>

                </div>
              </div>

              {/* Cache Section */}
              <div>
                <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-4">Zona de Perigo</h3>
                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-5 border border-red-200 dark:border-red-900/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                        <Trash2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Limpar Cache de Análises</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Remove todas as análises salvas localmente no navegador. Análises salvas no banco de dados não serão afetadas.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleClearCache}
                      className="px-4 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Limpar Cache
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
