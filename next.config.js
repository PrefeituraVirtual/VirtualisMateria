/** @type {import('next').NextConfig} */
let withBundleAnalyzer = (config) => config;

if (process.env.ANALYZE === 'true') {
  withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
}

// Detectar ambiente
const isProduction = process.env.NODE_ENV === 'production';
const isStaticExport = process.env.NEXT_PUBLIC_BUILD_MODE === 'static';

const nextConfig = {
  reactStrictMode: true,

  // Configuração para Turbopack (Next.js 16+)
  turbopack: {},

  // Aumentar limite de body para uploads grandes (2GB)
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
    // Optimize CSS output
    optimizeCss: true,
    // Optimize package imports for tree-shaking
    optimizePackageImports: ['lucide-react', 'recharts', '@syncfusion/ej2-react-documenteditor'],
  },

  // Limite para middleware/proxy (2GB)
  serverExternalPackages: [],

  // Configuração para exportação estática (Cloudflare Pages)

  output: isStaticExport ? 'export' : undefined,
  images: isStaticExport
    ? { unoptimized: true }
    : {
      unoptimized: false,
      remotePatterns: [
        { protocol: 'http', hostname: 'localhost' },
        { protocol: 'https', hostname: '**' },
      ],
    },


  // Variáveis de ambiente públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL, // Removemos o default para permitir que o api.ts use a lógica de proxy
    NEXT_PUBLIC_BUILD_MODE: process.env.NEXT_PUBLIC_BUILD_MODE || 'dev',
  },

  // Rewrites habilitados para resolver problemas de rede/CORS em dev
  // O frontend (port 4001) fará proxy para o backend (port 4000)
  async rewrites() {
    if (isStaticExport) return []
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:4000/api/:path*',
      },
    ];
  },

  // Headers de segurança
  async headers() {
    if (isStaticExport) return []
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-inline'; img-src 'self' data: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },

  // Redirecionamentos
  async redirects() {
    if (isStaticExport) return []
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Configuração de webpack
  webpack: (config, { isServer }) => {
    // Otimizações para bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
      };

      // Ignorar warnings de módulos críticos
      config.ignoreWarnings = [
        {
          module: /node_modules\/fs/,
        },
        {
          message: /Unable to add filesystem/,
        },
      ];

      // Optimize tree-shaking
      // Note: sideEffects is handled per-package via their package.json
      // Setting it globally to false can break CSS and modules with side effects
      config.optimization = {
        ...config.optimization,
        usedExports: true,
      };

      // Split chunks for large libraries
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Recharts in separate chunk
          recharts: {
            name: 'recharts',
            test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
            priority: 40,
            reuseExistingChunk: true,
          },
          // Lucide-react in separate chunk
          lucide: {
            name: 'lucide',
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            priority: 35,
            reuseExistingChunk: true,
          },
          // Framer Motion in separate chunk
          framerMotion: {
            name: 'framer-motion',
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            priority: 30,
            reuseExistingChunk: true,
          },
          // Syncfusion in separate chunk (large library)
          syncfusion: {
            name: 'syncfusion',
            test: /[\\/]node_modules[\\/]@syncfusion[\\/]/,
            priority: 45,
            reuseExistingChunk: true,
          },
          // Common libraries shared across pages
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
