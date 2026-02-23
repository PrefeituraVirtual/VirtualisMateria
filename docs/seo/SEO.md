# SEO - Materia Virtualis

## Uso do componente SEOHead

Importe e utilize o componente em cada página para definir meta tags, Open Graph, Twitter Cards, canonical e JSON-LD.

```tsx
import { SEOHead } from '@/components/common/SEOHead'

<SEOHead
  title="Dashboard"
  description="Painel de controle do sistema legislativo"
  canonical="/"
  ogImage="/logo/LOGOTIPO.png"
/>
```

### Props disponíveis

- `title` (obrigatório): título da página (template automático: `"{title} | Materia Virtualis"`).
- `description`: descrição da página (meta description, OG e Twitter).
- `canonical`: URL canônica relativa (`/rota`) ou absoluta.
- `ogImage`: imagem para compartilhamento (URL relativa ou absoluta).
- `ogType`: tipo Open Graph (ex: `website`, `article`).
- `structuredData`: objeto ou array JSON-LD.
- `noindex`: quando `true`, adiciona `noindex, nofollow`.

## Padrões de títulos e descrições

- Use títulos diretos e específicos do conteúdo principal.
- Mantenha descrições com foco no benefício e propósito da página.
- Evite duplicar o nome do produto no `title` (o template já adiciona).

## Structured Data (JSON-LD)

Para páginas com dados legislativos, inclua JSON-LD via prop `structuredData`.

```tsx
const data = {
  '@context': 'https://schema.org',
  '@type': ['GovernmentService', 'LegislativeProposal'],
  name: materia.ementa,
  description: materia.assunto,
}

<SEOHead
  title={materia.ementa}
  description={materia.assunto}
  structuredData={data}
/>
```

## Como testar SEO

- Google Search Console
- Google Rich Results Test
- Schema.org Validator
- Open Graph Debugger (Facebook)

## Checklist para novas páginas

- Definir `title` e `description` com o SEOHead.
- Garantir canonical correto (por padrão é gerado automaticamente).
- Incluir `structuredData` quando houver dados estruturados.
- Usar `noindex` em páginas privadas (criação/edição/admin).
- Verificar OG e Twitter Cards em compartilhamento.

## Ferramentas úteis

- https://search.google.com/test/rich-results
- https://validator.schema.org/
- https://developers.facebook.com/tools/debug/
- https://www.opengraph.xyz/
