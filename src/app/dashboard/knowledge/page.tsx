'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  UploadCloud, FileText, Video, Loader2, CheckCircle, 
  AlertCircle, Trash2, Eye, File as FileIcon, Music, Tag, Shield, Settings, Plus
} from 'lucide-react';
import { FilePreviewModal } from '@/components/FilePreviewModal';

// --- TIPOS ---
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
  tags: string[];
  accessLevel: number;
}

interface DefinedTag { id: string; name: string; }
interface DefinedLevel { id: string; name: string; levelNumber: number; }

export default function KnowledgeBasePage() {
  // Tabs: 'files' | 'settings'
  const [activeTab, setActiveTab] = useState<'files' | 'settings'>('files');

  // Dados Principais
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [availableTags, setAvailableTags] = useState<DefinedTag[]>([]);
  const [availableLevels, setAvailableLevels] = useState<DefinedLevel[]>([]);

  // Estados de Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  // Seleção no Upload
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(0);

  // Estados de Configuração (Aba Settings)
  const [newTagName, setNewTagName] = useState('');
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelNum, setNewLevelNum] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // CORREÇÃO: Tipagem correta para o preview
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

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    // 1. Busca Docs
    fetch('/api/documents').then(res => res.json()).then(data => {
      if(data.documents) setDocuments(data.documents);
    });

    // 2. Busca Configurações (Tags/Levels)
    fetch('/api/consultant/settings').then(res => res.json()).then(data => {
      if(data.tags) setAvailableTags(data.tags);
      if(data.levels) setAvailableLevels(data.levels);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Polling para status de processamento
  useEffect(() => {
    const hasPending = documents.some(d => d.status === 'PENDING' || d.status === 'PROCESSING');
    if (hasPending) {
      const interval = setInterval(() => {
         fetch('/api/documents').then(res => res.json()).then(data => {
            if(data.documents) setDocuments(data.documents);
         });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [documents]);

  // --- SETTINGS HANDLERS ---
  const handleCreateTag = async () => {
    if(!newTagName.trim()) return;
    const res = await fetch('/api/consultant/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'TAG', name: newTagName })
    });
    if(res.ok) {
      setNewTagName('');
      fetchData();
    } else {
      alert("Erro ao criar tag");
    }
  };

  const handleCreateLevel = async () => {
    if(!newLevelName.trim()) return;
    const res = await fetch('/api/consultant/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'LEVEL', name: newLevelName, levelNumber: newLevelNum })
    });
    if(res.ok) {
      setNewLevelName('');
      setNewLevelNum(prev => prev + 1);
      fetchData();
    } else {
      alert("Erro ao criar nível");
    }
  };

  const handleDeleteSetting = async (id: string, type: 'TAG' | 'LEVEL') => {
    if(!confirm("Tem certeza?")) return;
    await fetch(`/api/consultant/settings?id=${id}&type=${type}`, { method: 'DELETE' });
    fetchData();
  };

  // --- UPLOAD HANDLERS ---
  const toggleTagSelection = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(prev => prev.filter(t => t !== tagName));
    } else {
      setSelectedTags(prev => [...prev, tagName]);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 300);

      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${cleanName}`;
      
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      clearInterval(progressInterval);
      if (error) throw error;
      setUploadProgress(100);

      let mediaType: MediaType = 'TEXT';
      if (file.type.startsWith('video/')) mediaType = 'VIDEO';
      if (file.type.startsWith('audio/')) mediaType = 'AUDIO';

      await fetch('/api/documents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileKey: data.path,
          mediaType: mediaType,
          tags: selectedTags,
          accessLevel: selectedLevel
        }),
      });

      setSelectedTags([]);
      setSelectedLevel(0);
      fetchData();
      
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir arquivo?')) return;
    await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  // --- CORREÇÃO AQUI: Lógica de Preview Restaurada ---
  const handleViewFile = async (doc: DocumentItem) => {
     if (!doc.fileKey) return alert('Arquivo não encontrado.');
     
     try {
       const { data, error } = await supabase.storage
         .from('documents')
         .createSignedUrl(doc.fileKey, 3600);

       if (error || !data) throw new Error('Erro ao gerar link');

       // Lógica para detectar tipo de arquivo pela extensão
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

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if(e.dataTransfer.files) handleFileUpload(e.dataTransfer.files); };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 min-h-screen">
      
      {/* HEADER E ABAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
          <p className="text-zinc-400">Gerencie seus materiais e estruture o acesso.</p>
        </div>
        <div className="flex bg-[#18181b] p-1 rounded-lg border border-white/10">
           <button 
             onClick={() => setActiveTab('files')}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'files' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
           >
             Meus Arquivos
           </button>
           <button 
             onClick={() => setActiveTab('settings')}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
           >
             <Settings className="w-4 h-4" /> Configurações
           </button>
        </div>
      </div>

      {/* === ABA: ARQUIVOS (UPLOAD + LISTA) === */}
      {activeTab === 'files' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* UPLOAD BOX */}
          <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 space-y-6">
             <div className="grid md:grid-cols-2 gap-6">
                
                {/* Seleção de Tags */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Etiquetas (Tags)</label>
                  <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-zinc-800/50 rounded-lg border border-white/10">
                    {availableTags.length === 0 && <span className="text-xs text-zinc-600 p-1">Nenhuma tag criada.</span>}
                    {availableTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTagSelection(tag.name)}
                        className={`text-xs px-2 py-1 rounded-md border transition-all ${
                          selectedTags.includes(tag.name) 
                            ? 'bg-indigo-500 text-white border-indigo-400' 
                            : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20'
                        }`}
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seleção de Nível */}
                <div className="space-y-2">
                   <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Nível de Acesso</label>
                   <div className="relative">
                     <Shield className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                     <select
                       value={selectedLevel}
                       onChange={(e) => setSelectedLevel(Number(e.target.value))}
                       className="w-full bg-zinc-800/50 text-white text-sm pl-10 pr-4 py-2.5 rounded-lg border border-white/10 outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                     >
                        <option value={0}>Nível 0 (Padrão)</option>
                        {availableLevels.map(lvl => (
                          <option key={lvl.id} value={lvl.levelNumber}>
                            Nível {lvl.levelNumber} - {lvl.name}
                          </option>
                        ))}
                     </select>
                   </div>
                </div>
             </div>

             {/* DROPZONE */}
             <div
               onClick={() => fileInputRef.current?.click()}
               onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
               className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'} ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
             >
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="mt-2 text-sm text-zinc-400">Enviando arquivo...</p>
                    <div className="w-64 h-1.5 bg-zinc-700 mt-3 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="w-8 h-8 text-zinc-500" />
                    <p className="text-zinc-300 font-medium">Clique para enviar arquivo</p>
                    <p className="text-xs text-zinc-500">Será salvo com as tags e nível selecionados.</p>
                  </div>
                )}
             </div>
          </div>

          {/* LISTA DE ARQUIVOS */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Arquivos Enviados</h2>
            <div className="grid gap-3">
              {documents.map(doc => (
                <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#18181b] border border-white/5 rounded-xl gap-4">
                   
                   <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 flex-shrink-0">
                        {doc.mediaType === 'VIDEO' ? <Video className="w-5 h-5" /> : 
                         doc.mediaType === 'AUDIO' ? <Music className="w-5 h-5" /> :
                         <FileIcon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 
                          onClick={() => handleViewFile(doc)} 
                          className="text-sm font-medium text-white truncate cursor-pointer hover:text-indigo-400"
                        >
                          {doc.fileName}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded border border-white/5 font-mono">
                               Lvl {doc.accessLevel || 0}
                          </span>
                          {doc.tags && doc.tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">#{tag}</span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5">
                           <span className="text-xs text-zinc-500">
                             {new Date(doc.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                           </span>
                           {doc.status === 'COMPLETED' && <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle className="w-3 h-3" /> Indexado</span>}
                           {doc.status === 'PROCESSING' && <span className="flex items-center gap-1 text-[10px] text-amber-400"><Loader2 className="w-3 h-3 animate-spin" /> Processando</span>}
                           {doc.status === 'FAILED' && <span className="flex items-center gap-1 text-[10px] text-red-400"><AlertCircle className="w-3 h-3" /> Falha</span>}
                        </div>

                        {doc.summary && <p className="text-xs text-zinc-500 mt-2 italic border-l-2 border-white/10 pl-2 line-clamp-2">{doc.summary}</p>}
                      </div>
                   </div>

                   <div className="flex items-center gap-2 self-end sm:self-center">
                     <button 
                       onClick={() => handleViewFile(doc)} 
                       className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg"
                       title="Visualizar"
                     >
                       <Eye className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => handleDelete(doc.id)} 
                       className="p-2 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-lg"
                       title="Excluir"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === ABA: CONFIGURAÇÕES === */}
      {activeTab === 'settings' && (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-500">
          
          {/* GERENCIAR TAGS */}
          <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 space-y-6">
             <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <Tag className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-white">Gerenciar Etiquetas</h3>
             </div>
             
             <div className="flex gap-2">
               <input 
                 value={newTagName}
                 onChange={e => setNewTagName(e.target.value)}
                 placeholder="Nova tag (ex: vendas)"
                 className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
               />
               <button onClick={handleCreateTag} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg">
                 <Plus className="w-5 h-5" />
               </button>
             </div>

             <div className="space-y-2">
               {availableTags.length === 0 && <p className="text-sm text-zinc-500">Nenhuma tag cadastrada.</p>}
               {availableTags.map(tag => (
                 <div key={tag.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-white/5 group">
                    <span className="text-sm text-zinc-300">#{tag.name}</span>
                    <button onClick={() => handleDeleteSetting(tag.id, 'TAG')} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
               ))}
             </div>
          </div>

          {/* GERENCIAR NÍVEIS */}
          <div className="bg-[#18181b] p-6 rounded-xl border border-white/5 space-y-6">
             <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-white">Gerenciar Níveis</h3>
             </div>
             
             <div className="flex gap-2">
               <input 
                 type="number"
                 value={newLevelNum}
                 onChange={e => setNewLevelNum(Number(e.target.value))}
                 className="w-16 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 text-center"
               />
               <input 
                 value={newLevelName}
                 onChange={e => setNewLevelName(e.target.value)}
                 placeholder="Nome do nível (ex: Mentoria)"
                 className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
               />
               <button onClick={handleCreateLevel} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg">
                 <Plus className="w-5 h-5" />
               </button>
             </div>

             <div className="space-y-2">
               {availableLevels.length === 0 && <p className="text-sm text-zinc-500">Nenhum nível cadastrado.</p>}
               {availableLevels.map(lvl => (
                 <div key={lvl.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-white/5 group">
                    <div className="flex items-center gap-3">
                       <span className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">{lvl.levelNumber}</span>
                       <span className="text-sm text-zinc-300">{lvl.name}</span>
                    </div>
                    <button onClick={() => handleDeleteSetting(lvl.id, 'LEVEL')} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {/* MODAL DE PREVIEW */}
      <FilePreviewModal 
        isOpen={previewData.isOpen}
        onClose={() => setPreviewData({ ...previewData, isOpen: false })}
        fileUrl={previewData.url}
        fileName={previewData.name}
        fileType={previewData.type}
      />
    </div>
  );
}