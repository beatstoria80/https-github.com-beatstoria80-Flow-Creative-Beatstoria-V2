import React, { useState, useEffect, useRef } from 'react';
import {
    X, Plus, Database, Cpu, MessageSquare, Sparkles,
    Loader2, Trash2, History, Send, Link as LinkIcon,
    Microscope, Tag, ArrowRight, CheckCircle2, Layout,
    FileIcon, FileText, ImageIcon, Globe2, Table, ChevronRight,
    CircleDashed, Workflow, BarChart4, Briefcase, GraduationCap,
    RefreshCw, Layers, Globe, Search, Download, Archive,
    ChevronLeft, ChevronsLeft, ChevronsRight, Target, Zap,
    Copy, Edit3, Check, FileJson, FileType, FileSpreadsheet, MoreHorizontal,
    Maximize2, Minimize2, ArrowLeft, ArrowRight as ArrowRightIcon,
    AlertCircle
} from 'lucide-react';
import { NoteDocument } from '../../types';
import { getAI } from '../../services/geminiService';

// Interface for structured response chain
interface AnalysisChainItem {
    id: number;
    title: string;
    content: string;
    isTyping: boolean;
    isEditing: boolean;
    status: 'idle' | 'generating' | 'done' | 'error';
    sources?: any[];
}

interface TaggedData {
    id: string;
    text: string;
    label: string;
    timestamp: number;
}

// Added SpaceNoteLMProps interface to resolve the missing type error
interface SpaceNoteLMProps {
    isOpen: boolean;
    onClose: () => void;
    documents: NoteDocument[];
    onUpload: () => void;
    onDeleteDoc: (id: string) => void;
}

export const SpaceNoteLM: React.FC<SpaceNoteLMProps> = ({ isOpen, onClose, documents, onUpload, onDeleteDoc }) => {
    const [analysisQuery, setAnalysisQuery] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeAnalysisMode, setActiveAnalysisMode] = useState<string | null>(null);

    // CHAIN REACTION STATE (3 RESPONSES)
    const [responseChain, setResponseChain] = useState<AnalysisChainItem[]>([
        { id: 0, title: "RESPONS 1: ANALISA DATA & KONTEKS", content: "", isTyping: false, isEditing: true, status: 'idle' },
        { id: 1, title: "RESPONS 2: STRATEGI IMPLEMENTASI", content: "", isTyping: false, isEditing: true, status: 'idle' },
        { id: 2, title: "RESPONS 3: PROYEKSI & VALUASI", content: "", isTyping: false, isEditing: true, status: 'idle' }
    ]);

    const [cacheHistory, setCacheHistory] = useState<{ id: string, text: string, time: number }[]>([]);
    const [taggedIndices, setTaggedIndices] = useState<Set<number>>(new Set());
    const [taggedSources, setTaggedSources] = useState<TaggedData[]>([]);
    const [exportMenuOpen, setExportMenuOpen] = useState<number | null>(null);
    const [focusedResponseIndex, setFocusedResponseIndex] = useState<number | null>(null);
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    const updateChainItem = (index: number, updates: Partial<AnalysisChainItem>) => {
        setResponseChain(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
    };

    useEffect(() => {
        const handleClickOutside = () => setExportMenuOpen(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleAnalisaNode = async () => {
        if (!analysisQuery.trim() || isAnalyzing) return;

        setIsAnalyzing(true);
        setResponseChain(prev => prev.map(item => ({ ...item, content: "", status: 'idle', sources: undefined })));
        setTaggedIndices(new Set());

        updateChainItem(0, { status: 'generating', isTyping: true });

        try {
            // Updated GoogleGenAI initialization
            const ai = getAI();
            const contextText = documents.map(d => `[FILE: ${d.title}]\n${d.content.substring(0, 20000)}`).join('\n\n');

            const systemPrompt = `
            ROLE: Senior Strategic Research Lead (Space NoteLM).
            TASK: EXPAND the data provided in documents based on user query: "${analysisQuery}".
            
            CRITICAL DIRECTIVE: 
            Do NOT provide generic summaries. 
            Analyze the relationship between the user's question and the specific data in the repository.
            Provide a deep, technical, and analytical response (Minimum 600 words).
            If the query is specific, answer with technical precision.
            
            CONTEXT REPOSITORY:
            ${contextText}
            
            MODE: ${activeAnalysisMode || 'DEEP_SYNTHESIS'}
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: systemPrompt,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });

            const text = response.text || "Analisa tidak menghasilkan output.";
            updateChainItem(0, {
                content: text,
                status: 'done',
                isTyping: false,
                sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks
            });
            setCacheHistory(prev => [{ id: `hist-${Date.now()}`, text: text, time: Date.now() }, ...prev]);

        } catch (e: any) {
            updateChainItem(0, { content: `ERROR: ${e.message}`, status: 'error', isTyping: false });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleTriggerNextChain = async (sourceIndex: number) => {
        if (sourceIndex >= 2) return;
        const targetIndex = sourceIndex + 1;
        const sourceItem = responseChain[sourceIndex];

        updateChainItem(targetIndex, { status: 'generating', isTyping: true, content: "" });

        try {
            // Updated GoogleGenAI initialization
            const ai = getAI();
            const chainPrompt = `
            PROTOCOL: NARRATIVE CHAIN STAGE ${targetIndex + 1}
            PREVIOUS CONTEXT:
            ${sourceItem.content}
            
            OBJECTIVE: 
            Building on the previous analysis, generate: "${responseChain[targetIndex].title}".
            Provide specific actionable insights, timelines, or technical projections.
            Minimum 500 words.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: chainPrompt,
                config: { tools: [{ googleSearch: {} }] }
            });

            updateChainItem(targetIndex, {
                content: response.text || "Chain reaction fault.",
                status: 'done',
                isTyping: false,
                sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks
            });
        } catch (e: any) {
            updateChainItem(targetIndex, { content: `Chain Error: ${e.message}`, status: 'error', isTyping: false });
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Text copied");
    };

    const handleClearResponse = (index: number) => {
        if (window.confirm("Clear this node?")) {
            updateChainItem(index, { content: "", status: 'idle', sources: undefined });
        }
    };

    const handleExport = (text: string, format: 'doc' | 'xml' | 'csv' | 'txt' | 'pdf' = 'txt') => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `neural_export_${Date.now()}.${format}`;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-[7500] bg-[#050505] flex flex-col font-sans animate-in fade-in duration-500 overflow-hidden text-slate-300">
            <div className="h-14 border-b border-white/5 bg-black flex items-center justify-between px-6 shrink-0 relative z-50">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-none bg-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-600/20">
                        <Database size={18} fill="white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">SPACE NOTELM</span>
                        <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">STRUCTURED SYNTHESIS V5.2</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600/10 border border-indigo-500/30 rounded-none">
                        <div className="w-1.5 h-1.5 rounded-none bg-indigo-500 animate-ping"></div>
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{documents.length} NODES</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-none text-slate-400 hover:text-white transition-all"><X size={22} /></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-6 gap-0 relative">
                <div className={`flex flex-col shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${leftPanelCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[340px] opacity-100'}`}>
                    <div className="flex flex-col gap-4 h-full pr-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-orange-500">
                                <Globe size={14} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">REPOSITORI</span>
                            </div>
                            <button onClick={onUpload} className="w-10 h-10 bg-orange-600 rounded-none flex items-center justify-center text-white shadow-xl hover:bg-orange-500 transition-all active:scale-95"><Plus size={18} strokeWidth={4} /></button>
                        </div>
                        <div className="flex-1 bg-black/40 border border-white/5 rounded-none p-4 flex flex-col gap-3 overflow-hidden shadow-inner">
                            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
                                {documents.map(doc => (
                                    <div key={doc.id} className="group flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-none hover:border-orange-500/40 transition-all cursor-default">
                                        <div className="w-9 h-9 rounded-none flex items-center justify-center border border-white/5 bg-black shrink-0">
                                            {doc.type === 'pdf' ? <FileIcon size={16} /> : (doc.type === 'image' ? <ImageIcon size={16} /> : (doc.type === 'web' ? <Globe2 size={16} className="text-orange-500" /> : <FileText size={16} />))}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-black uppercase truncate block text-slate-300">{doc.title}</span>
                                        </div>
                                        <button onClick={() => onDeleteDoc(doc.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-700 min-w-0">
                    <div className="flex-1 bg-black border border-white/5 rounded-none overflow-hidden flex flex-col relative shadow-2xl">
                        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-6 snap-x snap-mandatory" ref={scrollRef}>
                            {responseChain.map((item, idx) => (
                                <div key={idx} className="min-w-[450px] w-[32%] flex-shrink-0 flex flex-col bg-[#0a0a0a] border border-white/10 rounded-none overflow-hidden shadow-2xl group/card relative transition-all hover:border-white/20 h-full snap-center">
                                    <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/40 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-none ${idx === 0 ? 'bg-purple-500' : idx === 1 ? 'bg-cyan-500' : 'bg-yellow-500'}`}></div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.title}</span>
                                        </div>
                                        <button onClick={() => setFocusedResponseIndex(idx)} className="p-1 hover:bg-white/10 rounded-md text-slate-500 hover:text-white transition-all"><Maximize2 size={14} /></button>
                                    </div>
                                    <div className="flex-1 relative bg-[#0a0a0a]">
                                        {item.status === 'generating' ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                                <Loader2 size={32} className="animate-spin text-indigo-500" />
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">SINTESIS NEURAL...</span>
                                            </div>
                                        ) : (
                                            <textarea
                                                value={item.content}
                                                onChange={(e) => updateChainItem(idx, { content: e.target.value })}
                                                className="w-full h-full bg-transparent border-none p-6 text-[11px] font-medium leading-relaxed text-slate-300 outline-none focus:bg-white/5 transition-all resize-none rounded-none custom-scrollbar"
                                                spellCheck={false}
                                            />
                                        )}
                                        {idx < 2 && item.content && item.status === 'done' && (
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20">
                                                <button onClick={() => handleTriggerNextChain(idx)} className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl border-4 border-black hover:scale-110 active:scale-95 transition-all group/trigger"><Tag size={16} /><ArrowRight size={16} className="hidden group-hover/trigger:block" /></button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-3 py-2 border-t border-white/5 bg-[#050505] flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleCopy(item.content)} className="p-1.5 rounded-none text-slate-500 hover:text-white hover:bg-white/5 transition-all"><Copy size={12} /></button>
                                            <button onClick={() => handleClearResponse(idx)} className="p-1.5 rounded-none text-slate-600 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-6 py-3 border-t border-white/5 bg-black shrink-0 flex flex-col gap-2 z-40 relative">
                            <div className="flex items-center gap-4">
                                <div className={`flex-1 flex items-center border rounded-none p-1 transition-all shadow-2xl border-white/10 focus-within:border-indigo-500/40 bg-[#0a0a0a]`}>
                                    <input
                                        type="text"
                                        value={analysisQuery}
                                        onChange={(e) => setAnalysisQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAnalisaNode()}
                                        placeholder="Ketik topik riset atau instruksi spesifik..."
                                        className="flex-1 bg-transparent border-none text-[12px] font-bold px-4 py-2.5 focus:ring-0 outline-none text-white placeholder:text-slate-700 h-10"
                                    />
                                    <button
                                        onClick={handleAnalisaNode}
                                        disabled={isAnalyzing || !analysisQuery.trim()}
                                        className={`px-8 h-10 border rounded-none font-black text-[10px] uppercase transition-all active:scale-[0.97] disabled:opacity-30 flex items-center gap-2 ${isAnalyzing ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-orange-600 hover:text-white'}`}
                                    >
                                        {isAnalyzing ? <Loader2 size={14} className="animate-spin text-indigo-400" /> : <Sparkles size={14} className="text-orange-500" />}
                                        <span>ANALISA</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`flex flex-col shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${rightPanelCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[300px] opacity-100'}`}>
                    <div className="flex flex-col gap-4 h-full pl-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <History size={14} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">CACHE</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-black/40 border border-white/5 rounded-none flex flex-col overflow-hidden shadow-2xl relative">
                            <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-4">
                                {cacheHistory.map(item => (
                                    <div key={item.id} className="p-5 bg-white/5 border border-white/5 rounded-none hover:bg-white/10 transition-all cursor-pointer group">
                                        <p className="text-[10px] font-medium text-slate-400 line-clamp-3">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
