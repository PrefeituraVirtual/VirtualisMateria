import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { FileText, BarChart3, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { atasService } from '@/lib/api'
import { AtaFilters, AtasList, AtaViewer, AtaStats } from '@/components/atas'
import toast from 'react-hot-toast'
import {
  Ata,
  AtaSummary,
  AtaFiltersType,
  AtaPagination,
  AtaStatsType,
  ATA_STATUSES
} from '@/types/ata'

/**
 * AtasPage Component
 *
 * Main page for managing legislative session minutes (atas).
 * Features:
 * - List view with filtering by date, type, and status
 * - Search functionality
 * - Pagination
 * - Detail view modal
 * - Statistics dashboard
 */
export default function AtasPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [atas, setAtas] = useState<AtaSummary[]>([])
  const [stats, setStats] = useState<AtaStatsType | null>(null)
  const [selectedAta, setSelectedAta] = useState<Ata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [showStats, setShowStats] = useState(true)

  // Filters and Pagination
  const [filters, setFilters] = useState<AtaFiltersType>({
    search: '',
    sessionType: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    year: undefined
  })
  const [pagination, setPagination] = useState<AtaPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Fetch Atas
  const fetchAtas = useCallback(async (page: number = 1) => {
    setIsLoading(true)
    try {
      const response = await atasService.getAll({
        page,
        limit: pagination.limit,
        search: filters.search || undefined,
        sessionType: filters.sessionType !== 'all' ? filters.sessionType : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        year: filters.year
      })

      if (response && response.data) {
        setAtas(response.data)
        setPagination(response.pagination || {
          page,
          limit: 10,
          total: response.data.length,
          totalPages: Math.ceil(response.data.length / 10)
        })
      } else {
        setAtas([])
        setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 })
      }
    } catch (error) {
      console.error('Error fetching atas:', error)
      toast.error('Erro ao carregar atas. Verifique sua conexão.')
      setAtas([])
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 })
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.limit])

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const response = await atasService.getStats()
      if (response && response.data) {
        setStats(response.data)
      } else {
        setStats(null)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(null)
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchAtas()
      fetchStats()
    }
  }, [user, fetchAtas, fetchStats])

  // Handlers
  const handleSearch = () => {
    fetchAtas(1)
  }

  const handleClearFilters = () => {
    setFilters({
      search: '',
      sessionType: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      year: undefined
    })
    fetchAtas(1)
  }

  const handlePageChange = (page: number) => {
    fetchAtas(page)
  }

  const handleViewAta = async (ata: AtaSummary) => {
    setIsLoadingDetail(true)
    setIsViewerOpen(true)

    try {
      const response = await atasService.get(ata.id)
      if (response && response.data) {
        setSelectedAta(response.data)
      } else {
        toast.error('Ata não encontrada')
        setIsViewerOpen(false)
      }
    } catch (error) {
      console.error('Error fetching ata detail:', error)
      toast.error('Erro ao carregar detalhes da ata')
      setIsViewerOpen(false)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleCloseViewer = () => {
    setIsViewerOpen(false)
    setSelectedAta(null)
  }

  const handleExportPdf = async (ata: Ata) => {
    try {
      toast.loading('Gerando PDF...')
      const response = await atasService.exportPdf(ata.id)

      // Create download link
      const blob = new Blob([response], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ata_${ata.sessionNumber}_${ata.sessionDate}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.dismiss()
      toast.success('PDF gerado com sucesso!')
    } catch {
      toast.dismiss()
      toast.error('Exportacao de PDF nao disponivel no momento')
    }
  }

  // Auth loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-virtualis-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <SEOHead
        title="Atas de Sessão"
        description="Consulte atas de sessões plenárias e comissões"
      />

      <MainLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-7xl mx-auto space-y-6 pb-8"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="h-7 w-7 text-virtualis-blue-600" />
                Atas de Sessao
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Consulte e gerencie as atas das sessoes legislativas
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowStats(!showStats)}
                className={showStats ? 'bg-gray-100 dark:bg-gray-800' : ''}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showStats ? 'Ocultar' : 'Mostrar'} Estatisticas
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  fetchAtas()
                  fetchStats()
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Stats Section */}
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AtaStats stats={stats} isLoading={isLoadingStats} />
            </motion.div>
          )}

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filters.status === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setFilters({ ...filters, status: 'all' })
                fetchAtas(1)
              }}
            >
              Todas
            </Button>
            {Object.entries(ATA_STATUSES).map(([key, config]) => (
              <Button
                key={key}
                variant={filters.status === key ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilters({ ...filters, status: key as any })
                  fetchAtas(1)
                }}
              >
                {config.label}
              </Button>
            ))}
          </div>

          {/* Filters */}
          <AtaFilters
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={handleSearch}
            onClear={handleClearFilters}
            isLoading={isLoading}
          />

          {/* Atas List */}
          <AtasList
            atas={atas}
            pagination={pagination}
            isLoading={isLoading}
            onView={handleViewAta}
            onPageChange={handlePageChange}
          />
        </motion.div>
      </MainLayout>

      {/* Ata Viewer Modal */}
      <AtaViewer
        ata={selectedAta}
        isOpen={isViewerOpen}
        isLoading={isLoadingDetail}
        onClose={handleCloseViewer}
        onExportPdf={handleExportPdf}
      />
    </>
  )
}
