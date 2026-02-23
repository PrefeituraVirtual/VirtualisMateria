#!/usr/bin/env node

/**
 * Bundle Size Validation Script
 *
 * This script validates that the production bundle sizes stay within acceptable limits.
 * Run after `npm run build` to check bundle sizes against defined thresholds.
 *
 * Usage:
 *   node scripts/validate-bundle-size.js
 *   node scripts/validate-bundle-size.js --verbose
 *   node scripts/validate-bundle-size.js --json
 *
 * Exit codes:
 *   0 - All bundle sizes within limits
 *   1 - One or more bundles exceed size limits
 *   2 - Build directory not found (run npm run build first)
 */

const fs = require('fs')
const path = require('path')

// Configuration
const BUILD_DIR = path.join(__dirname, '../.next')
const CHUNKS_DIR = path.join(BUILD_DIR, 'static/chunks')

// Size limits in bytes (adjust based on your performance requirements)
// Note: With code splitting, lazy loading, and complex libraries (Syncfusion, Recharts),
// total bundle size will be larger but users only download what they need
const MAX_SIZES = {
  // Main bundles
  'main': 500 * 1024,           // 500KB max for main bundle
  'framework': 200 * 1024,      // 200KB for framework (React, etc.)
  'webpack': 50 * 1024,         // 50KB for webpack runtime

  // Library chunks (after code splitting)
  'recharts': 200 * 1024,       // 200KB for recharts chunk
  'lucide': 150 * 1024,         // 150KB for lucide icons chunk
  'syncfusion': 600 * 1024,     // 600KB for Syncfusion (document editor)
  'framer-motion': 100 * 1024,  // 100KB for framer-motion
  'react-query': 60 * 1024,     // 60KB for TanStack Query
  'zustand': 15 * 1024,         // 15KB for Zustand
  'zod': 50 * 1024,             // 50KB for Zod

  // Page limits
  'page-chatbot': 150 * 1024,   // 150KB for chatbot page
  'page-analise': 100 * 1024,   // 100KB for analysis page
  'page-index': 80 * 1024,      // 80KB for home page

  // Total limits
  'total-first-load': 1 * 1024 * 1024,  // 1MB total for first load JS
  'total-all': 4 * 1024 * 1024,         // 4MB total for all chunks (lazy loaded)
}

// Warning threshold (percentage of max size)
const WARNING_THRESHOLD = 0.8 // Warn at 80% of max

// CLI arguments
const args = process.argv.slice(2)
const verbose = args.includes('--verbose') || args.includes('-v')
const jsonOutput = args.includes('--json')

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Get all JS files recursively from a directory
 */
function getJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files

  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      getJsFiles(fullPath, files)
    } else if (item.name.endsWith('.js')) {
      const stats = fs.statSync(fullPath)
      files.push({
        path: fullPath,
        name: item.name,
        size: stats.size,
        relativePath: path.relative(BUILD_DIR, fullPath),
      })
    }
  }
  return files
}

/**
 * Categorize a chunk by its name
 */
function categorizeChunk(fileName) {
  const lowerName = fileName.toLowerCase()

  // Main bundles
  if (lowerName.includes('main-')) return 'main'
  if (lowerName.includes('framework-')) return 'framework'
  if (lowerName.includes('webpack-')) return 'webpack'

  // Library chunks
  if (lowerName.includes('recharts')) return 'recharts'
  if (lowerName.includes('lucide')) return 'lucide'
  if (lowerName.includes('syncfusion') || lowerName.includes('ej2')) return 'syncfusion'
  if (lowerName.includes('framer-motion') || lowerName.includes('motion')) return 'framer-motion'
  if (lowerName.includes('react-query') || lowerName.includes('tanstack')) return 'react-query'
  if (lowerName.includes('zustand')) return 'zustand'
  if (lowerName.includes('zod')) return 'zod'

  // Pages
  if (lowerName.includes('chatbot')) return 'page-chatbot'
  if (lowerName.includes('analise')) return 'page-analise'
  if (lowerName.includes('index')) return 'page-index'

  return 'other'
}

/**
 * Main validation function
 */
function validateBundleSizes() {
  // Check if build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('Error: Build directory not found.')
    console.error('Please run "npm run build" first.')
    process.exit(2)
  }

  if (!fs.existsSync(CHUNKS_DIR)) {
    console.error('Error: Chunks directory not found.')
    console.error('Please run "npm run build" first.')
    process.exit(2)
  }

  // Get all JS files
  const allFiles = getJsFiles(CHUNKS_DIR)

  // Categorize and aggregate sizes
  const categories = {}
  let totalSize = 0
  let firstLoadSize = 0

  for (const file of allFiles) {
    const category = categorizeChunk(file.name)

    if (!categories[category]) {
      categories[category] = {
        files: [],
        totalSize: 0,
      }
    }

    categories[category].files.push(file)
    categories[category].totalSize += file.size
    totalSize += file.size

    // Estimate first-load size (main bundles + framework)
    if (['main', 'framework', 'webpack'].includes(category)) {
      firstLoadSize += file.size
    }
  }

  // Add totals as categories for validation
  categories['total-first-load'] = { totalSize: firstLoadSize, files: [] }
  categories['total-all'] = { totalSize: totalSize, files: [] }

  // Validate each category
  const results = {
    passed: [],
    warnings: [],
    failed: [],
    summary: {
      totalFiles: allFiles.length,
      totalSize: totalSize,
      firstLoadSize: firstLoadSize,
      categories: Object.keys(categories).length,
    },
  }

  for (const [category, data] of Object.entries(categories)) {
    const maxSize = MAX_SIZES[category]
    if (!maxSize) continue // Skip unconfigured categories

    const percentage = data.totalSize / maxSize
    const result = {
      category,
      size: data.totalSize,
      sizeFormatted: formatBytes(data.totalSize),
      maxSize: maxSize,
      maxSizeFormatted: formatBytes(maxSize),
      percentage: (percentage * 100).toFixed(1),
      fileCount: data.files.length,
    }

    if (percentage > 1) {
      results.failed.push(result)
    } else if (percentage > WARNING_THRESHOLD) {
      results.warnings.push(result)
    } else {
      results.passed.push(result)
    }
  }

  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    printResults(results, categories)
  }

  // Exit with appropriate code
  if (results.failed.length > 0) {
    process.exit(1)
  }
  process.exit(0)
}

/**
 * Print formatted results to console
 */
function printResults(results, categories) {
  console.log('\n========================================')
  console.log('   Bundle Size Validation Report')
  console.log('========================================\n')

  console.log(`Total Files: ${results.summary.totalFiles}`)
  console.log(`Total Size: ${formatBytes(results.summary.totalSize)}`)
  console.log(`First Load JS: ${formatBytes(results.summary.firstLoadSize)}`)
  console.log('')

  // Failed
  if (results.failed.length > 0) {
    console.log('FAILED (exceeds limit):')
    console.log('------------------------')
    for (const r of results.failed) {
      console.log(`  [X] ${r.category}`)
      console.log(`      Size: ${r.sizeFormatted} / ${r.maxSizeFormatted} (${r.percentage}%)`)
      console.log(`      Files: ${r.fileCount}`)
    }
    console.log('')
  }

  // Warnings
  if (results.warnings.length > 0) {
    console.log('WARNINGS (approaching limit):')
    console.log('-----------------------------')
    for (const r of results.warnings) {
      console.log(`  [!] ${r.category}`)
      console.log(`      Size: ${r.sizeFormatted} / ${r.maxSizeFormatted} (${r.percentage}%)`)
    }
    console.log('')
  }

  // Passed
  if (results.passed.length > 0) {
    console.log('PASSED:')
    console.log('-------')
    for (const r of results.passed) {
      console.log(`  [OK] ${r.category}: ${r.sizeFormatted} / ${r.maxSizeFormatted} (${r.percentage}%)`)
    }
    console.log('')
  }

  // Verbose mode: show all files
  if (verbose) {
    console.log('\nDETAILED FILE LIST:')
    console.log('-------------------')
    for (const [category, data] of Object.entries(categories)) {
      if (data.files.length === 0) continue
      console.log(`\n${category} (${formatBytes(data.totalSize)}):`)
      for (const file of data.files.sort((a, b) => b.size - a.size)) {
        console.log(`  - ${file.name}: ${formatBytes(file.size)}`)
      }
    }
    console.log('')
  }

  // Summary
  console.log('========================================')
  if (results.failed.length > 0) {
    console.log(`RESULT: FAILED (${results.failed.length} bundle(s) exceed limits)`)
  } else if (results.warnings.length > 0) {
    console.log(`RESULT: PASSED with ${results.warnings.length} warning(s)`)
  } else {
    console.log('RESULT: PASSED - All bundles within size limits')
  }
  console.log('========================================\n')
}

// Run validation
validateBundleSizes()
