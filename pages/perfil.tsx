import React, { useState, useRef } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { SEOHead } from '@/components/common/SEOHead'
import { Card, CardContent, CardHeader, CardTitle, CardDescription as _CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/lib/api'
import { Edit2, Loader2, Camera, Shield, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PerfilPage() {
  const { user, loading, refreshUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || 'Vereador atuante na área de saúde e educação.',
  })

  React.useEffect(() => {
    if (user) {
        setFormData(prev => ({
            ...prev,
            name: user.name,
            phone: user.phone || '',
            bio: user.bio || 'Vereador atuante na área de saúde e educação.'
        }))
    }
  }, [user])

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result as string
      try {
        await authService.updateProfile({ avatar: base64String })
        
        await refreshUser()

        toast.success('Foto de perfil atualizada!')
      } catch (error) {
        toast.error('Erro ao atualizar foto')
        console.error(error)
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    try {
        await authService.updateProfile({ 
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio
        })
        
        await refreshUser()

        setIsEditing(false)
        toast.success('Perfil atualizado!')
    } catch (error) {
        toast.error('Erro ao salvar perfil')
        console.error(error)
    }
  }

  if (loading || !user) {
     return (
       <MainLayout>
         <div className="flex items-center justify-center min-h-[60vh]">
           <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
         </div>
       </MainLayout>
     )
  }

  const roleLabel = {
    'council_member': 'Vereador',
    'admin': 'Administrador',
    'support': 'Suporte Técnico'
  }[user.role as string] || user.role

  return (
    <>
      <SEOHead title="Meu Perfil" description="Gerencie suas informações pessoais e de conta." />
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meu Perfil</h1>
              <p className="text-gray-500 dark:text-gray-400">Gerencie suas informações pessoais e de conta.</p>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit2 className="h-4 w-4 mr-2" />
                Editar Perfil
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Identity Card */}
            <div className="md:col-span-1 space-y-6">
              <Card className="border-gray-200 dark:border-gray-800">
                <CardContent className="pt-6 flex flex-col items-center text-center">
                  <div className="relative group">
                    <div className="h-32 w-32 rounded-full bg-virtualis-blue-600 flex items-center justify-center text-4xl text-white font-bold mb-4 border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        user.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    
                    {/* Upload Overlay */}
                    <Button 
                      variant="outline"
                      onClick={triggerFileUpload}
                      className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      ) : (
                        <Camera className="h-8 w-8" />
                      )}
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{user.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{user.email}</p>
                  
                  <Badge variant="info" className="mb-4">
                    {roleLabel}
                  </Badge>

                  <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">ID da Câmara Municipal</div>
                    <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      {user.council_id}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Details */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
                       <Input 
                         value={formData.name} 
                         disabled={!isEditing} 
                         onChange={(e) => setFormData({...formData, name: e.target.value})}
                         className={!isEditing ? "bg-gray-50 dark:bg-gray-900" : ""}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                       <Input value={user.email} disabled className="bg-gray-50 dark:bg-gray-900" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefone / WhatsApp</label>
                       <Input 
                         value={formData.phone} 
                         disabled={!isEditing} 
                         onChange={(e) => setFormData({...formData, phone: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cargo / Função</label>
                       <Input value={roleLabel} disabled className="bg-gray-50 dark:bg-gray-900" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      label="Bio / Notas"
                      value={formData.bio}
                      disabled={!isEditing}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    />
                  </div>

                  {isEditing && (
                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                      <Button onClick={handleSave}>Salvar Alterações</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-gray-200 dark:border-gray-800">
                 <CardHeader>
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Shield className="h-5 w-5 text-virtualis-blue-500" />
                     Segurança e Acesso
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                     <div className="flex items-center gap-3">
                       <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                       <div>
                         <p className="font-medium text-gray-900 dark:text-gray-100">Senha de Acesso</p>
                         <p className="text-sm text-gray-500 dark:text-gray-400">Gerenciada pelo sistema legado da Câmara.</p>
                       </div>
                     </div>
                     <span className="text-xs text-gray-400 italic">Somente leitura</span>
                   </div>
                 </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  )
}
