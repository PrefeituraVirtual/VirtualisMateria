import React, { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft } from 'lucide-react'

export default function TestLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('123456')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      // Fazer request direto para o backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      setResult(data)

      // Mostrar detalhes do token
      if (data.token) {
        try {
          const tokenParts = data.token.split('.')
          const payload = JSON.parse(atob(tokenParts[1]))
          setResult((prev: any) => ({
            ...prev,
            decodedToken: payload
          }))
        } catch (e) {
          console.error('Erro ao decodificar token:', e)
        }
      }
    } catch (error) {
      console.error('Erro:', error)
      setResult({
        error: 'Erro ao conectar com o backend',
        details: error
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Teste de Login - Debug</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-8">Teste de Autenticação (Debug)</h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Formulário */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Fazer Login Teste</h2>
                <form onSubmit={handleTestLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="test1001@camara.test"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Senha</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="123456"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Testando...' : 'Testar Login'}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold mb-2">Emails para teste:</h3>
                  <ul className="text-sm space-y-1 font-mono">
                    <li>test1001@camara.test → MARIA SILVA (Presidente)</li>
                    <li>test1002@camara.test → JOÃO PEREIRA (Vereador)</li>
                    <li>test1003@camara.test → ANA SOUZA (Suplente)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Resultado */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Resposta do Backend</h2>
                {result ? (
                  <div className="space-y-4">
                    {result.error ? (
                      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                        <p className="font-semibold">Erro:</p>
                        <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-green-100 text-green-700 rounded-lg">
                          <p className="font-semibold">✅ Login bem-sucedido!</p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Dados do Usuário:</h3>
                          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                            {JSON.stringify(result.user, null, 2)}
                          </pre>
                        </div>

                        {result.decodedToken && (
                          <div>
                            <h3 className="font-semibold mb-2">Token Decodificado:</h3>
                            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                              {JSON.stringify(result.decodedToken, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div>
                          <h3 className="font-semibold mb-2">Resposta Completa:</h3>
                          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Faça um login para ver os detalhes</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Button
              variant="secondary"
              onClick={() => router.push('/auth/login')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Login Normal
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
