
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Zap, Plus, Library, Trash2, Loader2, Image as ImageIcon, 
  Download, RefreshCw, Maximize2, Sliders, Layers, ArrowLeft,
  Monitor, Smartphone, Square, Layout, Sparkles, Check,
  BrainCircuit, ChefHat, Flame, Activity, Bot, CloudUpload,
  Camera, Film, Palette, Droplets, Settings2, Ratio, Target,
  Hash, History, Box, Minimize2, Archive, Wand2, ArrowRight,
  ChevronDown, MonitorDown, ArrowDownRight, ShieldCheck, Scan
} from 'lucide-react';
import { generateNanoImage } from '../../services/geminiService';
import { downloadBlob } from '../../services/exportService';
import { ChatMessage } from '../../types';

interface HistoryItem {
  src: string;
  source: 'cooked' | 'injected';
  timestamp: number;
}

interface NanoBananaGenProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (src: string) => void;
  onStash: (src: string) => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text?: string) => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  isChatLoading: boolean;
  chatAttachments: {file: File, url: string}[];
  setChatAttachments: React.Dispatch<React.SetStateAction<{file: File, url: string}[]>>;
  onOpenPurge?: (src: string) => void;
  onOpenRetouch?: (src: string) => void;
  onOpenUpscale?: (src: string) => void; 
  onOpenTitanFill?: (src: string) => void;
  initialImage?: string | null;
  sessionHistory?: HistoryItem[];
  setSessionHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
}

const QUANTUM_GRADES = [
  { id: 'Standard', label: 'STD', color: '#ffffff', desc: 'Standard SDR' },
  { id: 'Vivid Pop', label: 'VIVID', color: '#fbbf24', desc: 'Punchy Saturation' },
  { id: 'HDR Sharp', label: 'HDR', color: '#38bdf8', desc: 'Dynamic Range Pro' },
  { id: 'Elite', label: 'ELITE PRO', color: '#8b5cf6', desc: 'Master Color Grading' },
  { id: 'Deep Film', label: 'FILM', color: '#f472b6', desc: '35mm Grain & Tone' }
];

const ASPECT_RATIOS = [
    { label: "1:1", value: "1:1", icon: <Square size={12}/> },
    { label: "4:5", value: "3:4", icon: <Layout size={12}/> },
    { label: "16:9", value: "16:9", icon: <Monitor size={12}/> },
    { label: "9:16", value: "9:16", icon: <Smartphone size={12}/> }
];

export const NanoBananaGen: React.FC<NanoBananaGenProps> = ({ 
    isOpen, onClose, onApply, onStash, onOpenPurge, onOpenRetouch, onOpenUpscale, onOpenTitanFill,
    chatMessages, onSendMessage, chatInput, setChatInput, isChatLoading, chatAttachments, setChatAttachments,
    initialImage, sessionHistory = [], setSessionHistory
}) => {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [selectedGrade, setSelectedGrade] = useState("Standard");
  const [batchSize, setBatchSize] = useState(1);
  const [anchors, setAnchors] = useState<string[]>([]);
  
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEliteActive = selectedGrade === 'Elite';
  const isSkinLogicActive = /selfie|face|human|skin|portrait/i.test(prompt);

  useEffect(() => {
    if (isOpen && initialImage) {
        setAnchors(prev => prev.includes(initialImage) ? prev : [initialImage, ...prev].slice(0, 4));
        setSelectedImage(initialImage);
    }
  }, [isOpen, initialImage]);

  const handleGenerate = async () => {
    if (!prompt.trim() && anchors.length === 0) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedImage(null);

    try {
        const results: string[] = [];
        for (let i = 0; i < batchSize; i++) {
            const res = await generateNanoImage(prompt, aspectRatio, anchors.length > 0 ? anchors : null, selectedGrade);
            results.push(res);
            setGeneratedImages(prev => [...prev, res]);
            if (setSessionHistory) setSessionHistory(prev => [{ src: res, source: 'cooked', timestamp: Date.now() }, ...prev]);
        }
        if (results.length === 1) setSelectedImage(results[0]);
    } catch (err: any) {
        setError(err.message || "Synthesis Engine Fault");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-[#050505] text-slate-200 font-sans flex flex-col overflow-hidden animate-in fade-in duration-300">
        <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-black shrink-0 z-[100]">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-black shadow-lg">
                    <Flame size={20} fill="black" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Cooking Engine</span>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Neural Production Node</span>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"><X size={24} /></button>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <div className="w-[340px] bg-[#080808] border-r border-white/10 flex flex-col shrink-0 overflow-y-auto studio-scrollbar">
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><BrainCircuit size={14} className="text-indigo-400" /> Production Concept</label>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe visual context..." className="w-full h-32 bg-black border border-white/10 rounded-xl p-4 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500/50 resize-none font-medium" />
                        
                        <div className="flex flex-col gap-2">
                            {isEliteActive && (
                                <div className="px-3 py-2 bg-purple-600/10 border border-purple-500/30 rounded-lg flex items-center gap-2 animate-in slide-in-from-left-2">
                                    <Droplets size={12} className="text-purple-400 animate-pulse" />
                                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Elite Visual Logic Injected</span>
                                </div>
                            )}
                            {isSkinLogicActive && (
                                <div className="px-3 py-2 bg-indigo-600/10 border border-indigo-500/30 rounded-lg flex items-center gap-2 animate-in slide-in-from-left-2">
                                    <ShieldCheck size={12} className="text-indigo-400 animate-pulse" />
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Raw Texture Integrity Active</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Palette size={14} className="text-orange-400" /> Visual Calibration</label>
                        <div className="grid grid-cols-1 gap-2">
                            {QUANTUM_GRADES.map(g => (
                                <button key={g.id} onClick={() => setSelectedGrade(g.id)} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedGrade === g.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                                        <div className="flex flex-col text-left">
                                            <span className="text-[10px] font-black uppercase tracking-tight">{g.label}</span>
                                            <span className="text-[6px] font-bold opacity-60 uppercase">{g.desc}</span>
                                        </div>
                                    </div>
                                    {selectedGrade === g.id && <Check size={12} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Ratio size={14} className="text-blue-400" /> Target Geometry</label>
                        <div className="grid grid-cols-4 gap-2">
                            {ASPECT_RATIOS.map(r => (
                                <button key={r.value} onClick={() => setAspectRatio(r.value)} className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${aspectRatio === r.value ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                    {r.icon}
                                    <span className="text-[8px] font-black mt-1">{r.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-auto p-4 border-t border-white/5 bg-black">
                    <button onClick={handleGenerate} disabled={isGenerating} className="w-full h-14 bg-white text-black hover:bg-slate-100 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 disabled:opacity-30">
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <ChefHat size={18} />}
                        {isGenerating ? 'Synthesizing...' : 'Execute Production'}
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-[#050505] relative flex flex-col items-center justify-center p-8 overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-8 animate-in fade-in duration-700">
                        <div className="relative w-28 h-28">
                            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles size={40} className="text-indigo-400 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <span className="text-[13px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse block">NEURAL RENDER ACTIVE</span>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Applying {selectedGrade} Master Grading</p>
                        </div>
                    </div>
                ) : selectedImage ? (
                    <div className="relative group max-w-lg w-full aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500">
                        <img src={selectedImage} className="w-full h-full object-contain bg-black" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 backdrop-blur-[1px]">
                            <button onClick={() => onApply(selectedImage)} className="px-10 py-4 bg-white text-black rounded-2xl font-black text-[12px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl">Deploy to Canvas</button>
                            <div className="flex gap-2">
                                <button onClick={() => onStash(selectedImage)} className="p-3 bg-white/10 hover:bg-purple-600 text-white rounded-xl border border-white/10 transition-all"><Archive size={18}/></button>
                                <button onClick={() => downloadBlob(selectedImage, `render_pro_${Date.now()}.png`)} className="p-3 bg-white/10 hover:bg-white text-slate-200 hover:text-black rounded-xl border border-white/10 transition-all"><Download size={18}/></button>
                            </div>
                        </div>
                        <div className="absolute top-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-2">
                            <Activity size={12} className="text-indigo-500 animate-pulse" />
                            <span className="text-[8px] font-black text-white uppercase tracking-widest">SYNTHESIS SUCCESS: {selectedGrade.toUpperCase()}</span>
                        </div>
                    </div>
                ) : generatedImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 w-full max-w-4xl max-h-full overflow-y-auto p-4 custom-scrollbar">
                        {generatedImages.map((src, i) => (
                            <div key={i} onClick={() => setSelectedImage(src)} className="aspect-square rounded-[2rem] border border-white/10 overflow-hidden cursor-pointer hover:border-indigo-500 transition-all shadow-lg animate-in zoom-in-95 duration-500">
                                <img src={src} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-6 opacity-20 group">
                        <div className="w-32 h-32 rounded-[3rem] border-2 border-dashed border-white/20 flex items-center justify-center group-hover:border-indigo-500 group-hover:scale-110 transition-all duration-500">
                            <ChefHat size={64} strokeWidth={1} />
                        </div>
                        <span className="text-[14px] font-black uppercase tracking-[0.4em]">Node Waiting for Recipe</span>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
