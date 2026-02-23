import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function ClearCachePage() {
  const router = useRouter()

  useEffect(() => {
    // Limpar todos os dados armazenados
    console.log('🧹 Limpando cache e dados...')

    // Limpar localStorage
    localStorage.clear()
    console.log('✅ localStorage limpo')

    // Limpar sessionStorage
    sessionStorage.clear()
    console.log('✅ sessionStorage limpo')

    // Limpar todos os cookies
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    })
    console.log('✅ cookies limpos')

    // Limpar IndexedDB (opcional)
    if (window.indexedDB) {
      const databases = indexedDB.databases()
      databases.then(dbs => {
        dbs.forEach(db => {
          indexedDB.deleteDatabase(db.name!)
        })
        console.log('✅ IndexedDB limpo')
      })
    }

    // Redirecionar para login após 2 segundos
    setTimeout(() => {
      console.log('🔄 Redirecionando para login...')
      router.push('/auth/login')
    }, 2000)
  }, [router])

  return (
    <>
      <Head>
        <title>Limpar Cache - Materia Virtualis</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-virtualis-blue-600"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Limpando Dados
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Removendo cache e dados de usuário...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            Você será redirecionado para a página de login em instantes...
          </p>
        </div>
      </div>
    </>
  )
}