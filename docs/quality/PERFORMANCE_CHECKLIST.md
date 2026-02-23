# Performance Optimization Checklist

This document provides a comprehensive checklist for validating frontend performance optimizations in Materia Virtualis.

## Table of Contents

- [Bundle Size Targets](#bundle-size-targets)
- [How to Run Bundle Analysis](#how-to-run-bundle-analysis)
- [Lighthouse Target Scores](#lighthouse-target-scores)
- [Lazy Loading Verification](#lazy-loading-verification)
- [Memoization Verification](#memoization-verification)
- [Performance Testing Workflow](#performance-testing-workflow)
- [Common Performance Issues](#common-performance-issues)

---

## Bundle Size Targets

### Critical Bundle Limits

| Bundle Category | Max Size | Warning Threshold | Description |
|-----------------|----------|-------------------|-------------|
| main | 400 KB | 320 KB | Main application bundle |
| framework | 150 KB | 120 KB | React and core framework |
| webpack | 50 KB | 40 KB | Webpack runtime |
| recharts | 150 KB | 120 KB | Chart library (lazy loaded) |
| lucide | 100 KB | 80 KB | Icon library chunk |
| syncfusion | 500 KB | 400 KB | Document editor (lazy loaded) |
| framer-motion | 80 KB | 64 KB | Animation library |

### Total Size Limits

| Metric | Target | Maximum | Notes |
|--------|--------|---------|-------|
| First Load JS | < 700 KB | 850 KB | Initial JavaScript bundle |
| Total All Chunks | < 1.5 MB | 2 MB | All JavaScript combined |
| CSS (critical) | < 50 KB | 75 KB | Critical path CSS |

### Page-Specific Limits

| Page | Max JS | Target JS | Notes |
|------|--------|-----------|-------|
| chatbot | 100 KB | 70 KB | AI chat interface |
| analise | 80 KB | 60 KB | Analysis dashboard |
| index | 50 KB | 35 KB | Home/landing page |
| tramitacao | 80 KB | 60 KB | Workflow tracking |

---

## How to Run Bundle Analysis

### 1. Build Production Bundle

```bash
cd frontend
npm run build
```

### 2. Validate Bundle Sizes

```bash
# Basic validation
node scripts/validate-bundle-size.js

# Verbose output (shows all files)
node scripts/validate-bundle-size.js --verbose

# JSON output (for CI/CD)
node scripts/validate-bundle-size.js --json
```

### 3. Using Next.js Bundle Analyzer (Optional)

Add to `next.config.js` if not present:

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer(nextConfig)
```

Then run:

```bash
# Install analyzer if needed
npm install @next/bundle-analyzer --save-dev

# Run analysis
ANALYZE=true npm run build
```

This opens a visual bundle analyzer in your browser.

### 4. Check Build Output

After `npm run build`, check the console output for:

```
Route (pages)                              Size     First Load JS
...
+ First Load JS shared by all             XXX kB
```

Ensure "First Load JS shared by all" is under 850 KB.

---

## Lighthouse Target Scores

### Production Targets

| Metric | Target | Minimum | Priority |
|--------|--------|---------|----------|
| Performance | 90+ | 75 | Critical |
| Accessibility | 95+ | 90 | Critical |
| Best Practices | 95+ | 90 | High |
| SEO | 90+ | 80 | Medium |

### Core Web Vitals Targets

| Metric | Target | Maximum | Description |
|--------|--------|---------|-------------|
| LCP (Largest Contentful Paint) | < 2.0s | 2.5s | Main content visible |
| FID (First Input Delay) | < 50ms | 100ms | Time to interactivity |
| CLS (Cumulative Layout Shift) | < 0.05 | 0.1 | Visual stability |
| FCP (First Contentful Paint) | < 1.5s | 1.8s | First paint |
| TTI (Time to Interactive) | < 3.0s | 3.8s | Fully interactive |

### Running Lighthouse

#### Using Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Performance" category
4. Choose "Mobile" or "Desktop"
5. Click "Analyze page load"

#### Using Lighthouse CLI

```bash
# Install globally
npm install -g lighthouse

# Run against local dev server
lighthouse http://localhost:4001/chatbot --view

# Run with specific config
lighthouse http://localhost:4001/chatbot \
  --output=json \
  --output-path=./lighthouse-report.json
```

#### Using Playwright for Automated Testing

```typescript
// In your E2E tests
test('chatbot page meets performance targets', async ({ page }) => {
  await page.goto('/chatbot')

  // Check that page loads within target
  const metrics = await page.evaluate(() => JSON.stringify(performance.timing))
  const timing = JSON.parse(metrics)

  const loadTime = timing.loadEventEnd - timing.navigationStart
  expect(loadTime).toBeLessThan(3000) // 3 seconds max
})
```

---

## Lazy Loading Verification

### Verifying Dynamic Imports Work

#### 1. Check Network Tab

1. Open Chrome DevTools > Network tab
2. Navigate to the page
3. Look for chunks loading on-demand (not initially)

Expected behavior:
- Heavy libraries (recharts, syncfusion) should NOT load on initial page load
- Chunks should load when the component is first rendered

#### 2. Verify Code Splitting in Build Output

After `npm run build`, check for these chunks:

```
.next/static/chunks/
  - recharts-*.js (should exist as separate chunk)
  - lucide-*.js (should exist as separate chunk)
  - pages/chatbot-*.js (page-specific code)
```

#### 3. Test Lazy Loading Manually

```javascript
// In browser console on chatbot page:
// Check if recharts is initially loaded
console.log('Recharts loaded:', !!window.__RECHARTS__)

// Navigate to a page with charts
// Then check again - it should be loaded now
```

#### 4. Automated Verification

```typescript
// Test file: __tests__/performance/lazy-loading.test.ts
import { test, expect } from '@playwright/test'

test('recharts chunks load only when needed', async ({ page }) => {
  // Start monitoring network requests
  const rechartsRequests: string[] = []

  page.on('request', (request) => {
    if (request.url().includes('recharts')) {
      rechartsRequests.push(request.url())
    }
  })

  // Load home page (should NOT load recharts)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  expect(rechartsRequests.length).toBe(0)

  // Navigate to page with charts
  await page.goto('/painel')
  await page.waitForLoadState('networkidle')

  // Now recharts should be loaded
  expect(rechartsRequests.length).toBeGreaterThan(0)
})
```

### Components That Should Be Lazy Loaded

| Component | When to Load | Trigger |
|-----------|--------------|---------|
| DocumentEditor (Syncfusion) | On /materias/criar | User navigates to create page |
| Charts (Recharts) | On /painel, /admin | User views dashboard |
| RichTextEditor | On /atas editing | User clicks edit |
| AI Analysis Modal | On /analise | User opens analysis |

---

## Memoization Verification

### Testing Memoized Components

#### 1. React DevTools Profiler

1. Install React DevTools extension
2. Open React DevTools > Profiler tab
3. Click "Start profiling"
4. Interact with the page
5. Click "Stop profiling"
6. Check for unnecessary re-renders

#### 2. Using React.memo Effectively

```typescript
// Good: Memoized with proper comparison
const MyComponent = React.memo(function MyComponent({ data, onClick }) {
  return <div onClick={onClick}>{data.name}</div>
}, (prevProps, nextProps) => {
  return prevProps.data.id === nextProps.data.id
})

// Check: Does component re-render when parent updates?
// Use React DevTools "Highlight updates" feature
```

#### 3. Testing useMemo and useCallback

```typescript
// In test file
describe('useMemo optimization', () => {
  it('should not recompute expensive value on unrelated state change', () => {
    const computeFn = vi.fn(() => 'computed')

    function TestComponent() {
      const [count, setCount] = useState(0)
      const [stable] = useState('stable')

      const computed = useMemo(() => computeFn(stable), [stable])

      return (
        <div>
          <button onClick={() => setCount(c => c + 1)}>
            Count: {count}
          </button>
          <span>{computed}</span>
        </div>
      )
    }

    render(<TestComponent />)

    // Initial computation
    expect(computeFn).toHaveBeenCalledTimes(1)

    // Click button (should NOT recompute)
    fireEvent.click(screen.getByRole('button'))

    // Still only called once
    expect(computeFn).toHaveBeenCalledTimes(1)
  })
})
```

### Components with Memoization

| Component | Memoization Type | Purpose |
|-----------|------------------|---------|
| LoadingFallback | useMemo for progress | Avoid recalculating progress |
| ChatMessage | React.memo | Prevent re-render on new messages |
| MateriaCard | React.memo | List optimization |
| SidebarItem | React.memo + useCallback | Navigation performance |

---

## Performance Testing Workflow

### Pre-Deployment Checklist

```bash
# 1. Run linter and type check
npm run lint
npm run type-check

# 2. Build production bundle
npm run build

# 3. Validate bundle sizes
node scripts/validate-bundle-size.js

# 4. Run unit tests
npm run test:run

# 5. Start production server
npm start

# 6. Run Lighthouse audit (separate terminal)
lighthouse http://localhost:4001/chatbot --view
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Check

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Build
        run: cd frontend && npm run build

      - name: Validate bundle size
        run: cd frontend && node scripts/validate-bundle-size.js

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install and build
        run: |
          cd frontend
          npm ci
          npm run build

      - name: Start server
        run: cd frontend && npm start &
        env:
          PORT: 4001

      - name: Wait for server
        run: npx wait-on http://localhost:4001

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:4001
            http://localhost:4001/chatbot
          budgetPath: ./frontend/lighthouse-budget.json
```

### Lighthouse Budget File

Create `frontend/lighthouse-budget.json`:

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      {
        "resourceType": "script",
        "budget": 850
      },
      {
        "resourceType": "total",
        "budget": 1500
      }
    ],
    "resourceCounts": [
      {
        "resourceType": "third-party",
        "budget": 10
      }
    ],
    "timings": [
      {
        "metric": "interactive",
        "budget": 3800
      },
      {
        "metric": "first-contentful-paint",
        "budget": 1800
      }
    ]
  }
]
```

---

## Common Performance Issues

### Issue: Large Initial Bundle

**Symptoms:**
- First Load JS > 850 KB
- Slow initial page load

**Solutions:**
1. Add dynamic imports for heavy libraries
2. Check for unintentional imports (barrel exports)
3. Use tree shaking properly

```typescript
// Bad: Imports entire library
import * as LucideIcons from 'lucide-react'

// Good: Import only what you need
import { Home, Settings, User } from 'lucide-react'
```

### Issue: Unnecessary Re-renders

**Symptoms:**
- Sluggish UI interactions
- React DevTools shows frequent updates

**Solutions:**
1. Use React.memo for list items
2. Use useCallback for event handlers
3. Use useMemo for expensive computations

### Issue: Layout Shift (High CLS)

**Symptoms:**
- Content jumps during load
- CLS score > 0.1

**Solutions:**
1. Set explicit dimensions on images
2. Reserve space for dynamic content
3. Use skeleton loaders

### Issue: Slow Time to Interactive

**Symptoms:**
- Page appears but is unresponsive
- TTI > 3.8s

**Solutions:**
1. Defer non-critical JavaScript
2. Use code splitting
3. Optimize third-party scripts

---

## Quick Reference Commands

```bash
# Build and validate
npm run build && node scripts/validate-bundle-size.js

# Verbose bundle analysis
node scripts/validate-bundle-size.js --verbose

# Run all tests
npm run test:run

# Type check
npm run type-check

# Lint
npm run lint

# Full performance check
npm run build && \
  node scripts/validate-bundle-size.js && \
  npm run test:run && \
  npm run type-check
```

---

## Monitoring Performance Over Time

Track these metrics across releases:

1. **Bundle Size Trend**: Should stay flat or decrease
2. **Lighthouse Scores**: Should stay above targets
3. **Core Web Vitals**: Monitor via Google Search Console
4. **User-Reported Issues**: Track performance complaints

Consider using tools like:
- [Bundlewatch](https://bundlewatch.io/) for automated size tracking
- [SpeedCurve](https://speedcurve.com/) for synthetic monitoring
- [Sentry Performance](https://sentry.io/for/performance/) for real user monitoring
