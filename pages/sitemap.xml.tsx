import type { GetStaticProps } from 'next'

type SitemapEntry = {
  loc: string
  lastmod?: string
  changefreq: 'daily' | 'weekly' | 'monthly'
  priority: string
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const buildUrlEntry = ({ loc, lastmod, changefreq, priority }: SitemapEntry) => {
  const parts = [
    '<url>',
    `  <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `  <lastmod>${lastmod}</lastmod>` : null,
    `  <changefreq>${changefreq}</changefreq>`,
    `  <priority>${priority}</priority>`,
    '</url>',
  ].filter(Boolean)

  return parts.join('\n')
}

const Sitemap = () => null

export const getStaticProps: GetStaticProps = async () => {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://seu-dominio.com.br').replace(/\/+$/, '')
  const today = new Date().toISOString().split('T')[0]

  const staticEntries: SitemapEntry[] = [
    { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: `${baseUrl}/chatbot`, changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${baseUrl}/materias`, changefreq: 'weekly', priority: '0.8', lastmod: today },
    { loc: `${baseUrl}/biblioteca`, changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${baseUrl}/agenda`, changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${baseUrl}/atas`, changefreq: 'monthly', priority: '0.6', lastmod: today },
    { loc: `${baseUrl}/transcricao`, changefreq: 'monthly', priority: '0.6', lastmod: today },
  ]

  const urlset = staticEntries.map(buildUrlEntry).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Gerado automaticamente pelo Materia Virtualis -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urlset}\n` +
    `</urlset>`

  return { props: { xml } }
}

export default Sitemap
