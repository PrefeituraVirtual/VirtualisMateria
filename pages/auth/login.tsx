import React, { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AlertCircle, EyeOff, Eye, Key } from 'lucide-react'
import { authService } from '@/lib/api'
import toast from 'react-hot-toast'
import type { User } from '@/types/auth'
import { loginSchema, getZodErrors } from '@/lib/validation'
import { z } from 'zod'
import { useCSRFToken } from '@/lib/csrf-protection'

interface DevTokenResponse {
  success: boolean
  token: string
  user: User
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  // CSRF token for form protection
  const { token: csrfToken } = useCSRFToken()

  // Validar campo individual no blur
  const validateField = (field: 'email' | 'password', value: string) => {
    try {
      if (field === 'email') {
        loginSchema.shape.email.parse(value)
      } else {
        loginSchema.shape.password.parse(value)
      }
      // Limpar erro se validacao passar
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFieldErrors(prev => ({
          ...prev,
          [field]: error.issues[0]?.message || 'Campo invalido'
        }))
      }
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar formulario com Zod
    try {
      loginSchema.parse({ email, password })
      setFieldErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFieldErrors(getZodErrors(error))
        toast.error('Por favor, corrija os erros no formulario')
        return
      }
    }

    setIsLoading(true)

    try {
      // Usar endpoint de desenvolvimento para gerar token JWT real
      const apiClient = (await import('@/lib/api')).api

      // Include CSRF token in request body
      const response = await apiClient.post<DevTokenResponse>('/api/auth/dev-token', {
        email,
        password,
        _csrf: csrfToken
      })

      if (response.success) {
        authService.login(response.token, response.user)
        toast.success('Login realizado com sucesso!')
        router.push('/')
      } else {
        toast.error('Credenciais inválidas')
      }
    } catch (error) {
      console.error('Erro no login:', error)
      toast.error('Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSSOTest = () => {
    // Redirecionar para SSO com um ID de teste
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
    window.location.href = `${apiUrl}/api/auth/sso/1`
  }

  return (
    <>
      <Head>
        <title>Login - Materia Virtualis</title>
      </Head>

      <div className="login-background min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center mb-6">
              <img 
                src="/logo/logotipo1020.png" 
                alt="Logo Materia Virtualis" 
                className="h-32 w-auto object-contain drop-shadow-lg"
              />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 drop-shadow-sm">
              Sistema de Autenticação
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 font-medium">
              Materia Virtualis - Assistente Legislativo
            </p>
          </div>

          <Card className="bg-white/95 backdrop-blur-md shadow-2xl border-white/50">
            <CardContent className="p-8">
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email ou CPF
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="text"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.email
                          return newErrors
                        })
                      }
                    }}
                    onBlur={() => email && validateField('email', email)}
                    placeholder="seu@email.com ou CPF"
                    className={`bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      fieldErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                    }`}
                    disabled={isLoading}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Senha
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.password
                          return newErrors
                        })
                      }
                    }}
                    onBlur={() => password && validateField('password', password)}
                    placeholder="Sua senha"
                    className={`bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      fieldErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                    }`}
                    disabled={isLoading}
                    endIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    }
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-800 hover:to-cyan-700 text-white shadow-md transform hover:scale-[1.02] transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 text-gray-500 bg-white/95">
                        OU
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
                    onClick={handleSSOTest}
                    disabled={isLoading}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Login via SSO (Teste)
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-600 font-medium">
            <p className="drop-shadow-sm shadow-white">Acesso restrito a vereadores e servidores autorizados</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .login-background {
          background-image: url('/images/login-bg-v3.png');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          position: relative;
        }

        .login-background::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.4) 0%,
            rgba(255, 255, 255, 0.2) 100%
          );
          z-index: 0;
          backdrop-filter: blur(0px);
        }
      `}</style>
    </>
  )
}

// Desabilitar SSR para esta página
export function getStaticProps() {
  return {
    props: {},
  }
}
