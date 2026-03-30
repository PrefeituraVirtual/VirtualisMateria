import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription as _CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Edit } from 'lucide-react'
import { materiasService } from '@/lib/api'
import toast from 'react-hot-toast'
import { MATERIA_TYPES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Materia } from '@/types/api'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Em elaboração',
  em_tramitacao: 'Em tramitação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

const toDateString = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString().split('T')[0]
}

const stripEmptyValues = (data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== ''))

const generateMateriaStructuredData = (materia: Materia, tipoLabel: string, baseUrl: string) => {
  const legislativeStatus = STATUS_LABELS[materia.status] || materia.status
  const serviceData = stripEmptyValues({
    '@type': ['GovernmentService', 'LegislativeProposal'],
    name: materia.ementa,
    description: materia.assunto || materia.ementa,
    provider: {
      '@type': 'GovernmentOrganization',
      name: 'Câmara Municipal',
    },
    legislativeStatus,
    dateCreated: toDateString(materia.created_at),
    author: materia.author_name
      ? {
          '@type': 'Person',
          name: materia.author_name,
        }
      : undefined,
  })

  const breadcrumbData = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Matérias',
        item: `${baseUrl}/materias`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tipoLabel,
        item: `${baseUrl}/materias?tipo=${materia.tipo}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: String(materia.id),
        item: `${baseUrl}/materias/${materia.id}`,
      },
    ],
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [serviceData, breadcrumbData],
  }
}

export default function VerMateriaPage() {
  const router = useRouter()
  const { id } = router.query
  const [isLoading, setIsLoading] = useState(true)
  const [materia, setMateria] = useState<Materia | null>(null)

  const loadMateria = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await materiasService.get(id as string)
      setMateria(data)
    } catch (error) {
      console.error('Error loading materia:', error)
      toast.error('Erro ao carregar matéria')
      router.push('/materias')
    } finally {
      setIsLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    if (id) {
      loadMateria()
    }
  }, [id, loadMateria])

  const getStatusBadge = (status: string) => {
    const statusMap: any = {
      PROT: { label: 'Protocolado', variant: 'info' },
      draft: { label: 'Rascunho', variant: 'default' },
      em_tramitacao: { label: 'Em Tramitação', variant: 'info' },
      aprovado: { label: 'Aprovado', variant: 'success' },
      rejeitado: { label: 'Rejeitado', variant: 'error' },
      arquivado: { label: 'Arquivado', variant: 'warning' },
    }
    const config = statusMap[status] || statusMap.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <MainLayout>
         <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-virtualis-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  if (!materia) return null

  const tipoLabel = MATERIA_TYPES[materia.tipo as keyof typeof MATERIA_TYPES]?.label || materia.tipo
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://seu-dominio.com.br').replace(/\/+$/, '')
  const structuredData = generateMateriaStructuredData(materia, tipoLabel, baseUrl)

  return (
    <>
      <SEOHead
        title={`${tipoLabel} ${materia.id}`}
        description={materia.ementa}
        canonical={`/materias/${materia.id}`}
        structuredData={structuredData}
      />

      <MainLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <Link href="/materias">
              <Button variant="ghost" size="sm" className="pl-0">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Lista
              </Button>
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex flex-wrap items-center gap-2 sm:gap-3">
                {tipoLabel}
                <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full font-normal text-gray-600 dark:text-gray-400">
                  #{materia.id}
                </span>
                {getStatusBadge(materia.status)}
              </h1>
              <Link href={`/materias/${materia.id}/editar`}>
                <Button variant="primary" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Texto do Documento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <h3 className="font-bold text-lg mb-2">{materia.ementa}</h3>
                    <div className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300 font-mono text-xs sm:text-sm bg-gray-50 dark:bg-gray-900/50 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto">
                      {materia.texto_original || 'Nenhum texto disponível.'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Metadata */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Assunto</span>
                    <p className="text-gray-900 dark:text-gray-100">{materia.assunto || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Criado em</span>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(materia.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Chave de Recibo</span>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded select-all">
                      {materia.chave_recibo}
                    </code>
                  </div>
                  {materia.observacao && (
                    <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Observações</span>
                        <p className="text-gray-900 dark:text-gray-100 text-sm mt-1">{materia.observacao}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  )
}
