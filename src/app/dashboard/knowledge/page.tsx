'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  UploadCloud, FileText, Video, Loader2, CheckCircle, 
  AlertCircle, Trash2, Search, Eye, File, Music
} from 'lucide-react';
import { FilePreviewModal } from '@/components/FilePreviewModal';

// Tipagens
type DocStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type MediaType = 'TEXT' | 'VIDEO' | 'AUDIO' | 'LINK';

interface DocumentItem {
  id: string;
  fileName: string;
  fileKey?: string;
  mediaType: MediaType;
  status: DocStatus;
  createdAt: string;
  summary?: string | null;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado do Modal de Preview
  const [previewData, setPreviewData] = useState<{
    isOpen: boolean;
    url: string | null;
    name: string;
    type: 'video' | 'audio' | 'pdf' | 'text' | 'image' | 'other';
  }>({ isOpen: false, url: null, name: '', type: 'other' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Função de busca (memorizada para usar no useEffect)
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        // Verifica se houve mudança real antes de setar (opcional, mas bom pra performance)
        setDocuments(prev => {
          const newDocs = data.documents || [];
          if (JSON.stringify(prev) !== JSON.stringify(newDocs)) {
            return newDocs;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Erro ao carregar documentos", error);
    }
  }, []);

  // Carga Inicial
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // --- POLLING INTELIGENTE ---
  // Se houver algum documento processando, atualiza a cada 5 segundos
  useEffect(() => {
    const hasPending = documents.some(d => d.status === 'PENDING' || d.status === 'PROCESSING');
    
    if (hasPending) {
      const interval = setInterval(() => {
        console.log("Polling: Verificando status dos arquivos...");
        fetchDocuments();
      }, 5000); // 5 segundos

      return () => clearInterval(interval);
    }
  }, [documents, fetchDocuments]);

  // --- DELETE FUNCTION ---
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo? Essa ação é irreversível.')) return;
    
    // UI Otimista
    setDocuments(prev => prev.filter(d => d.id !== id));

    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
    } catch (error) {
      alert('Erro ao excluir documento.');
      fetchDocuments();
    }
  };

  // --- VIEW FILE FUNCTION (MODAL) ---
  const handleViewFile = async (doc: DocumentItem) => {
    if (!doc.fileKey) return alert('Arquivo não encontrado.');
    
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.fileKey, 3600);

      if (error || !data) throw new Error('Erro ao gerar link');

      const ext = doc.fileName.split('.').pop()?.toLowerCase();
      let type: any = 'other';

      if (['mp4', 'mov', 'webm'].includes(ext || '')) type = 'video';
      else if (['mp3', 'wav', 'ogg'].includes(ext || '')) type = 'audio';
      else if (ext === 'pdf') type = 'pdf';
      else if (['txt', 'md', 'json', 'csv', 'js', 'ts'].includes(ext || '')) type = 'text';
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) type = 'image';

      setPreviewData({
        isOpen: true,
        url: data.signedUrl,
        name: doc.fileName,
        type: type
      });

    } catch (e) {
      alert('Não foi possível abrir o arquivo.');
    }
  };

  // --- UPLOAD LOGIC ---
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${cleanName}`;
      
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 500);

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      clearInterval(progressInterval);
      if (error) throw error;
      setUploadProgress(100);

      let mediaType: MediaType = 'TEXT';
      if (isVideo) mediaType = 'VIDEO';
      if (isAudio) mediaType = 'AUDIO';
      
      const res = await fetch('/api/documents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileKey: data.path,
          mediaType: mediaType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao registrar documento');
      }
      
      await fetchDocuments();
      
    } catch (error: any) {
      console.error(error);
      alert('Erro no upload: ' + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // --- DRAG HANDLERS ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files);
  };

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Gerencie os arquivos que a sua IA utiliza para responder aos alunos.
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out text-center group cursor-pointer
            ${dragActive 
              ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/5' 
              : 'border-white/10 hover:border-[var(--primary-500)]/50 hover:bg-white/[0.02]'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.txt,.md,.mp4,.mov,.mp3,.wav,.doc,.docx" onChange={(e) => handleFileUpload(e.target.files)} />

          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-800)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-[var(--primary-500)] animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8 text-[var(--text-muted)] group-hover:text-[var(--primary-500)] transition-colors" />
              )}
            </div>
            
            <div className="space-y-1">
              {isUploading ? (
                <>
                  <p className="text-lg font-medium text-white">Processando arquivo...</p>
                  <div className="w-64 h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[var(--primary-500)] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-white">Clique ou arraste arquivos aqui</p>
                  <p className="text-sm text-[var(--text-muted)]">PDF, TXT, Áudio, Vídeo</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            Arquivos Ativos <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-[var(--text-muted)]">{documents.length}</span>
          </h2>

          {documents.length === 0 ? (
            <div className="text-center py-12 border border-white/5 rounded-xl bg-white/[0.01]">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                <File className="w-6 h-6 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-white font-medium">Nenhum documento ainda</h3>
              <p className="text-sm text-[var(--text-muted)]">Seus arquivos processados aparecerão aqui.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-[var(--surface-800)] border border-white/5 hover:border-white/10 transition-all gap-4">
                  
                  {/* Info Principal */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${
                      doc.mediaType === 'VIDEO' ? 'bg-purple-500/10 text-purple-400' : 
                      doc.mediaType === 'AUDIO' ? 'bg-pink-500/10 text-pink-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {doc.mediaType === 'VIDEO' ? <Video className="w-5 h-5" /> : 
                       doc.mediaType === 'AUDIO' ? <Music className="w-5 h-5" /> :
                       <FileText className="w-5 h-5" />}
                    </div>
                    
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                         <h4 
                           onClick={() => handleViewFile(doc)} 
                           className="text-sm font-medium text-white truncate cursor-pointer hover:text-[var(--primary-400)] transition-colors"
                         >
                            {doc.fileName}
                         </h4>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs text-[var(--text-muted)]">
                          {new Date(doc.createdAt).toLocaleString('pt-BR', { 
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                          })}
                        </span>

                        {doc.status === 'COMPLETED' && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Indexado
                          </span>
                        )}
                        {doc.status === 'PROCESSING' && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" /> Processando
                          </span>
                        )}
                        {doc.status === 'FAILED' && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Falha
                          </span>
                        )}
                      </div>

                      {doc.summary && (
                         <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1 border-l-2 border-white/10 pl-2 italic">
                           {doc.summary}
                         </p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button 
                      onClick={() => handleViewFile(doc)}
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--primary-500)] hover:bg-[var(--primary-500)]/10 rounded-lg transition-colors"
                      title="Visualizar arquivo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Excluir arquivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FilePreviewModal 
        isOpen={previewData.isOpen}
        onClose={() => setPreviewData(prev => ({ ...prev, isOpen: false }))}
        fileUrl={previewData.url}
        fileName={previewData.name}
        fileType={previewData.type}
      />
    </>
  );
}