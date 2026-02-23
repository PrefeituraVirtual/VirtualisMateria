import React from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

type StructuredData = Record<string, unknown> | Array<Record<string, unknown>>

interface SEOHeadProps {
  title: string
  description?: string
  canonical?: string
  ogImage?: string
  ogType?: string
  structuredData?: StructuredData
  noindex?: boolean
}

const SITE_NAME = 'Materia Virtualis'
const DEFAULT_OG_TYPE = 'website'
const DEFAULT_OG_IMAGE = '/logo/LOGOTIPO.png'

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)

const normalizePath = (path: string, trailingSlash: boolean) => {
  const cleaned = path.split('?')[0].split('#')[0] || '/'
  const withSlash = cleaned.startsWith('/') ? cleaned : `/${cleaned}`

  if (withSlash === '/') return '/'

  if (trailingSlash) {
    return withSlash.endsWith('/') ? withSlash : `${withSlash}/`
  }

  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
}

export function SEOHead({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = DEFAULT_OG_TYPE,
  structuredData,
  noindex = false,
}: SEOHeadProps) {
  const router = useRouter()
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://seu-dominio.com.br').replace(/\/+$/, '')
  const isStaticExport = process.env.NEXT_PUBLIC_BUILD_MODE === 'static'

  const getCanonicalFromRouter = () => {
    const asPath = router.asPath || '/'
    const [rawPath, rawQuery] = asPath.split('?')
    const normalizedPath = normalizePath(rawPath || '/', isStaticExport)

    if (!rawQuery) return normalizedPath

    const queryString = rawQuery.split('#')[0]
    const params = new URLSearchParams(queryString)
    const pageParam = params.get('page')

    if (pageParam && pageParam !== '1') {
      return `${normalizedPath}?page=${pageParam}`
    }

    return normalizedPath
  }

  const resolveCanonicalUrl = (value: string) => {
    if (isAbsoluteUrl(value)) return value
    const normalized = normalizePath(value, isStaticExport)
    return `${baseUrl}${normalized}`
  }

  const resolveAssetUrl = (value: string) => {
    if (isAbsoluteUrl(value)) return value
    const withSlash = value.startsWith('/') ? value : `/${value}`
    return `${baseUrl}${withSlash}`
  }

  const canonicalUrl = canonical ? resolveCanonicalUrl(canonical) : `${baseUrl}${getCanonicalFromRouter()}`
  const resolvedTitle = `${title} | ${SITE_NAME}`
  const resolvedOgImage = ogImage ? resolveAssetUrl(ogImage) : undefined
  const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow'
  const structuredDataJson = structuredData ? JSON.stringify(structuredData) : null

  return (
    <Head>
      <title>{resolvedTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={resolvedTitle} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      {resolvedOgImage ? <meta property="og:image" content={resolvedOgImage} /> : null}

      <meta name="twitter:title" content={resolvedTitle} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {resolvedOgImage ? <meta name="twitter:image" content={resolvedOgImage} /> : null}

      {structuredDataJson ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataJson }}
        />
      ) : null}
    </Head>
  )
}
