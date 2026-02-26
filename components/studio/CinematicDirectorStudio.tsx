
import React, { useState, useRef, useEffect } from 'react';
import {
    X, Zap, Camera, Film, LayoutGrid, Sparkles, Loader2,
    ArrowRight, Download, History, Archive, Trash2,
    CheckCircle2, Monitor, Globe, Target, Cpu, RefreshCw, Plus,
    ShieldCheck, Image as ImageIcon, Activity, Droplets,
    PlusCircle, Maximize2, ChevronRight, ChevronDown
} from 'lucide-react';
import {
    enrichCinematicPrompt,
    generateCinematicBatch,
    suggestExpansionAngles
} from '../../services/geminiService';
import { downloadBlob } from '../../services/exportService';

interface ShotNode {
    id: string;
    modifier: string;
    result?: string;
    status: 'idle' | 'generating' | 'done' | 'error';
}

interface CinematicDirectorStudioProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (src: string) => void;
    onStash: (src: string) => void;
    initialImage?: string | null;
    isOnline?: boolean;
}

const SHOT_LIST_PHASE_1 = [
    "Establishing Wide Shot (Contextual Architecture)",
    "Full Body Action Wide Shot (Kinetic Integrity)",
    "Medium Hero Shot (Waist Up)",
    "Close-up Macro (Facial Pores & Micro-Emotion)",
    "Side Profile 45 Degrees (Cinematic Depth)",
    "Low Angle Ground Up (Dynamic Heroism)",
    "Bird's Eye Top Down (Aerial Geometry)",
    "Tight Macro Cutaway (Object/Material Detail)"
];

export const CinematicDirectorStudio: React.FC<CinematicDirectorStudioProps> = ({
    isOpen, onClose, onApply, onStash, initialImage, isOnline = true
}) => {
    const [userConcept, setUserConcept] = useState("");
    const [enrichedPrompt, setEnrichedPrompt] = useState("");
    const [identityAnchor, setIdentityAnchor] = useState<string | null>(initialImage || null);
    const [isEnriching, setIsEnriching] = useState(false);
    const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [currentPhase, setCurrentPhase] = useState<1 | 2>(1);
    const [selectedResult, setSelectedResult] = useState<string | null>(null);

    const [shots, setShots] = useState<ShotNode[]>(
        SHOT_LIST_PHASE_1.map((modifier, i) => ({ id: `s-${i}`, modifier, status: 'idle' }))
    );

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && initialImage) setIdentityAnchor(initialImage);
    }, [isOpen, initialImage]);

    if (!isOpen) return null;

    const handleEnrich = async () => {
        if (!isOnline) {
            alert("ONLINE CONNECTION REQUIRED FOR ENRICHMENT");
            return;
        }
        if (!userConcept.trim()) return;
        setIsEnriching(true);
        try {
            const enriched = await enrichCinematicPrompt(userConcept);
            setEnrichedPrompt(enriched);
        } catch (e) {
            console.error(e);
        } finally {
            setIsEnriching(false);
        }
    };

    const executeProduction = async () => {
        if (!isOnline) {
            alert("ONLINE CONNECTION REQUIRED FOR PRODUCTION");
            return;
        }
        if (!enrichedPrompt || isGeneratingBatch) return;
        setIsGeneratingBatch(true);
        setBatchProgress(0);

        const updatedShots = [...shots];
        for (let i = 0; i < updatedShots.length; i++) {
            if (updatedShots[i].status === 'done') continue;
            updatedShots[i].status = 'generating';
            setShots([...updatedShots]);
            setBatchProgress(Math.round(((i + 1) / updatedShots.length) * 100));

            try {
                const result = await generateCinematicBatch(enrichedPrompt, updatedShots[i].modifier, "16:9", identityAnchor || undefined);
                updatedShots[i].result = result;
                updatedShots[i].status = 'done';
            } catch (e) {
                updatedShots[i].status = 'error';
            }
            setShots([...updatedShots]);
            // Stabilizer delay
            await new Promise(r => setTimeout(r, 1000));
        }
        setIsGeneratingBatch(false);
    };

    const pushToPhase2 = async () => {
        if (!isOnline) {
            alert("ONLINE CONNECTION REQUIRED FOR EXPANSION");
            return;
        }
        if (isGeneratingBatch) return;
        setIsGeneratingBatch(true);
        setCurrentPhase(2);
        try {
            const suggestions = await suggestExpansionAngles(shots.map(s => s.modifier));
            const phase2Shots: ShotNode[] = suggestions.map((modifier, i) => ({
                id: `s2-${i}`, modifier, status: 'idle'
            }));
            const allShots = [...shots, ...phase2Shots];
            setShots(allShots);

            for (let i = 8; i < allShots.length; i++) {
                allShots[i].status = 'generating';
                setShots([...allShots]);
                setBatchProgress(Math.round(((i + 1) / allShots.length) * 100));

                const result = await generateCinematicBatch(enrichedPrompt, allShots[i].modifier, "16:9", identityAnchor || undefined);
                allShots[i].result = result;
                allShots[i].status = 'done';
                setShots([...allShots]);
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingBatch(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[8000] bg-black text-white flex flex-col font-sans overflow-hidden animate-in fade-in duration-500">
            <header className="h-16 px-8 border-b border-white/10 bg-[#050505] flex items-center justify-between shrink-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Film size={22} fill="white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black uppercase tracking-[0.2em]">Cinematic Director</span>
                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Multi-Angle Continuity v3.5</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/30 rounded-lg">
                            <Target size={12} className="text-indigo-400" />
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Taylor's 16-Angles Mode</span>
                        </div>
                        {isGeneratingBatch && (
                            <div className="flex items-center gap-3 px-4 py-1.5 bg-orange-600 text-white rounded-lg shadow-lg shadow-orange-900/20 animate-pulse">
                                <Loader2 size={12} className="animate-spin" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">RENDERING {batchProgress}%</span>
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"><X size={24} /></button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[380px] border-r border-white/10 bg-[#080808] flex flex-col shrink-0 overflow-y-auto studio-scrollbar p-6 space-y-10">
                    <section className="space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Globe size={14} className="text-indigo-400" /> Concept Architecture</span>
                        <div className="space-y-3">
                            <textarea
                                value={userConcept}
                                onChange={(e) => setUserConcept(e.target.value)}
                                placeholder="Describe the cinematic world... (e.g. 'Cyberpunk athlete in neon rain forest')"
                                className="w-full h-28 bg-black border border-white/10 rounded-2xl p-4 text-sm font-medium text-white focus:border-indigo-500/50 resize-none outline-none transition-all shadow-inner"
                            />
                            <button
                                onClick={handleEnrich}
                                disabled={isEnriching || !userConcept.trim()}
                                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
                            >
                                {isEnriching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                SYNERGIZE VIA NEURAL CORE
                            </button>
                        </div>
                    </section>

                    {enrichedPrompt && (
                        <section className="space-y-4 animate-in slide-in-from-left-4 duration-500">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2"><Sparkles size={14} /> Enriched Master Logic</span>
                            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl text-[11px] font-medium leading-relaxed text-slate-300 italic shadow-inner">
                                "{enrichedPrompt}"
                            </div>
                        </section>
                    )}

                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Cpu size={14} className="text-orange-500" /> Subject Identity Anchor</span>
                            <div className="flex items-center gap-2 px-2 py-0.5 bg-orange-500/10 rounded-md">
                                <Droplets size={10} className="text-orange-400 animate-pulse" />
                                <span className="text-[7px] font-black text-orange-400 uppercase tracking-widest">SKIN_LOCK</span>
                            </div>
                        </div>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3 group ${identityAnchor ? 'border-indigo-500/40 bg-black' : 'border-white/5 bg-white/5 hover:border-indigo-500/50'}`}
                        >
                            {identityAnchor ? (
                                <img src={identityAnchor} className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <>
                                    <ImageIcon size={24} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest group-hover:text-white">Inject Subject Face</span>
                                </>
                            )}
                            <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) { const r = new FileReader(); r.onload = (ev) => setIdentityAnchor(ev.target?.result as string); r.readAsDataURL(e.target.files[0]); } }} className="hidden" accept="image/*" />
                        </div>
                    </section>

                    <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                        <div className="bg-white/5 p-4 rounded-2xl space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">3D Volumetric Consistency</span>
                                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,1)]"></div><span className="text-[8px] font-bold text-green-500 uppercase">SYNCHRONIZED</span></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col gap-1 shadow-inner text-center">
                                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">PHASE</span>
                                    <span className="text-[9px] font-black text-indigo-400">{currentPhase}/2</span>
                                </div>
                                <div className="bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col gap-1 shadow-inner text-center">
                                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">ANGLES</span>
                                    <span className="text-[9px] font-black text-indigo-400">{shots.length} UNLOCKED</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={executeProduction}
                            disabled={isGeneratingBatch || !enrichedPrompt || !identityAnchor}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-30 group overflow-hidden relative"
                        >
                            {isGeneratingBatch ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="white" className="group-hover:rotate-12 transition-transform" />}
                            <span className="font-black uppercase tracking-[0.2em] text-xs">Initialize 16-Angles</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-[#050505] flex flex-col relative overflow-hidden">
                    <div className="flex-1 overflow-y-auto studio-scrollbar p-8">
                        <div className="grid grid-cols-4 gap-4 max-w-7xl mx-auto">
                            {shots.map((shot, idx) => (
                                <div
                                    key={shot.id}
                                    onClick={() => shot.result && setSelectedResult(shot.result)}
                                    className={`group relative aspect-video rounded-2xl border transition-all cursor-pointer overflow-hidden ${selectedResult === shot.result ? 'ring-4 ring-indigo-500/50 border-indigo-500' : 'border-white/5 bg-[#0a0a0a] hover:border-white/20 shadow-lg'}`}
                                >
                                    {shot.status === 'generating' ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm z-10">
                                            <Loader2 size={24} className="animate-spin text-indigo-400" />
                                            <span className="text-[7px] font-black uppercase tracking-widest text-indigo-400">Capturing Perspective...</span>
                                        </div>
                                    ) : shot.result ? (
                                        <img src={shot.result} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-10">
                                            <Camera size={32} strokeWidth={1} />
                                            <span className="text-[7px] font-black uppercase tracking-widest text-center px-4 leading-tight">{shot.modifier}</span>
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded text-[6px] font-black text-white uppercase tracking-widest border border-white/10 shadow-xl group-hover:bg-indigo-600 transition-colors">
                                        ANGLE {idx + 1}
                                    </div>
                                    {shot.status === 'error' && (
                                        <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                                            <span className="text-[8px] font-black uppercase text-white tracking-widest">Fault Detect</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {shots.length === 8 && !isGeneratingBatch && shots.every(s => s.status === 'done') && (
                                <button
                                    onClick={pushToPhase2}
                                    className="aspect-video rounded-2xl border-2 border-dashed border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all flex flex-col items-center justify-center gap-3 text-indigo-400 group shadow-inner"
                                >
                                    <PlusCircle size={32} strokeWidth={1} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.3em]">Neural Expansion (Next 8)</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {selectedResult && (
                        <div className="h-72 bg-black/95 backdrop-blur-2xl border-t border-white/10 shrink-0 p-8 flex gap-10 animate-in slide-in-from-bottom-6 duration-700 relative z-20 shadow-[0_-30px_60px_rgba(0,0,0,0.8)]">
                            <div className="aspect-video h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group/preview">
                                <img src={selectedResult} className="w-full h-full object-contain bg-black" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/preview:opacity-100 transition-opacity"></div>
                            </div>
                            <div className="flex-1 flex flex-col justify-center space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black uppercase tracking-widest text-white leading-none">Perspective Node</span>
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-3">2K UHD Neural Capture</span>
                                    </div>
                                    <div className="px-4 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-500 text-[8px] font-black uppercase tracking-widest shadow-inner">
                                        CONSISTENCY LOCKED
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => { onApply(selectedResult); onClose(); }} className="px-10 py-4 bg-white text-black rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.05] active:scale-95 transition-all">Apply to Workspace</button>
                                    <button onClick={() => onStash(selectedResult)} className="px-10 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:border-indigo-500 transition-all flex items-center gap-3 active:scale-95">
                                        <Archive size={18} /> Stash Asset
                                    </button>
                                    <button onClick={() => downloadBlob(selectedResult, `cine_shot_${Date.now()}.png`)} className="p-4 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-2xl transition-all shadow-xl active:scale-90"><Download size={22} /></button>
                                </div>
                            </div>
                            <button onClick={() => setSelectedResult(null)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
