import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { PageLoading } from '@/components/ui/Loading';
import { authService } from '@/lib/api';
import { setSecureItem } from '@/lib/secure-storage';
import { sanitizeUserForStorage } from '@/lib/auth-storage';

/**
 * Página de callback para SSO
 * Recebe o token do backend e autentica o usuário
 */
export default function AuthCallback() {
  const router = useRouter();
  const { login } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Evita processamento múltiplo
    if (isProcessing) return;

    const { token, name, userId, redirect } = router.query;

    // Só processa se os parâmetros estiverem presentes
    if (token && name && !isProcessing) {
      setIsProcessing(true);

      // Fazer login com o token recebido
      const userData = {
        id: Array.isArray(userId) ? userId[0] : userId || '38835',
        name: Array.isArray(name) ? name[0] : name,
        email: '',
        role: 'council_member' as const,
        council_member_id: Array.isArray(userId) ? userId[0] : userId || '38835',
        council_id: 'valparaiso-de-goias',
      };

      // Salvar token e dados do usuário
      const tokenValue = Array.isArray(token) ? token[0] : token;

      // Perform async login
      const performLogin = async () => {
        try {
          // Verificar se o token foi salvo corretamente
          console.log('[Callback] Tentando login com:', { tokenLength: tokenValue?.length, userId: userData.id });
          const saved = await login(tokenValue, userData);
          console.log('[Callback] Login result:', saved);

          if (saved) {
            console.log('Login realizado com sucesso via SSO');

            // Buscar perfil completo com isAdmin após SSO login
            // Usa API direta para garantir que o storage é atualizado
            try {
              const profileResponse = await authService.getMe();
              if (profileResponse?.success && profileResponse.user) {
                console.log('[Callback] Perfil completo obtido, isAdmin:', profileResponse.user.isAdmin);

                // Atualiza o storage diretamente com o perfil completo
                await setSecureItem('user', sanitizeUserForStorage(profileResponse.user), {
                  ttl: 24 * 60 * 60 * 1000
                });
                console.log('[Callback] Storage atualizado com isAdmin');
              }
            } catch (profileError) {
              console.warn('[Callback] Erro ao buscar perfil (não crítico):', profileError);
            }

            // Delay mais longo para garantir propagação
            await new Promise(resolve => setTimeout(resolve, 500));

            // Redirecionar para o dashboard ou rota especificada
            const redirectTo = (Array.isArray(redirect) ? redirect[0] : redirect) || '/';
            router.push(redirectTo).then(() => {
                console.log('Redirecionado para:', redirectTo);
              }).catch((error) => {
                console.error('Erro ao redirecionar:', error);
                // Fallback: tentar redirecionar manualmente
                window.location.href = redirectTo;
              });
          } else {
            console.error('Falha ao salvar token via SSO');
            setError('Falha ao autenticar. Tente novamente.');
            setTimeout(() => {
              router.push('/auth/login?error=sso_failed');
            }, 2000);
          }
        } catch (error) {
          console.error('Erro no callback SSO:', error);
          setError('Erro durante autenticação. Tente novamente.');
          setTimeout(() => {
            router.push('/auth/login?error=sso_error');
          }, 2000);
        }
      };

      performLogin().catch((error) => {
        console.error('Erro no callback SSO:', error);
        setError('Erro durante autenticacao. Tente novamente.');
        setTimeout(() => {
          router.push('/auth/login?error=sso_error');
        }, 2000);
      });
    }
  }, [router.query, router, login, isProcessing]);

  return (
    <>
      <Head>
        <title>Conectando - Materia Virtualis</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <PageLoading />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-6">
            Conectando ao assistente legislativo...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Verificando suas permissões e preparando o ambiente
          </p>
        </div>
      </div>
    </>
  );
}

// Desabilitar SSR para esta página (precisa rodar no cliente)
export function getStaticProps() {
  return {
    props: {},
  };
}