
import React, { useState, useRef } from 'react';
import {
    X, Mic2, User, UserPlus, Zap, Loader2, Image as ImageIcon,
    Download, Sparkles, RefreshCw, Layout, Smartphone, ChevronDown,
    Activity, ShieldCheck, ArrowRight, Trash2, CheckCircle2,
    Trophy, MessageSquare, Flame, Archive
} from 'lucide-react';
import { generatePodcastScene } from '../../services/geminiService';
import { downloadBlob } from '../../services/exportService';

const PODCAST_TEMPLATES = [
    {
        id: 'joe_rogan_experience',
        name: 'Joe Rogan Experience',
        icon: <Mic2 size={16} />,
        color: 'bg-red-600',
        directive: "Right side: Joe Rogan (profile view). Background: 'THE JOE ROGAN EXPERIENCE' neon sign, red velvet curtain. Props: Shure mics."
    },
    {
        id: 'alex_hormozi_studio',
        name: 'Hormozi Studio',
        icon: <Trophy size={16} />,
        color: 'bg-slate-800',
        directive: "Right side: Alex Hormozi (beard, black t-shirt). Setting: Dark studio, vertical LED strips, wooden table."
    },
    {
        id: 'tony_robbins_seaside',
        name: 'Robbins Seaside',
        icon: <Flame size={16} />,
        color: 'bg-orange-600',
        directive: "Right side: Tony Robbins (black cap, muscular). Setting: Outdoor seaside, palm trees, ocean background."
    },
    {
        id: 'jack_neel_industrial',
        name: 'Neel Industrial',
        icon: <Activity size={16} />,
        color: 'bg-blue-600',
        directive: "Right side: Jack Neel (young, blond). Setting: Industrial hangar, metal walls. Props: Blue glass bottles."
    },
    {
        id: 'logan_paul_impaulsive',
        name: 'Paul Impaulsive',
        icon: <Smartphone size={16} />,
        color: 'bg-purple-600',
        directive: "Right side: Logan Paul (blond, relaxed). Setting: Modern studio, 'IMPAULSIVE' logo on screen. Props: PRIME bottles."
    }
];

interface PodcastStudioProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (src: string) => void;
    onStash: (src: string) => void;
    initialImage?: string | null;
}

export const PodcastStudio: React.FC<PodcastStudioProps> = ({ isOpen, onClose, onApply, onStash, initialImage }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(PODCAST_TEMPLATES[0]);
    const [userFace, setUserFace] = useState<string | null>(initialImage || null);
    const [userDirective, setUserDirective] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!userFace) return;
        setIsGenerating(true);
        setResult(null);
        try {
            const fullDirective = `${selectedTemplate.directive}. Left side: [USER_SUBJECT] interacting naturally. ${userDirective}`;
            const sceneResult = await generatePodcastScene(userFace, selectedTemplate.id, fullDirective);
            setResult(sceneResult);
        } catch (e) {
            console.error(e);
            alert("Podcast synthesis fault.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[6000] bg-black text-white flex flex-col font-sans overflow-hidden animate-in fade-in duration-500">
            <header className="h-16 px-8 border-b border-white/10 bg-[#050505] flex items-center justify-between shrink-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                            <Mic2 size={22} fill="white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black uppercase tracking-[0.2em]">Podcast Studio</span>
                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Identity Locking Engine</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <ShieldCheck size={12} className="text-green-500" />
                        <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">IDENTITY SHIELD ACTIVE</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"><X size={24} /></button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[380px] border-r border-white/10 bg-[#080808] flex flex-col shrink-0 overflow-y-auto studio-scrollbar p-6 space-y-10">
                    <section className="space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><User size={14} className="text-purple-400" /> Host Template</span>
                        <div className="grid grid-cols-1 gap-2">
                            {PODCAST_TEMPLATES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${selectedTemplate.id === t.id ? 'bg-indigo-600 border-indigo-500 shadow-lg scale-[1.02]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${selectedTemplate.id === t.id ? 'bg-white/20' : t.color}`}>
                                            {t.icon}
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${selectedTemplate.id === t.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{t.name}</span>
                                    </div>
                                    {selectedTemplate.id === t.id && <CheckCircle2 size={14} className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><UserPlus size={14} className="text-indigo-400" /> Guest Face Anchor</span>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative aspect-[3/4] rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3 group ${userFace ? 'border-indigo-500/40 bg-black' : 'border-white/5 bg-white/5 hover:border-indigo-500/20'}`}
                        >
                            {userFace ? (
                                <img src={userFace} className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <>
                                    <ImageIcon size={32} className="text-slate-700 group-hover:text-indigo-500 transition-colors" />
                                    <span className="text-[9px] font-black text-slate-600 group-hover:text-white uppercase tracking-widest">Inject Subject Face</span>
                                </>
                            )}
                            <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => setUserFace(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} className="hidden" accept="image/*" />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquare size={14} className="text-blue-400" /> Narrative Direction</span>
                        <textarea
                            value={userDirective}
                            onChange={(e) => setUserDirective(e.target.value)}
                            placeholder="Describe specific guest interaction (e.g. holding PRIME bottle, laughing, leaning forward)..."
                            className="w-full h-24 bg-black border border-white/10 rounded-2xl p-4 text-xs font-medium text-white focus:border-indigo-500/50 resize-none outline-none transition-all shadow-inner"
                        />
                    </section>

                    <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                        <div className="bg-white/5 p-4 rounded-2xl space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Synthesis Engine</span>
                                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span className="text-[8px] font-bold text-green-500">OPTIMIZED</span></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col gap-1 shadow-inner text-center">
                                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-wider">SKIN PORES</span>
                                    <span className="text-[9px] font-black text-indigo-400 uppercase">RAW_MODE</span>
                                </div>
                                <div className="bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col gap-1 shadow-inner text-center">
                                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-wider">IDENTITY</span>
                                    <span className="text-[9px] font-black text-indigo-400 uppercase">LOCKED</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !userFace}
                            className="w-full h-14 bg-white text-black hover:bg-slate-100 rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-30 group"
                        >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="black" className="group-hover:rotate-12 transition-transform" />}
                            <span className="font-black uppercase tracking-[0.2em] text-xs">Execute Production</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-[#050505] relative flex items-center justify-center p-12 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                    {isGenerating ? (
                        <div className="flex flex-col items-center gap-8 animate-in fade-in duration-700">
                            <div className="relative w-28 h-28">
                                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={40} className="text-indigo-400 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <span className="text-[13px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse block">NEURAL INJECTION ACTIVE</span>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Synthesizing environment & identity metadata</p>
                            </div>
                        </div>
                    ) : result ? (
                        <div className="relative group max-w-lg w-full aspect-[9/16] bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                            <img src={result} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 backdrop-blur-[1px]">
                                <button onClick={() => { onApply(result); setIsAdded(true); setTimeout(() => setIsAdded(false), 2000); }} className={`px-10 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all shadow-2xl ${isAdded ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-white text-black hover:scale-105 active:scale-95'}`}>
                                    {isAdded ? 'DEPLOYED TO CANVAS' : 'Apply to Canvas'}
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => onStash(result)} className="p-3 bg-white/10 hover:bg-white text-slate-200 hover:text-black rounded-xl border border-white/10 transition-all shadow-lg active:scale-90"><Archive size={20} /></button>
                                    <button onClick={() => downloadBlob(result, `podcast_interview_${Date.now()}.png`)} className="p-3 bg-white/10 hover:bg-white text-slate-200 hover:text-black rounded-xl border border-white/10 transition-all shadow-lg active:scale-90"><Download size={20} /></button>
                                </div>
                            </div>
                            <div className="absolute top-6 right-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-2">
                                <Activity size={12} className="text-green-500 animate-pulse" />
                                <span className="text-[8px] font-black text-white uppercase tracking-widest">SINTESIS BERHASIL 2K UHD</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6 opacity-20 group">
                            <div className="w-32 h-32 rounded-[2.5rem] border-2 border-dashed border-white/20 flex items-center justify-center group-hover:border-indigo-500 group-hover:scale-110 transition-all duration-500">
                                <Mic2 size={64} strokeWidth={1} />
                            </div>
                            <span className="text-[14px] font-black uppercase tracking-[0.4em]">Node Waiting for Identity Anchor</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
