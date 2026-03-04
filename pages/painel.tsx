// Painel Legislativo — desabilitado temporariamente (contém dados mockados).
// Para reativar, restaurar o conteúdo original deste arquivo e descomentar
// a entrada 'painel' em src/lib/constants.ts (SIDEBAR_ITEMS).

import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function PainelLegislativo() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return null
}
