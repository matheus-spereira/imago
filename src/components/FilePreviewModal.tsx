// src/components/FilePreviewModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Download, FileText, Loader2, ExternalLink } from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
  fileType: 'video' | 'audio' | 'pdf' | 'text' | 'image' | 'other';
}

export function FilePreviewModal({ isOpen, onClose, fileUrl, fileName, fileType }: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Fecha com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Se for texto, baixa o conteúdo para exibir bonitinho
  useEffect(() => {
    if (isOpen && fileType === 'text' && fileUrl) {
      setLoading(true);
      fetch(fileUrl)
        .then((res) => res.text())
        .then((text) => setTextContent(text))
        .catch(() => setTextContent('Erro ao carregar conteúdo do texto.'))
        .finally(() => setLoading(false));
    } else {
      setTextContent('');
    }
  }, [isOpen, fileType, fileUrl]);

  if (!isOpen || !fileUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-5xl bg-[var(--surface-900)] rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[var(--surface-800)]">
          <h3 className="text-lg font-medium text-white truncate max-w-[80%] flex items-center gap-2">
            <span className="opacity-50 text-xs uppercase px-2 py-0.5 border border-white/20 rounded">
              {fileType}
            </span>
            {fileName}
          </h3>
          <div className="flex items-center gap-2">
            <a 
              href={fileUrl} 
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Baixar original"
            >
              <Download className="w-5 h-5" />
            </a>
            <button 
              onClick={onClose}
              className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 bg-black/20 overflow-auto flex items-center justify-center p-1 relative min-h-[400px]">
          
          {/* VIDEO */}
          {fileType === 'video' && (
            <video controls autoPlay className="max-h-full max-w-full rounded-lg shadow-lg outline-none">
              <source src={fileUrl} />
              Seu navegador não suporta este vídeo.
            </video>
          )}

          {/* AUDIO */}
          {fileType === 'audio' && (
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-[var(--primary-500)]/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <FileText className="w-10 h-10 text-[var(--primary-500)]" />
              </div>
              <audio controls autoPlay className="w-[300px] sm:w-[400px]">
                <source src={fileUrl} />
              </audio>
            </div>
          )}

          {/* PDF */}
          {fileType === 'pdf' && (
            <iframe 
              src={`${fileUrl}#toolbar=0`} 
              className="w-full h-full min-h-[600px] rounded bg-white"
              title="PDF Preview"
            />
          )}

          {/* TEXTO */}
          {fileType === 'text' && (
            <div className="w-full h-full p-6 overflow-auto bg-[var(--surface-950)] text-gray-300 font-mono text-sm rounded border border-white/5">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-500)]" />
                  <span className="text-xs opacity-50">Lendo arquivo...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{textContent}</pre>
              )}
            </div>
          )}

          {/* IMAGEM */}
          {fileType === 'image' && (
            <img src={fileUrl} alt={fileName} className="max-h-full max-w-full object-contain rounded" />
          )}

          {/* NÃO SUPORTADO (DOCX, ETC) */}
          {fileType === 'other' && (
            <div className="text-center p-12 space-y-4">
              <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
              <h4 className="text-xl font-medium text-white">Visualização indisponível</h4>
              <p className="text-[var(--text-muted)] max-w-md mx-auto">
                Este formato de arquivo não pode ser exibido diretamente aqui.
                Você pode baixar o arquivo ou visualizá-lo externamente.
              </p>
              <div className="pt-4">
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary-600)] hover:bg-[var(--primary-500)] text-white font-medium rounded-lg transition-all shadow-lg shadow-[var(--primary-500)]/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir em Nova Aba
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}