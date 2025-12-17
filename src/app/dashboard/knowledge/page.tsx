'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  UploadCloud, 
  FileText, 
  Video, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Search,
  Plus
} from 'lucide-react';

// Tipagem local (espelho do Prisma)
type DocStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type MediaType = 'TEXT' | 'VIDEO' | 'AUDIO' | 'LINK';

interface DocumentItem {
  id: string;
  fileName: string;
  mediaType: MediaType;
  status: DocStatus;
  createdAt: string;
  fileSize?: string;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cliente Supabase para o Frontend
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Buscar documentos (Simulação inicial - depois conectaremos na API GET)
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          // Garante que o estado seja um array, mesmo se vier null
          setDocuments(data.documents || []);
        }
      } catch (error) {
        console.error("Erro ao carregar documentos", error);
      }
    };

    fetchDocuments();
  }, []); // Roda apenas uma vez ao montar a tela

  // ============================================
  // Lógica de Upload (Direct to Storage)
  // ============================================
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Validar Tipo
      const isVideo = file.type.startsWith('video/');
      const isPDF = file.type === 'application/pdf';
      const isText = file.type === 'text/plain';

      if (!isVideo && !isPDF && !isText) {
        alert('Formato não suportado. Use PDF, TXT ou Vídeo.');
        setIsUploading(false);
        return;
      }

      // 2. Upload para Supabase Storage (Bucket 'documents')
      // Nome único: timestamp-nomearquivo
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      // Simula progresso (o Supabase JS client v2 não tem onProgress nativo simples, 
      // mas upload é rápido. Para vídeos grandes, usaríamos TUS/Resumable uploads).
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 500);

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      clearInterval(progressInterval);

      if (error) throw error;

      setUploadProgress(100);

      // 3. Registrar no Backend para Processamento
      const mediaType: MediaType = isVideo ? 'VIDEO' : 'TEXT';
      
      const res = await fetch('/api/documents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileKey: data.path, // Caminho retornado pelo Supabase
          mediaType: mediaType,
        }),
      });

      if (!res.ok) throw new Error('Falha ao registrar documento');
      
      const { documentId, status } = await res.json();

      // 4. Atualizar UI Otimista
      const newDoc: DocumentItem = {
        id: documentId,
        fileName: file.name,
        mediaType,
        status: status, // PENDING
        createdAt: new Date().toISOString(),
      };

      setDocuments([newDoc, ...documents]);
      
    } catch (error: any) {
      console.error(error);
      alert('Erro no upload: ' + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Gerencie os arquivos que a sua IA utiliza para responder aos alunos.
        </p>
      </div>

      {/* Área de Upload (Drag & Drop) */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out text-center group cursor-pointer
          ${dragActive 
            ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/5' 
            : 'border-white/10 hover:border-[var(--primary-500)]/50 hover:bg-white/[0.02]'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={false}
          accept=".pdf,.txt,.md,.mp4,.mov,.mp3"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

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
                <p className="text-lg font-medium text-white">Enviando arquivo...</p>
                <div className="w-64 h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-[var(--primary-500)] transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-white">
                  Clique ou arraste arquivos aqui
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  PDF, DOCX, TXT ou Vídeo/Áudio (MP4, MP3)
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            Arquivos Ativos <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-[var(--text-muted)]">{documents.length}</span>
          </h2>
          {/* Campo de busca futuro */}
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Buscar arquivo..." 
              className="bg-[var(--surface-800)] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:ring-1 focus:ring-[var(--primary-500)] outline-none"
            />
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 border border-white/5 rounded-xl bg-white/[0.01]">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-white font-medium">Nenhum documento ainda</h3>
            <p className="text-sm text-[var(--text-muted)]">Comece fazendo upload da sua base de conhecimento.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                className="group flex items-center justify-between p-4 rounded-xl bg-[var(--surface-800)] border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Ícone por Tipo */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    doc.mediaType === 'VIDEO' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {doc.mediaType === 'VIDEO' ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-md">{doc.fileName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                      {/* Badge de Status */}
                      {doc.status === 'COMPLETED' && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Indexado
                        </span>
                      )}
                      {doc.status === 'PROCESSING' && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processando IA
                        </span>
                      )}
                      {doc.status === 'FAILED' && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Falha
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Excluir arquivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}