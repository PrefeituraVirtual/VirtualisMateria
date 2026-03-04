import { useState, useEffect, useCallback } from 'react';
import { SEOHead } from '@/components/common/SEOHead';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Input, Textarea } from '@/components/ui/Input';
import { CharacterCounter } from '@/components/ui/CharacterCounter';
import axios from 'axios';
import { Trash2, Edit2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { worksService } from '../src/lib/api';
import { obraSchema, getZodErrors, sanitizeInput, MAX_OBRA_TITLE_LENGTH, MAX_OBRA_DESCRIPTION_LENGTH, MAX_OBRA_LOCATION_LENGTH } from '@/lib/validation';
import { z } from 'zod';
import type { WorkCreateData } from '@/types/api';

interface Obra {
  id: number;
  titulo: string;
  descricao?: string;
  localizacao?: string;
  orcamento?: number | string;
  data_previsao_fim?: string;
  status?: string;
}

interface InspectionEntry {
  id: number;
  created_at: string;
  foto_url?: string;
  analise_visual?: string;
  analise_legislativa?: string;
}

export default function ObrasPage() {
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingObraId, setEditingObraId] = useState<number | null>(null);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Usar ID do usuário autenticado
  const userId = user?.id;

  const fetchObras = useCallback(async () => {
    try {
      const data = await worksService.getAll(Number(userId));
      setObras(data as unknown as Obra[]);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar obras:', error);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchObras();
    }
  }, [userId, fetchObras]);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const renderFieldError = (message?: string) => {
    if (!message) return undefined;
    return (
      <span className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
        {message}
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const parsedUserId = userId ? Number(userId) : null;
      if (!parsedUserId || Number.isNaN(parsedUserId)) {
        toast.error('Usuario invalido');
        return;
      }

      const validationPayload = {
        titulo,
        descricao,
        localizacao,
        orcamento,
        data_previsao_fim: dataFim || undefined
      };

      let parsedObraData: z.infer<typeof obraSchema>;
      try {
        parsedObraData = obraSchema.parse(validationPayload);
        setFieldErrors({});
      } catch (error) {
        if (error instanceof z.ZodError) {
          setFieldErrors(getZodErrors(error));
          toast.error('Corrija os campos destacados para continuar');
        } else {
          toast.error('Erro ao validar os dados da obra');
        }
        return;
      }

      const sanitizedTitulo = sanitizeInput(parsedObraData.titulo);
      const sanitizedDescricao = parsedObraData.descricao ? sanitizeInput(parsedObraData.descricao) : undefined;
      const sanitizedLocalizacao = parsedObraData.localizacao ? sanitizeInput(parsedObraData.localizacao) : undefined;

      const obraData: WorkCreateData & {
        localizacao?: string;
        orcamento?: number;
        data_previsao_fim?: string;
      } = {
        user_id: parsedUserId,
        titulo: sanitizedTitulo,
        descricao: sanitizedDescricao ?? '',
        status: 'EM_ANDAMENTO',
        localizacao: sanitizedLocalizacao,
        orcamento: parsedObraData.orcamento,
        data_previsao_fim: parsedObraData.data_previsao_fim
      };

      if (editingObraId) {
        await worksService.update(editingObraId, obraData);
      } else {
        await worksService.create(obraData);
      }

      setShowForm(false);
      resetForm();
      fetchObras(); // Refresh list
    } catch (error) {
      console.error('Erro ao salvar obra:', error);
      toast.error('Erro ao salvar obra');
    }
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setLocalizacao('');
    setOrcamento('');
    setDataFim('');
    setFieldErrors({});
    setEditingObraId(null);
  };

  const handleEditObra = (obra: Obra) => {
    setEditingObraId(obra.id);
    setTitulo(obra.titulo);
    setDescricao(obra.descricao || '');
    setLocalizacao(obra.localizacao || '');
    setOrcamento(obra.orcamento !== undefined && obra.orcamento !== null ? String(obra.orcamento) : '');
    
    // Format date for input type="date"
    if (obra.data_previsao_fim) {
      const date = new Date(obra.data_previsao_fim);
      setDataFim(date.toISOString().split('T')[0]);
    } else {
      setDataFim('');
    }
    
    setShowForm(true);
  };

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [obraToDelete, setObraToDelete] = useState<Obra | null>(null);

  const confirmDelete = (obra: Obra) => {
    setObraToDelete(obra);
    setShowDeleteModal(true);
  };

  const handleExecuteDelete = async () => {
    if (!obraToDelete || !userId) return;
    const parsedUserId = Number(userId);
    if (Number.isNaN(parsedUserId)) return;

    try {
      await worksService.delete(obraToDelete.id, parsedUserId);
      fetchObras(); // Refresh list
      setShowDeleteModal(false);
      setObraToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar obra:', error);
      toast.error('Erro ao excluir obra');
    }
  };

  // Modal State
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [inspections, setInspections] = useState<InspectionEntry[]>([]);
  const [loadingInspections, setLoadingInspections] = useState(false);

  // ... form state ...

  const handleViewInspections = async (obra: Obra) => {
    setSelectedObra(obra);
    setLoadingInspections(true);
    try {
      const data = await worksService.getInspections(obra.id!);
      setInspections(data as unknown as InspectionEntry[]);
    } catch (error) {
      console.error('Erro ao buscar fiscalizações:', error);
    } finally {
      setLoadingInspections(false);
    }
  };

  const closeModal = () => {
    setSelectedObra(null);
    setInspections([]);
  };

  return (
    <MainLayout>
      <SEOHead
        title="Fiscalização de Obras"
        description="Acompanhe e fiscalize obras públicas"
      />

      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Fiscalização de Obras</h1>
            <p className="text-gray-600 mt-2">Gerencie e fiscalize obras públicas com IA.</p>
          </div>
          <button 
            onClick={() => {
              if (showForm) resetForm();
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Nova Obra'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 animate-fade-in-down">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {editingObraId ? 'Editar Obra' : 'Cadastrar Nova Obra'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <Input
                  label="Título da Obra *"
                  required
                  type="text"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    clearFieldError('titulo');
                  }}
                  placeholder="Ex: Reforma da Escola X"
                  maxLength={MAX_OBRA_TITLE_LENGTH}
                  error={renderFieldError(fieldErrors.titulo)}
                />
                <div className="flex justify-end mt-1">
                  <CharacterCounter current={titulo.length} max={MAX_OBRA_TITLE_LENGTH} />
                </div>
              </div>
              
              <div className="col-span-2">
                <Textarea
                  label="Descrição"
                  value={descricao}
                  onChange={(e) => {
                    setDescricao(e.target.value);
                    clearFieldError('descricao');
                  }}
                  placeholder="Detalhes sobre a obra..."
                  maxLength={MAX_OBRA_DESCRIPTION_LENGTH}
                  error={renderFieldError(fieldErrors.descricao)}
                  rows={4}
                />
                <div className="flex justify-end mt-1">
                  <CharacterCounter current={descricao.length} max={MAX_OBRA_DESCRIPTION_LENGTH} />
                </div>
              </div>

              <div>
                <Input
                  label="Localização"
                  type="text"
                  value={localizacao}
                  onChange={(e) => {
                    setLocalizacao(e.target.value);
                    clearFieldError('localizacao');
                  }}
                  placeholder="Bairro ou Endereço"
                  maxLength={MAX_OBRA_LOCATION_LENGTH}
                  error={renderFieldError(fieldErrors.localizacao)}
                />
                <div className="flex justify-end mt-1">
                  <CharacterCounter current={localizacao.length} max={MAX_OBRA_LOCATION_LENGTH} />
                </div>
              </div>

              <div>
                <Input
                  label="Previsão de Término"
                  type="date"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    clearFieldError('data_previsao_fim');
                  }}
                  error={renderFieldError(fieldErrors.data_previsao_fim)}
                />
              </div>

              <div>
                <Input
                  label="Orçamento (R$)"
                  type="number"
                  value={orcamento}
                  onChange={(e) => {
                    setOrcamento(e.target.value);
                    clearFieldError('orcamento');
                  }}
                  placeholder="0.00"
                  error={renderFieldError(fieldErrors.orcamento)}
                  min="0"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-3 mt-4">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  {editingObraId ? 'Atualizar Obra' : 'Salvar Obra'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-scale-up">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-600" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Obra?</h3>
                <p className="text-gray-600 mb-6">
                  Tem certeza que deseja excluir permanentemente a obra <strong className="text-gray-900">"{obraToDelete?.titulo}"</strong>?
                  <br/>
                  <span className="text-sm text-red-500 mt-2 block">Todas as fiscalizações associadas também serão apagadas. Esta ação não pode ser desfeita.</span>
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecuteDelete}
                    className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors shadow-sm"
                  >
                    Sim, Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando obras...</div>
        ) : obras.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">Nenhuma obra cadastrada.</p>
            <p className="text-gray-400 text-sm mt-1">Utilize o botão "+ Nova Obra" ou peça para a IA no WhatsApp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {obras.map(obra => (
              <div key={obra.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                  {/* Placeholder icon or image if available */}
                  <span className="text-white text-4xl">🏗️</span>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{obra.titulo}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      obra.status === 'EM_ANDAMENTO' ? 'bg-green-100 text-green-700' :
                      obra.status === 'CONCLUIDA' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {obra.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10">
                    {obra.descricao || 'Sem descrição.'}
                  </p>

                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>📍</span> {obra.localizacao || 'Sem local'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📅</span> Previsão: {obra.data_previsao_fim ? new Date(obra.data_previsao_fim).toLocaleDateString('pt-BR') : 'N/A'}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <button 
                        onClick={() => handleViewInspections(obra)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        Ver Fiscalizações →
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleEditObra(obra)}
                            className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors"
                            title="Editar Obra"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={() => confirmDelete(obra)}
                            className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                            title="Excluir Obra"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Fiscalizações */}
        {selectedObra && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Linha do Tempo: {selectedObra.titulo}</h2>
                            <p className="text-sm text-gray-500">{selectedObra.localizacao}</p>
                        </div>
                        <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                        {loadingInspections ? (
                            <div className="text-center py-12">
                                <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-500">Carregando histórico...</p>
                            </div>
                        ) : inspections.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                                <p>Nenhuma fiscalização registrada ainda.</p>
                                <p className="text-sm mt-1">Envie fotos pelo WhatsApp para alimentar este histórico.</p>
                            </div>
                        ) : (
                            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                {inspections.map((inspection, index) => (
                                    <div key={inspection.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-blue-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                            <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="12" height="10">
                                                <path fillRule="nonzero" d="M10.422 1.257 4.655 7.025 2.553 4.923A.916.916 0 0 0 1.257 6.22l2.75 2.75a.916.916 0 0 0 1.296 0l6.415-6.416a.916.916 0 0 0-1.296-1.296Z" />
                                            </svg>
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl shadow border border-gray-100">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-slate-900 text-sm">Fiscalização #{inspections.length - index}</div>
                                                <time className="font-caveat font-medium text-blue-500 text-xs">
                                                    {new Date(inspection.created_at).toLocaleDateString('pt-BR')} às {new Date(inspection.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                                </time>
                                            </div>
                                            <div className="mb-3">
                                                {inspection.foto_url && (
                                                    <img src={inspection.foto_url} alt="Fiscalização" className="w-full h-48 object-cover rounded-lg mb-3 border border-gray-100" />
                                                )}
                                                <div className="text-slate-600 text-sm mb-2 font-medium">Análise Visual (IA):</div>
                                                <p className="text-slate-500 text-sm leading-snug bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                                                    {inspection.analise_visual}
                                                </p>
                                                {inspection.analise_legislativa && (
                                                    <>
                                                        <div className="text-slate-600 text-sm mb-2 font-medium mt-3">Parecer Legislativo:</div>
                                                        <p className="text-slate-500 text-sm leading-snug bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800">
                                                            {inspection.analise_legislativa}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </MainLayout>
  );
}
