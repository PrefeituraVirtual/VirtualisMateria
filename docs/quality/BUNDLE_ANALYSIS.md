# Bundle Analysis Guide - Materia Virtualis Frontend

This document explains how to analyze and optimize the frontend bundle for the Materia Virtualis application.

## Quick Start

```bash
cd frontend

# Interactive visual analysis (opens browser)
npm run analyze

# CLI-based analysis with statistics
npm run build:stats
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run analyze` | Build with visual bundle analyzer (opens in browser) |
| `npm run analyze:server` | Analyze server-side bundle only |
| `npm run analyze:browser` | Analyze client-side bundle only |
| `npm run build:stats` | Build and generate CLI statistics report |

## Understanding the Bundle Analyzer

When you run `npm run analyze`, the build will complete and automatically open two interactive treemap visualizations in your browser:

1. **Client Bundle** (`client.html`) - JavaScript sent to the browser
2. **Server Bundle** (`server.html`) - Code executed on the server

### Reading the Treemap

- **Box Size**: Larger boxes represent larger file sizes
- **Colors**: Different colors represent different modules/packages
- **Hierarchy**: Nested boxes show dependency relationships
- **Hover**: Mouse over any box to see:
  - Parsed size (actual JS size)
  - Gzipped size (compressed size for transfer)
  - Path to the module

### Key Areas to Investigate

1. **node_modules** - Third-party dependencies
2. **src/components** - Application components
3. **pages** - Page-specific code

## Performance Targets

Based on the project requirements (CLAUDE.md):

| Metric | Target | Description |
|--------|--------|-------------|
| Initial Bundle | < 1MB | Total JavaScript loaded on first page |
| Largest Chunk | < 500KB | No single chunk should exceed this |
| Frontend Bundle | < 1MB | Overall bundle size target |

## Common Optimization Strategies

### 1. Code Splitting (Already Configured)

The project already has code splitting configured in `next.config.js`:

```javascript
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    syncfusion: { ... },  // Syncfusion in separate chunk
    recharts: { ... },     // Charts library isolated
    lucide: { ... },       // Icons isolated
    framerMotion: { ... }, // Animation library isolated
    commons: { ... },      // Shared code
  }
}
```

### 2. Dynamic Imports

For large components that are not needed immediately:

```typescript
// Instead of:
import { HeavyComponent } from '@/components/HeavyComponent';

// Use:
import dynamic from 'next/dynamic';
const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // Optional: disable server-side rendering
});
```

### 3. Tree Shaking

Already configured with `optimizePackageImports` in `next.config.js`:

```javascript
optimizePackageImports: ['lucide-react', 'recharts', '@syncfusion/ej2-react-documenteditor']
```

### 4. Selective Imports

Import only what you need:

```typescript
// Bad - imports entire library
import * as Icons from 'lucide-react';

// Good - imports only used icons
import { Search, Menu, X } from 'lucide-react';
```

## Interpreting Build Stats Output

When running `npm run build:stats`, the output includes:

```
=== JavaScript Chunks (Top 20 by size) ===
512K    .next/static/chunks/syncfusion-xxx.js
256K    .next/static/chunks/recharts-xxx.js
...

=== Large Chunks Warning (>500KB) ===
No chunks exceed 500KB - Good!
```

### Warning Indicators

- **Red flags**: Any chunk > 500KB
- **Yellow flags**: Multiple chunks > 300KB
- **Green**: All chunks < 300KB

## Monitoring Bundle Size in CI/CD

For continuous monitoring, add to your CI pipeline:

```yaml
# In .github/workflows/build.yml
- name: Build and check bundle size
  run: |
    cd frontend
    npm run build
    # Check if any chunk exceeds 500KB
    if find .next/static/chunks -name "*.js" -size +500k | grep -q .; then
      echo "WARNING: Large chunks detected!"
      find .next/static/chunks -name "*.js" -size +500k -exec ls -lh {} \;
      exit 1
    fi
```

## Troubleshooting

### Bundle analyzer not opening

If the browser doesn't open automatically:

1. Check the `.next/analyze/` directory for generated HTML files
2. Open them manually: `open .next/analyze/client.html`

### Build fails with ANALYZE=true

Ensure you have the correct dependencies:

```bash
npm install --save-dev @next/bundle-analyzer
```

### Large vendor chunks

If vendor chunks are too large:

1. Check for duplicate dependencies
2. Consider replacing heavy libraries with lighter alternatives
3. Use dynamic imports for rarely-used features

## Key Libraries to Watch

| Library | Typical Size | Notes |
|---------|--------------|-------|
| @syncfusion/* | ~2-5MB | DocumentEditor is large; lazy load when possible |
| recharts | ~500KB | Charts; already in separate chunk |
| framer-motion | ~150KB | Animation; use CSS transitions where possible |
| lucide-react | ~50KB | Icons; tree-shakeable |
| date-fns | ~30KB | Date utils; tree-shakeable |

## Reports Directory

Analysis reports are generated in:

- **Interactive**: `.next/analyze/client.html` and `.next/analyze/server.html`
- **Build log**: `frontend/build-output.log` (when using `build:stats`)

## Further Reading

- [Next.js Bundle Analysis](https://nextjs.org/docs/pages/building-your-application/optimizing/bundle-analyzer)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Web Vitals](https://web.dev/vitals/)
