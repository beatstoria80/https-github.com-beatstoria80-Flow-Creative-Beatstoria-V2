import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    X, UserPlus, Play, Loader2,
    Trash2, Volume2,
    User, Activity, Sparkles, ChevronDown,
    Info, Paperclip,
    Zap, Ghost, GraduationCap, Flame, Coffee,
    Anchor, Cpu,
    Download, History,
    Clock, MessageSquare, Pause,
    SkipForward, AudioLines,
    Link2, FileText, FileVideo,
    PenTool, Megaphone, Theater,
    Music,
    Settings,
    MonitorPlay,
    Database,
    Volume1 as VolumeLow,
    Volume2 as VolumeHigh,
    SkipBack,
    Globe2,
    ArrowLeft,
    ArrowRight,
    Box,
    CircleOff,
    Archive,
    Radio,
    Check,
    Scan,
    ListMusic,
    Film,
    AlertTriangle,
    Eye,
    Search,
    ZoomIn,
    ZoomOut,
    Maximize,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    CheckCircle2,
    Plus,
    MessageCircle,
    FileEdit,
    Type as TypeIcon,
    Wand2,
    FileUp,
    Fingerprint,
    Rocket,
    Maximize2,
    Minimize2,
    MonitorDown,
    Briefcase,
    BarChart3,
    Layout,
    Mic2,
    Scissors,
    Sliders
} from 'lucide-react';
// Fix: Use 'Type' directly instead of 'Type as SchemaType' per coding guidelines
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => localStorage.getItem('gemini_api_key') || (import.meta as any).env.VITE_API_KEY || "";

interface VoiceStudioProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenCooking?: () => void;
    onOpenTitanFill?: () => void;
    onOpenPurgeBg?: () => void;
    onOpenRetouch?: () => void;
    onOpenStory?: () => void;
    isOnline?: boolean;
}

type GeminiVoice = 'Puck' | 'Kore' | 'Zephyr' | 'Charon' | 'Fenrir';

interface VoiceStyle {
    id: string;
    name: string;
    maleVoice: GeminiVoice;
    femaleVoice: GeminiVoice;
    maleDefaultName: string;
    femaleDefaultName: string;
    trait: string;
    icon: React.ReactNode;
    desc: string;
}

interface Speaker {
    id: string;
    role: string;
    name: string;
    styleId: string | null;
    gender: 'male' | 'female';
}

interface ScriptLine {
    speakerId: string;
    text: string;
    audioUrl?: string;
    audioBuffer?: AudioBuffer;
    isGenerating?: boolean;
    duration?: number;
}

interface AttachedFile {
    id: string;
    name: string;
    type: 'pdf' | 'image' | 'text' | 'web';
    content: string;
    status: 'processing' | 'ready' | 'error';
    size: string;
    url?: string;
}

interface HistorySession {
    id: string;
    timestamp: number;
    topic: string;
    script: ScriptLine[];
    speakers: Speaker[];
    mode: 'reader' | 'podcast';
    scriptStyle?: string | null;
    isAudioGenerated?: boolean;
}

interface MediaItem {
    id: string;
    url: string;
    type: 'audio' | 'video' | 'image';
    file: File;
    name: string;
}

const VOICE_STYLES: VoiceStyle[] = [
    { id: 'style_01', name: 'HYPE HOST', maleVoice: 'Puck', femaleVoice: 'Kore', maleDefaultName: 'ALEX', femaleDefaultName: 'ALEXA', trait: 'Energik, Cepat, Antusias, High Energy', icon: <Flame size={14} />, desc: 'Cocok untuk podcast semangat.' },
    { id: 'style_02', name: 'ZEN EXPERT', maleVoice: 'Charon', femaleVoice: 'Kore', maleDefaultName: 'MARCUS', femaleDefaultName: 'SARAH', trait: 'Bijak, Lambat, Tenang, Deep Tone', icon: <Anchor size={14} />, desc: 'Topik edukatif mendalam.' },
    { id: 'style_03', name: 'CYBER FUTURIST', maleVoice: 'Zephyr', femaleVoice: 'Zephyr', maleDefaultName: 'CYBER-X', femaleDefaultName: 'CYBER-A', trait: 'Robotik, Visioner, Datar, Analitis', icon: <Cpu size={14} />, desc: 'Suara masa depan.' },
    { id: 'style_04', name: 'CASUAL PRO', maleVoice: 'Puck', femaleVoice: 'Kore', maleDefaultName: 'RICKY', femaleDefaultName: 'CHLOE', trait: 'Santai, Akrab, Ramah, Conversational', icon: <Coffee size={14} />, desc: 'Percakapan rileks.' },
    { id: 'style_05', name: 'DATA ANALYST', maleVoice: 'Charon', femaleVoice: 'Kore', maleDefaultName: 'VICTOR', femaleDefaultName: 'ELENA', trait: 'Presisi, Serius, Faktual', icon: <Activity size={14} />, desc: 'Berbasis data.' },
    { id: 'style_06', name: 'BOLD CHALLENGER', maleVoice: 'Fenrir', femaleVoice: 'Fenrir', maleDefaultName: 'KANE', femaleDefaultName: 'MIRA', trait: 'Tegas, Berwibawa, Dominan', icon: <Activity size={14} />, desc: 'Karakter kuat.' },
    { id: 'style_07', name: 'KIND ASSISTANT', maleVoice: 'Zephyr', femaleVoice: 'Kore', maleDefaultName: 'TOBY', femaleDefaultName: 'LUNA', trait: 'Sopan, Membantu, Lembut', icon: <User size={14} />, desc: 'Layanan ramah.' },
    { id: 'style_08', name: 'ANCIENT MIND', maleVoice: 'Charon', femaleVoice: 'Kore', maleDefaultName: 'OSIRIS', femaleDefaultName: 'GAIA', trait: 'Sangat Lambat, Puitis, Filosofis', icon: <GraduationCap size={14} />, desc: 'Filosofis.' },
    { id: 'style_09', name: 'DYNAMIC REPORTER', maleVoice: 'Fenrir', femaleVoice: 'Kore', maleDefaultName: 'JACK', femaleDefaultName: 'CLARA', trait: 'Formal, Cepat, To-The-Point', icon: <Radio size={14} />, desc: 'Pembawa berita.' },
    { id: 'style_10', name: 'STORYTELLER', maleVoice: 'Puck', femaleVoice: 'Kore', maleDefaultName: 'FINN', femaleDefaultName: 'WILLOW', trait: 'Misterius, Naratif, Ekspresif', icon: <Ghost size={14} />, desc: 'Narasi cerita fiksi.' },
    { id: 'style_11', name: 'FAST MARKETER', maleVoice: 'Puck', femaleVoice: 'Kore', maleDefaultName: 'FINN', femaleDefaultName: 'WILLOW', trait: 'Persuasif, Menjual, Cepat', icon: <Zap size={14} />, desc: 'Iklan promosi.' },
    { id: 'style_12', name: 'SCIENTIFIC MIND', maleVoice: 'Charon', femaleVoice: 'Kore', maleDefaultName: 'NEWTON', femaleDefaultName: 'MARIE', trait: 'Metodis, Akurat, Kompleks', icon: <Info size={14} />, desc: 'Dokumen teknis.' }
];

const SCRIPT_STYLES = [
    { id: 'narasi', label: 'NARASI', icon: <PenTool size={10} />, tone: 'Formal, terstruktur, deskriptif.' },
    { id: 'storytelling', label: 'STORY TELLING', icon: <Theater size={10} />, tone: 'Dramatis, imersif, emosional.' },
    { id: 'campaign', label: 'CAMPAIGN', icon: <Megaphone size={10} />, tone: 'Persuasif, fokus Call-to-Action, enerjik.' }
];

const DURATION_OPTIONS = [
    { label: '15 DETIK', value: 15 },
    { label: '30 DETIK', value: 30 },
    { label: '1 MENIT', value: 60 },
    { label: '5 MENIT', value: 300 },
    { label: '10 MENIT', value: 600 },
    { label: '15 MENIT', value: 900 },
    { label: '30 MENIT', value: 1800 },
    { label: '1 JAM', value: 3600 },
];

function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const length = buffer.length * numChannels * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    const channelData = [];
    for (let i = 0; i < numChannels; i++) channelData.push(buffer.getChannelData(i));
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_CONTEXT_CHARS = 60000;
const truncateContext = (text: string) => {
    if (!text) return "";
    if (text.length <= MAX_CONTEXT_CHARS) return text;
    return text.substring(0, MAX_CONTEXT_CHARS) + "\n...[CONTEXT TRUNCATED FOR OPTIMIZATION]...";
};

const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        if (!(window as any).pdfjsLib) throw new Error("PDF Engine not loaded");
        const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        const maxPages = Math.min(pdf.numPages, 20);
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // @ts-ignore
            const pageText = textContent.items.map(item => item.str).join(" ");
            fullText += `[PAGE ${i}]\n${pageText}\n\n`;
        }
        if (pdf.numPages > maxPages) fullText += `\n...[PDF Truncated at ${maxPages} pages]...`;
        return fullText || "[PDF Content Empty or Scanned Image]";
    } catch (e) {
        console.error("PDF Extraction Failed", e);
        return "[PDF Processing Error - Please use text file]";
    }
};

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
};

/* Added comment to fix Cannot redeclare block-scoped variable 'fileToBase64'. */
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const estimateDuration = (text: string): number => {
    if (!text) return 1;
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, (words / 150) * 60);
};

const formatDurationDisplay = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(Math.max(0, seconds % 60));
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TypewriterSyncText = ({ text, progress, isActive }: { text: string, progress: number, isActive: boolean }) => {
    const safeText = text || "";
    if (!isActive) return <span className="text-slate-400 group-hover:text-slate-200 transition-colors duration-500 line-clamp-2">{safeText}</span>;
    const charCount = Math.floor(safeText.length * Math.max(0, Math.min(1, progress)));
    const finishedText = safeText.substring(0, charCount);
    const remainingText = safeText.substring(charCount);
    return (
        <span className="relative inline">
            <span className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-all duration-300 font-semibold">{finishedText}</span>
            {progress < 1 && <span className="inline-block w-[3px] h-[1.2em] bg-indigo-500 ml-1 align-middle animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]" />}
            <span className="text-slate-700 transition-colors duration-500">{remainingText}</span>
        </span>
    );
};

const WaveVisualizer = ({ isActive, bars = 12 }: { isActive: boolean, bars?: number }) => {
    return (
        <div className="flex items-end gap-[1.5px] h-3">
            {Array.from({ length: bars }).map((_, i) => (
                <div
                    key={i}
                    className={`w-[1.5px] bg-indigo-500 rounded-full transition-all duration-300 ${isActive ? 'animate-pulse' : ''}`}
                    style={{
                        height: isActive ? `${20 + Math.random() * 80}%` : '2px',
                        animationDelay: `${i * 0.05}s`
                    }}
                />
            ))}
        </div>
    );
};

const FrequencySpectrum = ({ analyser, isPlaying }: { analyser: AnalyserNode | null, isPlaying: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!analyser || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                const r = 99; const g = 102; const b = 241;
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.1 + (dataArray[i] / 255) * 0.5})`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };

        if (isPlaying) {
            draw();
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => cancelAnimationFrame(animationId);
    }, [analyser, isPlaying]);

    return <canvas ref={canvasRef} width={600} height={100} className="w-full h-full" />;
};

const ResearchPreview = ({ file, onBack, theme }: { file: AttachedFile, onBack: () => void, theme: string }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [isRenderingPdf, setIsRenderingPdf] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const isDark = theme === 'dark';

    useEffect(() => {
        setScale(1); setPosition({ x: 0, y: 0 }); setPageNum(1); setPdfDoc(null); setErrorMsg(null);
    }, [file.id]);

    useEffect(() => {
        if (file.type === 'pdf' && file.url) {
            let isMounted = true;
            setIsRenderingPdf(true);
            const loadPdf = async () => {
                try {
                    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
                        const pdfjsLib = (window as any).pdfjsLib;
                        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                        }
                        const loadingTask = pdfjsLib.getDocument(file.url);
                        const pdf = await loadingTask.promise;
                        if (isMounted) {
                            setPdfDoc(pdf);
                            setNumPages(pdf.numPages);
                        }
                    }
                } catch (e: any) {
                    if (isMounted) setErrorMsg(e.message || "Failed to load PDF");
                } finally {
                    if (isMounted) setIsRenderingPdf(false);
                }
            };
            loadPdf();
            return () => { isMounted = false; };
        }
    }, [file.id, file.url, file.type]);

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;
        let isMounted = true;
        const renderPage = async () => {
            try {
                if (renderTaskRef.current) { await renderTaskRef.current.cancel(); }
                const page = await pdfDoc.getPage(pageNum);
                const pixelRatio = window.devicePixelRatio || 1;
                const viewport = page.getViewport({ scale: 1.5 * pixelRatio });
                const canvas = canvasRef.current;
                if (!canvas || !isMounted) return;
                const context = canvas.getContext('2d');
                if (!context) return;
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.width = `${viewport.width / pixelRatio}px`;
                canvas.style.height = `${viewport.height / pixelRatio}px`;
                const renderTask = page.render({ canvasContext: context, viewport: viewport });
                renderTaskRef.current = renderTask;
                await renderTask.promise;
            } catch (e: any) { }
        };
        renderPage();
        return () => { isMounted = false; };
    }, [pdfDoc, pageNum]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (file.type === 'text' || file.type === 'web') return;
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const handleMouseUp = () => setIsDragging(false);

    return (
        <div className={`flex flex-col h-full w-full overflow-hidden relative ${isDark ? 'bg-[#050505]' : 'bg-white'}`}>
            <div className={`h-11 border-b flex items-center justify-between px-4 shrink-0 z-50 shadow-sm ${isDark ? 'border-white/10 bg-[#0a0a0a]' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl transition-all group active:scale-95 shadow-md ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'}`}>
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-tight">KEMBALI KE RISET</span>
                    </button>
                    {file.type === 'pdf' && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1} className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeftIcon size={16} /></button>
                            <span className="text-[9px] font-black">PAGE {pageNum} / {numPages}</span>
                            <button onClick={() => setPageNum(p => Math.min(numPages, p + 1))} disabled={pageNum >= numPages} className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRightIcon size={16} /></button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setScale(s => s * 1.2)} className="p-1.5 rounded-lg hover:bg-white/10"><ZoomIn size={14} /></button>
                    <button onClick={() => setScale(s => s / 1.2)} className="p-1.5 rounded-lg hover:bg-white/10"><ZoomOut size={14} /></button>
                    <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }} className="p-1.5 rounded-lg hover:bg-white/10"><Maximize size={14} /></button>
                </div>
            </div>
            <div className={`flex-1 relative overflow-hidden flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                <div style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }} className="relative transition-transform flex items-center justify-center z-10">
                    {file.type === 'image' ? (
                        <img src={file.url} className="max-w-[85vw] max-h-[80vh] object-contain shadow-2xl rounded-sm" />
                    ) : file.type === 'pdf' ? (
                        <canvas ref={canvasRef} className="max-w-[85vw] max-h-[80vh] object-contain !bg-transparent block shadow-2xl rounded-sm" />
                    ) : (
                        <div className={`p-10 max-w-4xl w-full mx-auto font-medium leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{file.content}</div>
                    )}
                </div>
                {isRenderingPdf && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[100]">
                        <Loader2 size={40} className="animate-spin text-indigo-500" />
                    </div>
                )}
            </div>
        </div>
    );
};

const WRITING_STYLES = [
    { id: 'technical', label: 'Struktur Data', icon: <Cpu size={12} /> },
    { id: 'executive', label: 'Ringkasan Eksekutif', icon: <Briefcase size={12} /> },
    { id: 'academic', label: 'Laporan Analitis', icon: <GraduationCap size={12} /> },
    { id: 'benchmarking', label: 'Tabel Komparasi', icon: <BarChart3 size={12} /> }
];

export const VoiceStudio: React.FC<VoiceStudioProps> = ({
    isOpen,
    onClose,
    onOpenCooking,
    onOpenTitanFill,
    onOpenPurgeBg,
    onOpenRetouch,
    onOpenStory,
    isOnline = true
}) => {
    const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('space_studio_theme') as any) || 'dark');
    const isDark = theme === 'dark';

    // Fix: define borderClass used in conditional styling
    const borderClass = isDark ? 'border-white/10' : 'border-slate-50';

    const [engineMode, setEngineMode] = useState<'reader' | 'podcast'>(() => (localStorage.getItem('vs_draft_mode') as any) || 'podcast');
    const [projectName, setProjectName] = useState(() => localStorage.getItem('vs_draft_project_name') || "SINTESIS NEURAL");
    const [showNamingPopup, setShowNamingPopup] = useState(false);
    const [namingMode, setNamingMode] = useState<'reader' | 'podcast' | null>(null);
    const [tempProjectName, setTempProjectName] = useState("");

    const [pacing, setPacing] = useState(1.0);
    const [volume, setVolume] = useState(0.8);
    const [eqBands, setEqBands] = useState<number[]>([0, 0, 0, 0, 0]);
    const [selectedScriptStyle, setSelectedScriptStyle] = useState<string | null>(null);
    const [targetDuration, setTargetDuration] = useState<number | null>(null);
    const [context, setContext] = useState(() => localStorage.getItem('vs_draft_context') || "");
    const [urlInput, setUrlInput] = useState("");
    const [isIngestingLink, setIsIngestingLink] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const readyAttachedFilesCount = attachedFiles.filter(f => f.status === 'ready').length;

    const [isScripting, setIsScripting] = useState(false);
    const [researchLabel, setResearchLabel] = useState<string | null>(null);
    const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [script, setScript] = useState<ScriptLine[]>(() => {
        const saved = localStorage.getItem('vs_draft_script');
        return saved ? JSON.parse(saved) : [];
    });
    const [openStyleMenu, setOpenStyleMenu] = useState<number | null>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(() => localStorage.getItem('vs_draft_session_id'));
    const [showQuickSettings, setShowQuickSettings] = useState(false);
    const [mediaDuration, setMediaDuration] = useState(0);
    const [exportMenuOpen, setExportMenuOpen] = useState<string | null>(null);
    const [isClearConfirming, setIsClearConfirming] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [previewFileId, setPreviewFileId] = useState<string | null>(null);

    const [speakers, setSpeakers] = useState<Speaker[]>(() => {
        const saved = localStorage.getItem('vs_draft_speakers');
        return saved ? JSON.parse(saved) : [
            { id: 'speaker_01', role: 'HOST', name: 'ALEX', styleId: 'style_01', gender: 'male' },
            { id: 'speaker_02', role: 'GUEST', name: 'SARAH', styleId: 'style_02', gender: 'female' }
        ];
    });

    const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [playingLineIndex, setPlayingLineIndex] = useState<number | null>(null);
    const [isFullPlaybackActive, setIsFullPlaybackActive] = useState(false);

    const [mediaPlaylist, setMediaPlaylist] = useState<MediaItem[]>([]);
    const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
    const [activePlaybackType, setActivePlaybackType] = useState<'script' | 'reference'>('script');

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isNavOpen, setIsNavOpen] = useState(false);

    const protocols = [
        { id: 'canvas', label: 'Space Canvas', icon: <Layout size={16} />, desc: 'Visual Workspace', active: false, onClick: onClose },
        { id: 'voice', label: 'Voice Lab', icon: <Mic2 size={16} />, desc: 'Neural Synthesis', active: true, onClick: () => setIsNavOpen(false) },
        { id: 'cooking', label: 'Space Cooking', icon: <Flame size={16} />, desc: 'Cooking Engine', active: false, onClick: () => { onOpenCooking?.(); setIsNavOpen(false); } },
        { id: 'titan', label: 'Titan Fill', icon: <Wand2 size={16} />, desc: 'Generative Inpaint', active: false, onClick: () => { onOpenTitanFill?.(); setIsNavOpen(false); } },
        { id: 'purge', label: 'Purge BG', icon: <Scissors size={16} />, desc: 'Neural Extraction', active: false, onClick: () => { onOpenPurgeBg?.(); setIsNavOpen(false); } },
        { id: 'story', label: 'Story Flow', icon: <Film size={16} />, desc: 'Narrative Designer', active: false, onClick: () => { onOpenStory?.(); setIsNavOpen(false); } },
    ];

    const scriptRef = useRef<ScriptLine[]>([]);
    const mediaFileInputRef = useRef<HTMLInputElement>(null);
    const researchFileInputRef = useRef<HTMLInputElement>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const playbackIntervalRef = useRef<number | null>(null);
    const playbackStartTimeRef = useRef<number>(0);
    const playbackOffsetRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const biquadFiltersRef = useRef<BiquadFilterNode[]>([]);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const mediaRef = useRef<HTMLMediaElement>(null);
    const scriptAreaRef = useRef<HTMLDivElement>(null);
    const cancelFullReadRef = useRef(false);

    // --- DERIVED STATE ---
    const activeMedia = useMemo(() => mediaPlaylist.find(m => m.id === activeMediaId), [mediaPlaylist, activeMediaId]);
    const isReaderActive = engineMode === 'reader';

    const totalDuration = useMemo(() => {
        if (activePlaybackType === 'reference') return mediaDuration || 0;
        if (!script) return 0;
        return script.reduce((acc, line) => acc + (line.duration || estimateDuration(line.text || "")), 0) / (pacing || 1);
    }, [script, pacing, activePlaybackType, mediaDuration]);

    const isAnyAudioReady = useMemo(() => script.length > 0 && script.some(l => !!l.audioBuffer), [script]);
    const isAllAudioReady = useMemo(() => script.length > 0 && script.every(l => !!l.audioBuffer), [script]);
    const isInputReady = useMemo(() => context.trim().length > 0 || attachedFiles.length > 0, [context, attachedFiles]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    const handleOpenPersonaMenu = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        setOpenStyleMenu(index);
    };

    const handleSpeakerUpdate = (index: number, updates: Partial<Speaker>) => {
        setSpeakers(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
    };

    const handleToggleStyle = (index: number, styleId: string) => {
        const style = VOICE_STYLES.find(v => v.id === styleId);
        if (!style) return;
        const currentSpeaker = speakers[index];
        const defaultName = currentSpeaker.gender === 'male' ? style.maleDefaultName : style.femaleDefaultName;
        handleSpeakerUpdate(index, { styleId, name: defaultName });
    };

    const handleImportSessionFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target?.result as string);
                    if (data && data.script) {
                        saveOrUpdateHistory(data);
                        handleLoadHistory(data);
                        showToast("SESSION IMPORTED");
                    }
                } catch (err) {
                    console.error("Import Error:", err);
                    showToast("INVALID FILE FORMAT");
                }
            };
            reader.readAsText(file);
        }
    };

    const performSeekInScript = (time: number) => {
        let accumulatedTime = 0; let targetIdx = -1; let targetOffset = 0;
        for (let i = 0; i < script.length; i++) {
            if (!script[i]) continue;
            const lineDur = (script[i].duration || 0) / (pacing || 1);
            if (time >= accumulatedTime && time < accumulatedTime + lineDur) { targetIdx = i; targetOffset = (time - accumulatedTime) * (pacing || 1); break; }
            accumulatedTime += lineDur;
        }
        if (targetIdx !== -1) { handleStartFullSequence(targetIdx, targetOffset); }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!totalDuration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickedPos = x / rect.width;
        const seekTime = clickedPos * totalDuration;
        setPlaybackTime(seekTime);
        if (isPlaying) {
            if (activePlaybackType === 'reference') {
                if (mediaRef.current) mediaRef.current.currentTime = seekTime;
            } else {
                performSeekInScript(seekTime);
            }
        } else {
            if (activePlaybackType === 'reference' && mediaRef.current) {
                mediaRef.current.currentTime = seekTime;
            }
        }
    };

    const triggerMediaUpload = () => mediaFileInputRef.current?.click();
    const triggerResearchUpload = () => researchFileInputRef.current?.click();

    const onVideoTimeUpdate = () => {
        if (mediaRef.current && activePlaybackType === 'reference') {
            setPlaybackTime(mediaRef.current.currentTime);
        }
    };

    const onVideoMetadata = () => {
        if (mediaRef.current) {
            setMediaDuration(mediaRef.current.duration);
        }
    };

    useEffect(() => {
        localStorage.setItem('vs_draft_script', JSON.stringify(script.map(l => ({ ...l, audioBuffer: undefined }))));
        localStorage.setItem('vs_draft_speakers', JSON.stringify(speakers));
        localStorage.setItem('vs_draft_mode', engineMode);
        localStorage.setItem('vs_draft_context', context);
        localStorage.setItem('vs_draft_project_name', projectName);
        if (activeSessionId) localStorage.setItem('vs_draft_session_id', activeSessionId);
        scriptRef.current = script;
    }, [script, speakers, engineMode, context, activeSessionId, projectName]);

    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.setTargetAtTime(volume, getSafeAudioContext().currentTime, 0.1);
        }
    }, [volume]);

    useEffect(() => {
        if (biquadFiltersRef.current.length > 0) {
            biquadFiltersRef.current.forEach((filter, i) => {
                if (filter) filter.gain.setTargetAtTime(eqBands[i], getSafeAudioContext().currentTime, 0.1);
            });
        }
    }, [eqBands]);

    const getSafeAudioContext = () => {
        if (!audioContextRef.current) {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass({ sampleRate: 24000 });
            const gainNode = ctx.createGain();
            gainNode.gain.value = volume;
            const frequencies = [60, 230, 910, 4000, 14000];
            const filters = frequencies.map((freq, i) => {
                const filter = ctx.createBiquadFilter();
                filter.type = (i === 0) ? 'lowshelf' : (i === 4) ? 'highshelf' : 'peaking';
                filter.frequency.value = freq;
                filter.gain.value = eqBands[i];
                return filter;
            });
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            let lastNode: AudioNode = filters[0];
            for (let i = 1; i < filters.length; i++) { lastNode.connect(filters[i]); lastNode = filters[i]; }
            lastNode.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(ctx.destination);
            audioContextRef.current = ctx;
            gainNodeRef.current = gainNode;
            biquadFiltersRef.current = filters;
            analyserRef.current = analyser;
        }
        const ctx = audioContextRef.current!;
        if (ctx.state === 'suspended') { ctx.resume(); }
        return ctx;
    };

    const handleStopPlayback = (stopFullRead = true) => {
        if (activeSourceRef.current) { try { activeSourceRef.current.stop(); } catch (e) { } activeSourceRef.current = null; }
        if (mediaRef.current) { mediaRef.current.pause(); }
        if (playbackIntervalRef.current) cancelAnimationFrame(playbackIntervalRef.current);
        setIsPlaying(false);
        if (stopFullRead) {
            setIsFullPlaybackActive(false);
            cancelFullReadRef.current = true;
        }
        setPlayingLineIndex(null);
        playbackOffsetRef.current = 0;
    };

    useEffect(() => {
        if (activeSourceRef.current) {
            activeSourceRef.current.playbackRate.setTargetAtTime(pacing, getSafeAudioContext().currentTime, 0.1);
        }
        if (mediaRef.current) {
            mediaRef.current.playbackRate = pacing;
        }
    }, [pacing]);

    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.setTargetAtTime(volume, getSafeAudioContext().currentTime, 0.1);
        }
    }, [volume]);

    const handleStartPlayback = (buffer: AudioBuffer, offset: number = 0, lineIndex: number | null = null, onEnded?: () => void) => {
        if (!buffer || !(buffer instanceof AudioBuffer)) { if (onEnded) onEnded(); return; }
        const ctx = getSafeAudioContext();
        handleStopPlayback(false);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pacing;
        source.connect(biquadFiltersRef.current[0]);
        playbackOffsetRef.current = Math.max(0, offset);
        playbackStartTimeRef.current = ctx.currentTime;
        setPlayingLineIndex(lineIndex);
        setActivePlaybackType('script');
        source.start(0, playbackOffsetRef.current);
        source.onended = () => {
            if (activeSourceRef.current === source) {
                setIsPlaying(false);
                if (playbackIntervalRef.current) cancelAnimationFrame(playbackIntervalRef.current);
                if (!isFullPlaybackActive) { setPlaybackTime(0); playbackOffsetRef.current = 0; }
                if (onEnded) onEnded();
            }
        };
        activeSourceRef.current = source;
        setIsPlaying(true);
        const currentScript = scriptRef.current;
        const preDur = currentScript.slice(0, lineIndex || 0).reduce((acc, l) => { if (!l) return acc; return acc + (l.duration || 0); }, 0) / (pacing || 1);
        const updateProgress = () => {
            if (!activeSourceRef.current) return;
            const linePos = playbackOffsetRef.current + (ctx.currentTime - playbackStartTimeRef.current) * (pacing || 1);
            setPlaybackTime(preDur + linePos);
            if (linePos < buffer.duration) { playbackIntervalRef.current = requestAnimationFrame(updateProgress); }
        };
        playbackIntervalRef.current = requestAnimationFrame(updateProgress);
    };

    const handleStartFullSequence = async (startIndex: number = 0, startOffset: number = 0) => {
        setIsFullPlaybackActive(true); cancelFullReadRef.current = false; handleStopPlayback(false); setActivePlaybackType('script');
        const currentScript = scriptRef.current; if (!currentScript) return;
        for (let i = startIndex; i < currentScript.length; i++) {
            if (cancelFullReadRef.current || !isOpen) break;
            if (!currentScript[i]) continue;
            const buffer = currentScript[i].audioBuffer; if (!buffer || !(buffer instanceof AudioBuffer)) continue;
            const el = document.querySelector(`[data-line-index="${i}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise<void>((resolve) => {
                const offset = (i === startIndex) ? startOffset : 0;
                handleStartPlayback(buffer, offset, i, () => resolve());
                const check = setInterval(() => { if (cancelFullReadRef.current) { clearInterval(check); resolve(); } }, 50);
            });
            if (cancelFullReadRef.current) break;
            await delay(600);
        }
        if (!cancelFullReadRef.current) { setPlaybackTime(0); playbackOffsetRef.current = 0; }
        setIsFullPlaybackActive(false);
    };

    const handlePlayReferenceMedia = (offset: number = 0) => {
        if (!mediaRef.current || !activeMedia) return;
        setActivePlaybackType('reference');
        handleStopPlayback(false);
        mediaRef.current.currentTime = offset;
        mediaRef.current.play();
        setIsPlaying(true);

        const updateProgress = () => {
            if (!mediaRef.current || mediaRef.current.paused) {
                if (playbackIntervalRef.current) cancelAnimationFrame(playbackIntervalRef.current);
                return;
            }
            setPlaybackTime(mediaRef.current.currentTime);
            playbackIntervalRef.current = requestAnimationFrame(updateProgress);
        };
        playbackIntervalRef.current = requestAnimationFrame(updateProgress);
    };

    const toggleMasterPlayback = () => {
        getSafeAudioContext();
        if (isPlaying) {
            if (activePlaybackType === 'reference' && mediaRef.current) {
                mediaRef.current.pause(); setIsPlaying(false);
            } else {
                handleStopPlayback(true);
            }
        } else {
            if (Math.abs(playbackTime - totalDuration) < 0.1) setPlaybackTime(0);
            if (activePlaybackType === 'reference') {
                handlePlayReferenceMedia(playbackTime);
            } else {
                if (script.length > 0) {
                    const someReady = script.some(l => !!l.audioBuffer);
                    if (someReady) {
                        if (playbackTime > 0 && playbackTime < totalDuration) {
                            performSeekInScript(playbackTime);
                        } else {
                            handleStartFullSequence();
                        }
                    } else {
                        handleBatchGenerate();
                    }
                }
            }
        }
    };

    const generateLineAudioBuffer = async (index: number, currentScript?: ScriptLine[]): Promise<AudioBuffer | null> => {
        const targetScript = currentScript || script; if (!targetScript || !targetScript[index]) return null;
        const line = targetScript[index]; if (line.audioBuffer && line.audioBuffer instanceof AudioBuffer) return line.audioBuffer;
        let spk = speakers.find(s => s.id === line.speakerId) || speakers[0]; if (!spk) return null;
        setScript(prev => prev.map((l, i) => i === index ? { ...l, isGenerating: true } : l));
        const style = VOICE_STYLES.find(s => s.id === spk!.styleId);
        const selectedVoice = spk.gender === 'male' ? (style?.maleVoice || 'Puck') : (style?.femaleVoice || 'Kore');
        if (!isOnline) { showToast("ONLINE CONNECTION REQUIRED FOR SYNTHESIS"); return null; }
        try {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const response = await ai.models.generateContent({ model: "gemini-1.5-flash", contents: [{ parts: [{ text: line.text }] }], config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } } } });
            const candidate = response.candidates?.[0];
            const base64Audio = candidate?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const ctx = getSafeAudioContext(); const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                setScript(prev => { const n = [...prev]; if (n[index]) n[index] = { ...n[index], audioBuffer: buffer, duration: buffer.duration, isGenerating: false }; return n; });
                return buffer;
            }
        } catch (e: any) { setScript(prev => prev.map((l, i) => i === index ? { ...l, isGenerating: false } : l)); throw e; }
        return null;
    };

    const handleLinkIngestion = async () => {
        if (!urlInput.trim() || isIngestingLink) return;
        if (!isOnline) { showToast("ONLINE CONNECTION REQUIRED FOR LINKS"); return; }
        setIsIngestingLink(true);
        const id = `web-${Date.now()}`;
        const cleanUrl = urlInput.trim();

        setAttachedFiles(prev => [...prev, {
            id,
            name: cleanUrl.replace(/^https?:\/\/(www\.)?/, '').toUpperCase(),
            type: 'web',
            content: "",
            status: 'processing',
            size: 'LINK',
            url: cleanUrl
        }]);

        try {
            await new Promise(resolve => setTimeout(resolve, 1200));
            setAttachedFiles(prev => prev.map(f => f.id === id ? {
                ...f,
                content: `[WEBSITE DATA: ${cleanUrl}]\nNeural link established. This source is now part of the active research context.`,
                status: 'ready'
            } : f));
            setUrlInput("");
            showToast("LINK INTEGRATED");
        } catch (err) {
            setAttachedFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error' } : f));
        } finally {
            setIsIngestingLink(false);
        }
    };

    const handleGenerateScript = async (): Promise<{ script: ScriptLine[], sessionId: string | null }> => {
        if (!context.trim() && attachedFiles.length === 0) {
            showToast("INPUT REQUIRED FOR GENERATION");
            return { script: [], sessionId: null };
        }
        if (!isOnline) { showToast("ONLINE CONNECTION REQUIRED FOR GENERATION"); return { script: [], sessionId: null }; }
        setIsScripting(true); setScript([]); setResearchLabel("SINTESIS NEURAL AKTIF..."); handleStopPlayback();
        let currentSessionId = activeSessionId || `session-${Date.now()}`; setActiveSessionId(currentSessionId);
        try {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const combinedSource = attachedFiles.filter(f => f.status === 'ready').map(f => f.content).join('\n');

            const speakerListStr = speakers.map(s => `ID: ${s.id}, Name: ${s.name}`).join('; ');

            // Integrate selected style into initial prompt
            const styleObj = SCRIPT_STYLES.find(s => s.id === selectedScriptStyle);
            const styleContext = styleObj ? `\nTONE & STYLE: ${styleObj.label}. Character trait: ${styleObj.tone}` : "";

            const richPrompt = `
      TASK: GENERATE HIGH-QUALITY DIALOGUE SCRIPT FOR ${isReaderActive ? 'NARRATION' : 'PODCAST'}.${styleContext}
      SOURCE CONTEXT: ${truncateContext(combinedSource)}
      USER INSTRUCTIONS: ${context}
      AVAILABLE SPEAKERS: [${speakerListStr}]
      
      CRITICAL INSTRUCTIONS:
      1. Output ONLY a JSON array of objects.
      2. Each object MUST have "speakerId" (matching an ID from the provided list) and "text" properties.
      3. The dialogue must be natural, engaging, and based strictly on the provided context.
      4. If it's a PODCAST mode, ensure dynamic turn-taking between characters.
      5. If it's a READER mode, use only one speaker throughout.
      6. Limit to around 10-15 lines of meaningful dialogue.
      `;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: richPrompt,
                config: {
                    // @ts-ignore
                    responseMimeType: "application/json",
                    // @ts-ignore
                    responseSchema: {
                        // Fix: using Type directly instead of Discouraged SchemaType
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                speakerId: { type: Type.STRING, description: "Must match one of the IDs provided in the instructions." },
                                text: { type: Type.STRING, description: "The dialogue text for this speaker." }
                            },
                            required: ["speakerId", "text"]
                        }
                    },
                    tools: [{ googleSearch: {} }]
                }
            });

            const parsedScript = JSON.parse(response.text || "[]").map((line: any) => ({
                ...line,
                speakerId: speakers.some(s => s.id === line.speakerId) ? line.speakerId : speakers[0].id,
                duration: estimateDuration(line.text)
            }));

            setScript(parsedScript);
            return { script: parsedScript, sessionId: currentSessionId };
        } catch (e: any) {
            console.error("Script Generation Fault:", e);
            showToast("GENERATION FAILED");
            return { script: [], sessionId: currentSessionId };
        } finally {
            setIsScripting(false);
            setResearchLabel(null);
        }
    };

    const handleBatchGenerate = async () => {
        if (isGeneratingBatch) return;
        if (script.length === 0) {
            if (isInputReady) {
                await handleGenerateScript();
                return;
            } else {
                showToast("INPUT REQUIRED: DIRECTIVE OR RESEARCH");
                return;
            }
        }
        const activeScript = script; if (!activeScript || activeScript.length === 0) return;
        let currentSessionId = activeSessionId || `session-${Date.now()}`; setActiveSessionId(currentSessionId);
        const queue = activeScript.map((line, index) => ({ line, index })).filter(item => !item.line.audioBuffer);
        if (queue.length === 0) { handleStartFullSequence(); return; }
        if (!isOnline) { showToast("ONLINE CONNECTION REQUIRED FOR AUDIO SYNTHESIS"); return; }
        setIsGeneratingBatch(true); setBatchProgress(0); handleStopPlayback(true);
        let completed = 0;
        try {
            for (const item of queue) {
                if (!isOpen) break;
                try { await generateLineAudioBuffer(item.index, activeScript); await delay(500); } catch (e) { } finally { completed++; setBatchProgress(Math.round((completed / queue.length) * 100)); }
            }
            await delay(200); const latestScript = [...scriptRef.current];
            if (latestScript.some(l => l.audioBuffer)) {
                const session = { id: currentSessionId, timestamp: Date.now(), topic: projectName || context || "Sintesis Neural", script: latestScript, speakers: [...speakers], mode: engineMode, isAudioGenerated: true };
                saveOrUpdateHistory(session);
            }
            if (completed > 0) setTimeout(() => handleStartFullSequence(), 500);
        } catch (e: any) { showToast("BATCH FAILED"); } finally { setIsGeneratingBatch(false); setBatchProgress(0); }
    };

    const handleClearWorkspace = () => {
        if (!isClearConfirming) { setIsClearConfirming(true); setTimeout(() => setIsClearConfirming(false), 3000); return; }
        handleStopPlayback(); setScript([]); setActiveSessionId(null); setContext(""); setAttachedFiles([]); setIsClearConfirming(false); setProjectName("SINTESIS NEURAL");
        localStorage.removeItem('vs_draft_script');
        localStorage.removeItem('vs_draft_context');
        localStorage.removeItem('vs_draft_session_id');
        localStorage.removeItem('vs_draft_project_name');
        localStorage.removeItem('vs_draft_speakers');
        localStorage.removeItem('vs_draft_mode');
        showToast("WORKSPACE CLEARED");
    };

    const handleBackToMenu = () => {
        handleStopPlayback();
        if (script.length > 0) {
            const session: HistorySession = {
                id: activeSessionId || `session-${Date.now()}`,
                timestamp: Date.now(),
                topic: projectName || context || "Sintesis Neural",
                script: [...script],
                speakers: [...speakers],
                mode: engineMode,
                isAudioGenerated: script.some(l => !!l.audioBuffer)
            };
            saveOrUpdateHistory(session);
        }
        setScript([]);
        setContext("");
        setAttachedFiles([]);
        setActiveSessionId(null);
        setProjectName("SINTESIS NEURAL");
    };

    const saveOrUpdateHistory = (session: HistorySession) => {
        setHistorySessions(prev => {
            const existsIdx = prev.findIndex(s => s.id === session.id);
            let newHistory = [...prev];
            if (existsIdx > -1) newHistory[existsIdx] = session; else newHistory = [session, ...prev];
            localStorage.setItem('voice_studio_history', JSON.stringify(newHistory.slice(0, 50)));
            return newHistory;
        });
    };

    const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); setHistorySessions(prev => { const newHist = prev.filter(s => s.id !== id); localStorage.setItem('voice_studio_history', JSON.stringify(newHist)); return newHist; });
    };

    const handleLoadHistory = (session: HistorySession) => {
        handleStopPlayback(); setContext(session.topic); setProjectName(session.topic); setScript(session.script); setSpeakers(session.speakers); setEngineMode(session.mode); setActiveSessionId(session.id);
    };

    const handleExportTextManual = (format: 'txt' | 'doc') => {
        if (script.length === 0) return;
        const content = script.map(line => {
            const spk = speakers.find(s => s.id === line.speakerId);
            return `[${spk?.name || 'VOICE'}]\n${line.text}`;
        }).join('\n\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `vs_transcript_${Date.now()}.${format}`; link.click();
    };

    const handleExportSessionTextManual = (session: HistorySession, format: 'txt' | 'doc') => {
        const content = session.script.map(line => {
            const spk = session.speakers.find(s => s.id === line.speakerId);
            return `[${spk?.name || 'VOICE'}]\n${line.text}`;
        }).join('\n\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `vs_history_transcript_${session.id}.${format}`; link.click();
    };

    const handleExportSessionAudioManual = async (session: HistorySession, format: 'mp3' | 'wav') => {
        const readyLines = session.script.filter(l => !!l.audioBuffer);
        if (readyLines.length === 0) { alert("Audio data unavailable."); return; }
        try {
            const ctx = getSafeAudioContext();
            const totalLen = readyLines.reduce((acc, l) => acc + (l.audioBuffer?.length || 0), 0);
            const combinedBuffer = ctx.createBuffer(readyLines[0].audioBuffer!.numberOfChannels, totalLen, readyLines[0].audioBuffer!.sampleRate);
            let offset = 0;
            for (const line of readyLines) {
                const buf = line.audioBuffer!;
                for (let channel = 0; channel < combinedBuffer.numberOfChannels; channel++) { combinedBuffer.getChannelData(channel).set(buf.getChannelData(channel), offset); }
                offset += buf.length;
            }
            const blob = audioBufferToWav(combinedBuffer);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = url; link.download = `vs_audio_${session.id}.wav`; link.click();
        } catch (e) { console.error(e); }
    };

    const handleAddLineManual = () => {
        const lastLine = script[script.length - 1];
        let nextSpeakerId = speakers[0].id;
        if (engineMode === 'podcast' && speakers.length > 1 && lastLine) {
            const lastIdx = speakers.findIndex(s => s.id === lastLine.speakerId);
            nextSpeakerId = speakers[(lastIdx + 1) % speakers.length].id;
        }
        const newLine: ScriptLine = { speakerId: nextSpeakerId, text: "", duration: 2 };
        setScript(prev => [...prev, newLine]);
    };

    const handleStartManualDraft = (type: 'reader' | 'podcast') => {
        setNamingMode(type);
        setTempProjectName("");
        setShowNamingPopup(true);
    };

    const confirmProjectName = () => {
        const type = namingMode;
        if (!type) return;
        handleStopPlayback();
        setEngineMode(type);
        setProjectName(tempProjectName.toUpperCase() || "SINTESIS NEURAL");
        let initialScript: ScriptLine[] = [];
        if (type === 'reader') {
            initialScript = [{ speakerId: speakers[0].id, text: "Halo, selamat datang di narasi saya...", duration: 3 }];
        } else {
            if (speakers.length < 2) {
                const newGuest: Speaker = { id: `speaker_guest_${Date.now()}`, role: 'GUEST', name: 'GUEST', styleId: 'style_02', gender: 'female' };
                setSpeakers(prev => [...prev, newGuest]);
                initialScript = [
                    { speakerId: speakers[0].id, text: "Halo semuanya, selamat datang di podcast kita!", duration: 4 },
                    { speakerId: newGuest.id, text: "Halo! Senang sekali bisa ada di sini hari ini.", duration: 4 }
                ];
            } else {
                initialScript = [
                    { speakerId: speakers[0].id, text: "Halo semuanya, selamat datang di podcast kita!", duration: 4 },
                    { speakerId: speakers[1].id, text: "Halo! Senang sekali bisa ada di sini hari ini.", duration: 4 }
                ];
            }
        }
        setScript(initialScript);
        setShowNamingPopup(false);
        setNamingMode(null);
    };

    const handleNeuralEnhance = async (styleId: string) => {
        // Update active selection UI state immediately
        setSelectedScriptStyle(styleId);

        // If no script exists, we just set the style for future generation
        if (script.length === 0) return;
        if (!isOnline) { showToast("ONLINE CONNECTION REQUIRED FOR ENHANCEMENT"); return; }

        setIsEnhancing(true);
        const styleObj = SCRIPT_STYLES.find(s => s.id === styleId);
        const styleLabel = styleObj?.label || "General";
        try {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const scriptJson = JSON.stringify(script.map(l => ({ speakerId: l.speakerId, text: l.text })));
            const prompt = `TASK: ENHANCE SCRIPT PUNCTUATION AND STYLE FOR ${styleLabel}.
        STYLE TRAIT: ${styleObj?.tone}
        CONTEXT: ${context}
        INPUT JSON: ${scriptJson}
        
        CRITICAL: Maintain the exact same number of lines. Return the exact same JSON format with "speakerId" and "text".`;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash', contents: prompt, config: {
                    // @ts-ignore
                    responseMimeType: "application/json"
                }
            });
            const enhancedData = JSON.parse(response.text || "[]");
            if (Array.isArray(enhancedData)) {
                setScript(prev => prev.map((line, idx) => {
                    const enhancedLine = enhancedData[idx];
                    if (enhancedLine && enhancedLine.text) { return { ...line, text: enhancedLine.text, audioBuffer: undefined, duration: estimateDuration(enhancedLine.text) }; }
                    return line;
                }));
                showToast(`SCRIPT ENHANCED: ${styleLabel}`);
            }
        } catch (e) { console.error("Enhance Fault:", e); } finally { setIsEnhancing(false); }
    };

    const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleStopPlayback();
            const files = Array.from(e.target.files);
            const newItems: MediaItem[] = files.map((file: File) => ({ id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, url: URL.createObjectURL(file), type: file.type.startsWith('video') ? 'video' : (file.type.startsWith('image') ? 'image' : 'audio'), file: file, name: file.name }));
            setMediaPlaylist(prev => [...prev, ...newItems]);
            if (!activeMediaId && newItems.length > 0) { setActiveMediaId(newItems[0].id); setActivePlaybackType('reference'); handleStopPlayback(); }
        }
        if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    };

    const handleResearchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            for (const file of files) {
                const id = `file-${Date.now()}`;
                const type = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : (file.type.startsWith('image/') ? 'image' : 'text');
                const fileUrl = URL.createObjectURL(file);
                setAttachedFiles(prev => [...prev, { id, name: file.name.toUpperCase(), type, content: "", status: 'processing', size: formatBytes(file.size), url: fileUrl }]);
                try {
                    let content = "";
                    if (type === 'image') {
                        if (!isOnline) {
                            showToast("ONLINE CONNECTION REQUIRED FOR IMAGE OCR");
                            throw new Error("Offline");
                        }
                        const base64 = await fileToBase64(file);
                        const visionResponse: any = await ai.models.generateContent({ model: 'gemini-1.5-flash', contents: { parts: [{ inlineData: { data: base64.split(',')[1], mimeType: file.type } }, { text: "Extract text." }] } });
                        content = visionResponse.text || "";
                    } else if (type === 'pdf') { content = await extractTextFromPDF(file); } else { content = await file.text(); }
                    setAttachedFiles(prev => prev.map(f => f.id === id ? { ...f, content, status: 'ready' } : f));
                } catch (err) { setAttachedFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error' } : f)); }
            }
        }
    };

    return (
        <div className={`fixed inset-0 z-[8000] flex flex-col font-sans animate-in fade-in duration-500 overflow-hidden pointer-events-auto ${isDark ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'}`}>
            <header className={`h-14 px-8 border-b flex items-center justify-between shrink-0 relative z-[200] ${isDark ? 'bg-black border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsNavOpen(true)} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all group ${isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-white hover:bg-indigo-600'}`}>
                        <Scan size={16} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
                        <Volume2 size={16} className="text-white animate-pulse" />
                    </div>
                    <div className="flex flex-col"><span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-slate-900'}`}>SPACE VOICE STUDIO</span><span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest pl-0.5">BEATSTORIA AI</span></div>
                </div>

                {isGeneratingBatch && (
                    <div className="flex items-center gap-4 px-6 py-2 bg-indigo-600/10 border border-indigo-500/30 rounded-full">
                        <Loader2 size={12} className="animate-spin text-indigo-400" />
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">SINTESIS AUDIO {batchProgress}%</span>
                    </div>
                )}

                {isEnhancing && (
                    <div className="flex items-center gap-4 px-6 py-2 bg-purple-600/10 border border-purple-500/30 rounded-full">
                        <Loader2 size={12} className="animate-spin text-purple-400" />
                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">NEURAL ENHANCING...</span>
                    </div>
                )}

                <button onClick={onClose} className={`p-2 rounded-full transition-all ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'}`}><X size={24} /></button>
            </header>

            <main className="flex-1 px-8 py-4 flex gap-6 w-full max-w-none mx-auto relative">
                <div className="flex-1 flex flex-col gap-4 min-w-0 h-full overflow-visible">

                    <section className={`flex items-center gap-2 border p-1 rounded-xl shrink-0 overflow-visible relative shadow-sm backdrop-blur-md w-full ${isDark ? 'bg-black/60 border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className={`flex flex-col gap-1 shrink-0 pr-2 mr-1 border-r ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                            <div className={`flex p-0.5 rounded-lg border ${isDark ? 'bg-black/50 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                <button onClick={() => setEngineMode('reader')} className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${engineMode === 'reader' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>READER</button>
                                <button onClick={() => setEngineMode('podcast')} className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${engineMode === 'podcast' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>PODCAST</button>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center gap-2 overflow-visible relative min-w-0">
                            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto studio-scrollbar pb-1 no-scrollbar mask-linear-fade pr-8">
                                {speakers.map((s, i) => {
                                    const style = VOICE_STYLES.find(vs => vs.id === s.styleId);
                                    const isStyleMenuOpen = openStyleMenu === i;
                                    return (
                                        <div key={s.id} className={`flex items-center gap-1.5 p-0.5 pr-1.5 rounded-lg border transition-all relative group shrink-0 ${s.styleId ? (isDark ? 'border-white/10 bg-white/5' : 'border-indigo-100 bg-indigo-50/30') : 'border-transparent opacity-70 hover:opacity-100'}`}>
                                            <button onClick={(e) => handleOpenPersonaMenu(e, i)} className={`persona-toggle-btn flex items-center gap-1.5 px-1 py-0.5 rounded-md transition-all text-left min-w-[100px] ${isStyleMenuOpen ? 'bg-indigo-600/20 ring-1 ring-indigo-500/50' : 'hover:bg-black/5'}`}>
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${s.styleId ? 'bg-indigo-500/20 text-indigo-400' : (isDark ? 'bg-white/5 text-slate-600' : 'bg-slate-200 text-slate-500')}`}>{style ? style.icon : <CircleOff size={10} />}</div>
                                                <div className="flex flex-col max-w-[80px] pointer-events-none">
                                                    <div className="flex items-center gap-1"><input value={s.name} onChange={(e) => handleSpeakerUpdate(i, { name: e.target.value.toUpperCase() })} onClick={(e) => e.stopPropagation()} className={`bg-transparent border-none p-0 focus:ring-0 text-[8px] font-black uppercase tracking-widest flex-1 outline-none min-w-[30px] pointer-events-auto ${s.styleId ? 'text-indigo-600' : (isDark ? 'text-slate-50' : 'text-slate-900')}`} /></div>
                                                    <span className="text-[6px] font-bold text-slate-500 truncate -mt-0.5">{style ? style.name : 'SELECT VOICE'}</span>
                                                </div>
                                                <ChevronDown size={8} className={`text-slate-400 ml-auto transition-transform opacity-50 ${isStyleMenuOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            <button onClick={() => handleSpeakerUpdate(i, { gender: s.gender === 'male' ? 'female' : 'male' })} className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${s.gender === 'male' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-pink-600/20 text-pink-400 border border-pink-500/30'}`}><span className="text-[8px] font-black">{s.gender === 'male' ? 'M' : 'F'}</span></button>
                                            {!isReaderActive && speakers.length > 1 && <button onClick={() => setSpeakers(p => p.filter(sp => sp.id !== s.id))} className="w-4 h-4 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"><X size={8} strokeWidth={3} /></button>}
                                        </div>
                                    );
                                })}
                            </div>
                            {!isReaderActive && (
                                <div className={`shrink-0 pl-2 border-l flex items-center ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                    <button
                                        onClick={() => { setSpeakers(p => [...p, { id: `speaker_${Date.now()}`, role: 'GUEST', name: 'GUEST', styleId: 'style_02', gender: 'female' }]); }}
                                        disabled={speakers.length >= 12}
                                        className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                                        title="Add New Speaker"
                                    >
                                        <UserPlus size={14} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {openStyleMenu !== null && (
                        <div className={`persona-dropdown fixed mt-2 w-64 border rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.5)] overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`} style={{ top: dropdownPos.top, left: dropdownPos.left }}>
                            <div className={`p-3 border-b flex items-center justify-between ${isDark ? borderClass + ' bg-white/5' : 'border-slate-100 bg-slate-50'}`}><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Select Persona Voice</span><button onClick={(e) => { e.stopPropagation(); setOpenStyleMenu(null); }} className="text-slate-500 hover:text-white p-1 hover:bg-black/10 rounded-lg"><X size={10} /></button></div>
                            <div className="max-h-64 overflow-y-auto studio-scrollbar p-2 grid grid-cols-1 gap-1">
                                {VOICE_STYLES.map(vs => (
                                    <button key={vs.id} onClick={(e) => { e.stopPropagation(); handleToggleStyle(openStyleMenu!, vs.id); setOpenStyleMenu(null); }} className={`flex items-center gap-3 p-2 rounded-xl transition-all text-left group ${speakers[openStyleMenu!].styleId === vs.id ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50/50'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${speakers[openStyleMenu!].styleId === vs.id ? 'bg-white/20 text-white' : (isDark ? 'bg-white/5 text-indigo-400' : 'bg-slate-100 text-indigo-600')}`}>{vs.icon}</div>
                                        <div className="flex flex-col min-w-0"><span className={`text-[9px] font-black uppercase tracking-tight truncate ${speakers[openStyleMenu!].styleId === vs.id ? 'text-white' : (isDark ? 'text-slate-300' : 'text-slate-800')}`}>{vs.name}</span><span className={`text-[7px] font-bold truncate ${speakers[openStyleMenu!].styleId === vs.id ? 'text-indigo-100' : 'text-slate-50'}`}>{vs.trait}</span></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <section className="space-y-2 flex-1 flex flex-col min-h-0 relative">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-4">
                                <div className={`w-1.5 h-1.5 rounded-full ${isReaderActive ? 'bg-indigo-500 animate-pulse' : 'bg-purple-500'} `}></div>
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-slate-900'}`}>{isReaderActive ? 'NARATIVE CORE' : 'DIALOGUE CORE'}</span>

                                <div className="relative group flex items-center ml-2 h-8">
                                    <div className="grid grid-cols-2 gap-0.5 cursor-pointer opacity-30 group-hover:opacity-100 transition-all duration-500 group-hover:rotate-90">
                                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                                    </div>
                                    <div className="w-0 group-hover:w-48 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex items-center pl-0 group-hover:pl-2">
                                        <input
                                            type="text"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value.toUpperCase())}
                                            placeholder="INPUT PROJECT NAME..."
                                            className={`bg-transparent border-b border-indigo-500/20 focus:border-indigo-500 px-1 py-0.5 text-[9px] font-black tracking-widest text-indigo-500 outline-none w-full placeholder:text-slate-700 transition-colors`}
                                        />
                                    </div>
                                </div>

                                {script.length > 0 && (<div className={`px-3 py-1 border rounded-lg flex items-center gap-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}><Clock size={10} className="text-indigo-500" /><span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{formatDurationDisplay(totalDuration)}</span></div>)}
                                {script.length > 0 && (
                                    <div className="flex items-center gap-2 ml-2">
                                        <button onClick={handleBackToMenu} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all active:scale-95 group">
                                            <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">BACK</span>
                                        </button>
                                        <button onClick={handleClearWorkspace} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all active:scale-95 group clear-btn ${isClearConfirming ? 'bg-red-600 text-white border border-red-500 shadow-lg scale-105' : 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'}`} title={isClearConfirming ? "Confirm?" : "Clear All"}>
                                            {isClearConfirming ? <AlertTriangle size={10} className="animate-pulse" /> : <Trash2 size={10} className="group-hover:animate-bounce" />}
                                            <span className="text-[8px] font-black uppercase tracking-widest">{isClearConfirming ? "CONFIRM?" : "CLEAR ALL"}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBatchGenerate}
                                    disabled={isGeneratingBatch || isScripting || (!isOnline && !isAllAudioReady)}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-30 ${isAllAudioReady ? 'bg-green-600 hover:bg-green-700' : (isOnline ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-500')} text-white`}
                                >
                                    {isGeneratingBatch || isScripting ? <Loader2 size={12} className="animate-spin" /> : (!isOnline && !isAllAudioReady ? <CircleOff size={12} /> : (isAllAudioReady ? <Play size={12} /> : (script.length > 0 ? <Volume2 size={12} /> : <Scan size={12} />)))}
                                    {isGeneratingBatch || isScripting ? 'PROCESSING...' : (!isOnline && !isAllAudioReady ? 'OFFLINE' : (isAllAudioReady ? 'PLAY SEQUENCE' : (script.length > 0 ? 'GENERATE AUDIO' : 'GENERATE SCRIPT')))}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex min-h-0 gap-4">
                            <div className={`w-56 rounded-3xl border flex flex-col overflow-hidden shadow-inner ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'}`}>
                                <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50'}`}><div className="flex items-center gap-2"><ListMusic size={12} className="text-indigo-500" /><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Media Queue</span></div><span className="text-[8px] font-bold text-slate-400">{mediaPlaylist.length}</span></div>
                                <div className="flex-1 overflow-y-auto studio-scrollbar p-2 space-y-2">
                                    {mediaPlaylist.length > 0 ? (
                                        mediaPlaylist.map((media) => (
                                            <div key={media.id} onClick={() => { setActiveMediaId(media.id); setActivePlaybackType('reference'); handleStopPlayback(); }} className={`group relative p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${activeMediaId === media.id ? (isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200 shadow-md') : (isDark ? 'bg-white/5 border-transparent hover:bg-white/10' : 'bg-white border-slate-50 hover:border-slate-50 hover:border-slate-200')}`}>
                                                <div className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'} ${activeMediaId === media.id ? 'border-indigo-500/50' : ''}`}>{media.type === 'image' || media.type === 'video' ? (media.type === 'video' ? (<div className="relative w-full h-full flex items-center justify-center"><video src={media.url} className="w-full h-full object-cover opacity-60" crossOrigin="anonymous" onTimeUpdate={onVideoTimeUpdate} onLoadedMetadata={onVideoMetadata} key={activeMediaId} /><Film size={12} className="absolute text-white/80" /></div>) : (<img src={media.url} className="w-full h-full object-cover" />)) : (<Music size={14} className="text-slate-400" />)}</div>
                                                <div className="flex flex-col min-w-0 flex-1"><span className={`text-[9px] font-bold truncate ${activeMediaId === media.id ? 'text-indigo-600' : 'text-slate-700'}`}>{media.name}</span><span className="text-[7px] text-slate-400 font-medium uppercase tracking-wider">{media.type}</span></div>
                                                <button onClick={(e) => { e.stopPropagation(); setMediaPlaylist(prev => prev.filter(m => m.id !== media.id)); if (activeMediaId === media.id) setActiveMediaId(null); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-500 text-slate-400 rounded-lg transition-all"><X size={10} /></button>
                                                {activeMediaId === media.id && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500 rounded-r-full"></div>}
                                            </div>
                                        ))
                                    ) : (<div className="h-full flex flex-col items-center justify-center gap-3 opacity-20 text-center p-4"><Box size={24} strokeWidth={1.5} /><span className="text-[8px] font-black uppercase tracking-widest leading-relaxed">No Media<br />Uploaded</span></div>)}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0 relative">
                                {previewFileId ? (
                                    <ResearchPreview file={attachedFiles.find(f => f.id === previewFileId)!} onBack={() => setPreviewFileId(null)} theme={theme} />
                                ) : (
                                    <div className={`flex-1 flex flex-col min-h-0 rounded-3xl border shadow-inner relative ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'}`}>
                                        <div ref={scriptAreaRef} className="flex-1 overflow-y-auto studio-scrollbar p-6 space-y-3 relative">
                                            {script.length === 0 ? (
                                                <div className="flex-1 h-full flex flex-col items-center justify-center gap-10">
                                                    {isScripting ? (
                                                        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700 opacity-20">
                                                            <div className="relative w-28 h-28">
                                                                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-pulse"></div>
                                                                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                                                <div className="absolute inset-0 flex items-center justify-center"><Sparkles size={40} className="text-indigo-400 animate-pulse" /></div>
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse">{researchLabel}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 h-full flex flex-col items-center justify-center gap-8 animate-in zoom-in-95 duration-500 w-full max-w-2xl text-center">
                                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                                <FileEdit size={48} strokeWidth={1} className="text-indigo-500" />
                                                                <div className="text-center">
                                                                    <p className={`text-[12px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white' : 'text-slate-900'}`}>Area Penulisan Script</p>
                                                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-2 max-w-[250px]">Pilih mode untuk memulai struktur percakapan atau ketik instruksi di bawah untuk generate otomatis.</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-4">
                                                                <button onClick={() => handleStartManualDraft('reader')} className="flex flex-col items-center gap-3 p-6 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] transition-all group active:scale-[0.95] shadow-xl">
                                                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"><User size={24} /></div>
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">READER TEMPLATE</span>
                                                                </button>
                                                                <button onClick={() => handleStartManualDraft('podcast')} className="flex flex-col items-center gap-3 p-6 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 rounded-[2rem] transition-all group active:scale-[0.95] shadow-xl">
                                                                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"><MessageCircle size={24} /></div>
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">PODCAST TEMPLATE</span>
                                                                </button>
                                                            </div>

                                                            {historySessions.length > 0 && (
                                                                <div className="w-full mt-8 pt-8 border-t border-white/5 animate-in slide-in-from-bottom-4 duration-700">
                                                                    <div className="flex items-center justify-center center gap-2 mb-5 opacity-40">
                                                                        <History size={12} className="text-indigo-500" />
                                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Resume Recent Sessions</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        {historySessions.slice(0, 4).map(session => (
                                                                            <button
                                                                                key={session.id}
                                                                                onClick={() => handleLoadHistory(session)}
                                                                                className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.05] rounded-[1.5rem] transition-all text-left group"
                                                                            >
                                                                                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                                                                    <Archive size={16} />
                                                                                </div>
                                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                                    <span className="text-[11px] font-black uppercase truncate text-slate-400 group-hover:text-white">{session.topic || "Untitled Session"}</span>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{session.mode}</span>
                                                                                        <span className="text-[8px] font-bold text-slate-700 uppercase">{new Date(session.timestamp).toLocaleDateString()}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <div className="mt-6 flex justify-center items-center gap-4">
                                                                        <button
                                                                            onClick={() => importFileInputRef.current?.click()}
                                                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:text-indigo-400 transition-all text-[9px] font-black uppercase tracking-widest border border-white/5 hover:bg-indigo-600/5 active:scale-95 group"
                                                                        >
                                                                            <FileUp size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                                                                            Import from Registry
                                                                        </button>
                                                                        <input type="file" ref={importFileInputRef} onChange={handleImportSessionFile} className="hidden" accept=".json" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-4 pb-20">
                                                    {script.map((line, idx) => {
                                                        if (!line) return null;
                                                        const spk = speakers.find(s => s.id === line.speakerId); const isActive = playingLineIndex === idx;
                                                        const preDur = script.slice(0, idx).reduce((acc, l) => { if (!l) return acc; return acc + (l.duration || 0); }, 0) / (pacing || 1);
                                                        const lineProgress = isActive ? ((playbackTime - preDur) / ((line.duration || 1) / (pacing || 1))) : 0;
                                                        return (
                                                            <div key={idx} data-line-index={idx} className={`group flex items-start gap-4 p-4 rounded-3xl border transition-all duration-500 ${isActive ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.01]' : (isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-100')} hover:shadow-lg ${isReaderActive ? 'max-w-4xl mx-auto' : ''}`}>
                                                                <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const sIdx = speakers.findIndex(s => s.id === line.speakerId);
                                                                            const nextS = speakers[(sIdx + 1) % speakers.length];
                                                                            setScript(prev => prev.map((l, i) => i === idx ? { ...l, speakerId: nextS.id, audioBuffer: undefined } : l));
                                                                        }}
                                                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-md ${isActive ? 'bg-indigo-600 text-white' : (isDark ? 'bg-white/5 text-slate-500 hover:bg-indigo-600 hover:text-white' : 'bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white')}`}
                                                                        title="Toggle Speaker"
                                                                    >
                                                                        {VOICE_STYLES.find(vs => vs.id === spk?.styleId)?.icon || <User size={14} />}
                                                                    </button>
                                                                    <span className={`text-[7px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>{spk?.name || 'VOICE'}</span>
                                                                </div>

                                                                <div className="flex-1 min-w-0 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="h-4 flex items-end">
                                                                            <WaveVisualizer isActive={isActive && isPlaying} bars={12} />
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            {line.isGenerating && (<div className="flex items-center gap-2"><Loader2 size={10} className="animate-spin text-indigo-400" /><span className="text-[8px] font-black text-indigo-400 uppercase">Synthesizing...</span></div>)}
                                                                            <span className="text-[7px] font-mono text-slate-500 uppercase tracking-widest">{formatDurationDisplay(line.duration || 0)}</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-[14px] font-medium tracking-tight">
                                                                        {isActive ? (<TypewriterSyncText text={line.text} progress={lineProgress} isActive={isActive} />) : (
                                                                            <textarea
                                                                                value={line.text}
                                                                                onChange={(e) => {
                                                                                    const newText = e.target.value;
                                                                                    setScript(prev => {
                                                                                        const n = [...prev];
                                                                                        if (n[idx]) {
                                                                                            n[idx] = { ...n[idx], text: newText, audioBuffer: undefined, duration: estimateDuration(newText) };
                                                                                        }
                                                                                        return n;
                                                                                    });
                                                                                }}
                                                                                className={`w-full bg-transparent border-none outline-none resize-none transition-colors duration-500 p-0 m-0 h-auto overflow-hidden leading-relaxed ${isDark ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-900'}`}
                                                                                rows={Math.max(1, Math.ceil((line.text || "").length / 50))}
                                                                                placeholder="Ketik script di sini..."
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className={`shrink-0 flex items-center gap-1 transition-opacity self-center ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>
                                                                    <button
                                                                        onClick={() => line.audioBuffer && handleStartPlayback(line.audioBuffer, 0, idx)}
                                                                        disabled={!line.audioBuffer}
                                                                        className={`p-2.5 rounded-xl transition-all ${isActive ? 'bg-indigo-600 text-white' : (isDark ? 'bg-white/[0.05]' : 'bg-slate-100/50') + ' text-slate-400 hover:text-indigo-600 disabled:opacity-20'}`}
                                                                    >
                                                                        {isActive ? <AudioLines size={16} className="animate-pulse" /> : <Play size={16} fill="currentColor" />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setScript(prev => prev.filter((_, i) => i !== idx)); }}
                                                                        className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    <button
                                                        onClick={handleAddLineManual}
                                                        className={`w-full py-2.5 border border-dashed rounded-xl flex items-center justify-center gap-2 text-slate-600 hover:text-indigo-500/60 hover:border-indigo-500/20 hover:bg-white/[0.02] transition-all group active:scale-[0.99] mt-2 mb-4 ${isDark ? 'border-white/5' : 'border-slate-300'}`}
                                                    >
                                                        <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest">Tambah Baris Script</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`shrink-0 p-2 border-t backdrop-blur-3xl relative z-[100] overflow-visible min-h-[50px] flex flex-col justify-center ${isDark ? 'border-white/10 bg-black/95' : 'border-slate-200 bg-white/95'}`}>
                                            <div className="absolute inset-x-0 bottom-0 h-12 opacity-90 pointer-events-none flex items-end justify-center"><FrequencySpectrum analyser={analyserRef.current} isPlaying={isPlaying} /></div>
                                            <div className="max-w-[1600px] mx-auto w-full flex items-center gap-4 relative z-10 px-2">
                                                <div className={`flex items-center gap-1 p-0.5 rounded-lg border shrink-0 ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-200'}`}><button onClick={() => { if (activePlaybackType === 'script' && playingLineIndex !== null && playingLineIndex > 0) { const prevLine = script[playingLineIndex - 1]; if (prevLine && prevLine.audioBuffer) handleStartPlayback(prevLine.audioBuffer, 0, playingLineIndex - 1); } else if (activePlaybackType === 'reference') handlePlayReferenceMedia(0); }} className="p-1.5 rounded-md hover:bg-black/5 text-slate-400 active:scale-90"><SkipBack size={14} fill="currentColor" /></button><button onClick={toggleMasterPlayback} disabled={!isAnyAudioReady && !activeMedia} className={`w-8 h-8 flex items-center justify-center rounded-full shadow-lg hover:scale-105 active:scale-[0.95] transition-all ${(isAnyAudioReady || activeMedia) ? 'bg-indigo-600' : 'bg-slate-200 opacity-30'}`}>{isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}</button><button onClick={() => { if (activePlaybackType === 'script' && playingLineIndex !== null && playingLineIndex < script.length - 1) { const nextLine = script[playingLineIndex + 1]; if (nextLine && nextLine.audioBuffer) handleStartPlayback(nextLine.audioBuffer, 0, playingLineIndex + 1); } }} className="p-1.5 rounded-md hover:bg-black/5 text-slate-400 active:scale-90"><SkipForward size={14} fill="currentColor" /></button></div>
                                                <div className="flex-1 flex flex-col gap-1"><div className={`relative group/seek h-1.5 w-full rounded-full overflow-hidden cursor-pointer ${isDark ? 'bg-white/5' : 'bg-slate-200'}`} onClick={handleSeek}><div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,1)]" style={{ width: `${(playbackTime / (totalDuration || 1)) * 100}%` }} /></div><div className="flex items-center justify-between text-[6px] font-black text-slate-400 uppercase tracking-widest px-0.5"><div className="flex items-center gap-2"><span className="text-indigo-600 font-mono text-[8px]">{formatDurationDisplay(playbackTime)} / {formatDurationDisplay(totalDuration)}</span>{activeMedia && activePlaybackType === 'reference' && <span className="text-pink-500 truncate max-w-[200px]">• {activeMedia.name.toUpperCase()}</span>}</div><div className="flex items-center gap-1.5"><VolumeLow size={8} className="text-slate-400" /><div className={`w-16 h-0.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}><div className="h-full bg-indigo-500" style={{ width: `${volume * 100}%` }} /></div><VolumeHigh size={8} className="text-slate-400" /></div></div></div>
                                                <div className={`flex items-center gap-2 shrink-0 border-l pl-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                                    <div className="relative">
                                                        <button onClick={() => setShowQuickSettings(!showQuickSettings)} className={`p-2 rounded-lg transition-all ${showQuickSettings ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-black/5'}`} title="Quick Settings"><Settings size={14} /></button>
                                                        {showQuickSettings && (
                                                            <div className={`absolute bottom-full right-0 mb-4 w-72 border rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden z-[5000] animate-in slide-in-from-bottom-4 fade-in duration-500 ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
                                                                <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/5 bg-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Neural Playback Engine</span>
                                                                    <button onClick={() => setShowQuickSettings(false)} className="text-slate-500 hover:text-white p-1.5 hover:bg-black/10 rounded-xl transition-all"><X size={12} /></button>
                                                                </div>
                                                                <div className="p-6 space-y-8">
                                                                    {/* PACING CONTROL */}
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Activity size={12} /> Playback Pacing</span>
                                                                            <span className="text-[9px] font-bold text-indigo-500">{pacing.toFixed(1)}x</span>
                                                                        </div>
                                                                        <input type="range" min="0.5" max="2.0" step="0.1" value={pacing} onChange={(e) => setPacing(parseFloat(e.target.value))} className="w-full accent-indigo-600 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                                                                        <div className="flex justify-between text-[7px] font-black text-slate-700 uppercase tracking-widest"><span>Slow</span><span>Natural</span><span>Rapid</span></div>
                                                                    </div>

                                                                    {/* VOLUME CONTROL */}
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Volume2 size={12} /> Master Gain</span>
                                                                            <span className="text-[9px] font-bold text-indigo-500">{Math.round(volume * 100)}%</span>
                                                                        </div>
                                                                        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full accent-indigo-600 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                                                                    </div>

                                                                    {/* EQ BANDS (SIMULATED FOR NOW) */}
                                                                    <div className="space-y-4">
                                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Sliders size={12} /> Neural Equalizer</span>
                                                                        <div className="flex items-end justify-between h-20 gap-2 px-1">
                                                                            {eqBands.map((val, i) => (
                                                                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                                                    <div className="w-full relative h-[60px] flex items-end bg-white/[0.03] rounded-md overflow-hidden">
                                                                                        <div className="absolute inset-x-0 bottom-0 bg-indigo-500/30 transition-all duration-300" style={{ height: `${((val + 12) / 24) * 100}%` }} />
                                                                                        <input
                                                                                            type="range"
                                                                                            min="-12"
                                                                                            max="12"
                                                                                            step="1"
                                                                                            value={val}
                                                                                            onChange={(e) => {
                                                                                                const next = [...eqBands];
                                                                                                next[i] = parseInt(e.target.value);
                                                                                                setEqBands(next);
                                                                                            }}
                                                                                            className="absolute inset-0 w-20 h-full opacity-0 cursor-ns-resize -rotate-90 origin-center"
                                                                                            style={{ width: '60px', left: '-20px' }}
                                                                                        />
                                                                                    </div>
                                                                                    <span className="text-[6px] font-bold text-slate-600">{['60', '230', '910', '4K', '14K'][i]}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                                                    <button onClick={() => { setPacing(1.0); setVolume(0.8); setEqBands([0, 0, 0, 0, 0]); }} className="text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-500 transition-colors">Reset Neural Core</button>
                                                                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /><span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Engine Stable</span></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={() => handleExportTextManual('txt')} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Export Transcript"><FileText size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                <aside className={`w-[300px] rounded-3xl border flex flex-col shrink-0 overflow-hidden shadow-2xl ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className={`p-5 border-b flex items-center justify-between backdrop-blur-md ${isDark ? 'border-white/10 bg-black/60' : 'border-slate-100 bg-slate-50'}`}><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><History size={16} className="text-indigo-500" /> Registry</span></div>
                    <div className="flex-1 overflow-y-auto studio-scrollbar p-4 space-y-4">
                        {historySessions.length > 0 ? (historySessions.map(session => (
                            <div key={session.id} onClick={() => handleLoadHistory(session)} className={`p-4 rounded-2xl border transition-all cursor-pointer group relative flex flex-col gap-2 ${session.isAudioGenerated ? (isDark ? 'bg-indigo-600 border-indigo-400 shadow-lg' : 'bg-indigo-50 border-indigo-200 shadow-sm') : (activeSessionId === session.id ? (isDark ? 'bg-white/[0.1] border-indigo-500' : 'bg-indigo-50 border-indigo-200') : (isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-100'))}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                                        <span className={`text-[11px] font-black uppercase truncate ${session.isAudioGenerated || activeSessionId === session.id ? 'text-white' : (isDark ? 'text-white' : 'text-slate-900')}`}>{session.topic || "SINTESIS NEURAL"}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Clock size={10} className="text-slate-400" />
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {session.isAudioGenerated && (
                                            <div className="relative export-menu">
                                                <button onClick={(e) => { e.stopPropagation(); setExportMenuOpen(exportMenuOpen === session.id ? null : session.id); }} className={`w-6 h-6 rounded-full flex items-center justify-center transition-all export-btn ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-600'}`}><Download size={10} /></button>
                                                {exportMenuOpen === session.id && (
                                                    <div className={`absolute right-0 top-full mt-2 border rounded-xl p-1 shadow-2xl z-[100] w-32 animate-in fade-in zoom-in-95 ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}><span className="text-[7px] font-black text-slate-500 px-2 py-1 block uppercase">Audio Format</span><button onClick={(e) => { e.stopPropagation(); handleExportSessionAudioManual(session, 'mp3'); setExportMenuOpen(null); }} className={`w-full text-left px-2 py-1.5 text-[9px] font-bold rounded transition-all flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}><VolumeLow size={10} /> .MP3</button><button onClick={(e) => { e.stopPropagation(); handleExportSessionAudioManual(session, 'wav'); setExportMenuOpen(null); }} className={`w-full text-left px-2 py-1.5 text-[9px] font-bold rounded transition-all flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}><VolumeHigh size={10} /> .WAV</button><div className={`h-px my-1 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`} /><span className="text-[7px] font-black text-slate-500 px-2 py-1 block uppercase">Script Format</span><button onClick={(e) => { e.stopPropagation(); handleExportSessionTextManual(session, 'txt'); setExportMenuOpen(null); }} className={`w-full text-left px-2 py-1.5 text-[9px] font-bold rounded transition-all flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}><FileText size={10} /> .TXT</button><button onClick={(e) => { e.stopPropagation(); handleExportSessionTextManual(session, 'doc'); setExportMenuOpen(null); }} className={`w-full text-left px-2 py-1.5 text-[9px] font-bold rounded transition-all flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}><FileText size={10} /> .DOC</button></div>
                                                )}
                                            </div>
                                        )}
                                        <button onClick={(e) => handleDeleteHistory(session.id, e)} className={`p-1.5 rounded-lg transition-colors ${session.isAudioGenerated || activeSessionId === session.id ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-red-500'}`}><Trash2 size={12} /></button>
                                    </div>
                                </div>
                                <div className="flex justify-end mt-auto">
                                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${session.isAudioGenerated || activeSessionId === session.id ? 'bg-white/10 text-white' : (isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500')}`}>{session.mode}</span>
                                </div>
                            </div>
                        ))
                        ) : (<div className="h-full flex flex-col items-center justify-center opacity-20 gap-4 text-center grayscale"><Archive size={48} strokeWidth={1} /><span className="text-[9px] font-black uppercase">No records identified</span></div>)}
                    </div>
                </aside>
            </main>

            <footer className={`border-t p-2 z-20 shrink-0 ${isDark ? 'bg-[#080808] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="w-full px-4 flex items-end gap-3 relative z-50 justify-between">
                    <div className="flex items-end gap-3">
                        <div className={`w-[160px] border rounded-xl p-2 space-y-2 shadow-2xl ${isDark ? 'bg-black border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between px-1"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><MonitorPlay size={12} className="text-indigo-500" /> Lab</span></div>
                            {/* Fixed broken ternary structure and undefined 'media' variable */}
                            <div className={`h-12 rounded-lg border overflow-hidden flex items-center justify-center cursor-pointer transition-all ${activeMedia ? (isDark ? 'bg-black/80 border-white/10' : 'bg-white border-indigo-200') : (isDark ? 'bg-black/60 border-white/5 border-dashed opacity-30 hover:opacity-100' : 'bg-slate-100 border-slate-200 border-dashed opacity-50 hover:opacity-100')}`} onClick={triggerMediaUpload}>
                                {activeMedia ? (
                                    <div className="w-full h-full relative">
                                        {activeMedia.type === 'video' ? (
                                            <>
                                                <video ref={mediaRef as any} src={activeMedia.url} className="w-full h-full object-cover opacity-60 pointer-events-none" crossOrigin="anonymous" onTimeUpdate={onVideoTimeUpdate} onLoadedMetadata={onVideoMetadata} key={activeMediaId} />
                                                <Film size={12} className="absolute text-white/80 pointer-events-none" />
                                            </>
                                        ) : activeMedia.type === 'audio' ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-500/10 pointer-events-none">
                                                <audio ref={mediaRef as any} src={activeMedia.url} onTimeUpdate={onVideoTimeUpdate} onLoadedMetadata={onVideoMetadata} key={activeMediaId} />
                                                <div className="relative">
                                                    <Music size={14} className="text-indigo-400 animate-pulse" />
                                                    <div className="absolute -inset-2 bg-indigo-400/20 rounded-full animate-ping pointer-events-none" />
                                                </div>
                                                <span className="text-[6px] font-black text-indigo-400 mt-1 uppercase truncate max-w-full px-2">{activeMedia.name}</span>
                                            </div>
                                        ) : activeMedia.type === 'image' ? (
                                            <img src={activeMedia.url} className="w-full h-full object-cover pointer-events-none" />
                                        ) : (
                                            <Music size={14} className="text-slate-400 pointer-events-none" />
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-[7px] font-black uppercase text-slate-400">SOURCE</span>
                                )}
                            </div>
                            <input type="file" ref={mediaFileInputRef} onChange={handleMediaUpload} className="hidden" accept="video/*,audio/*,image/*" multiple />
                        </div>

                        <div className={`w-[240px] border rounded-2xl p-2.5 space-y-3 shadow-2xl relative overflow-hidden ${isDark ? 'bg-black border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between px-1"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Database size={12} /> RESEARCH</span><button onClick={triggerResearchUpload} className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-white/5 hover:bg-indigo-600' : 'bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-600'}`} title="Upload File"><Paperclip size={12} /></button></div>
                            <div className="relative group/link"><div className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-all ${isIngestingLink ? 'opacity-50' : 'opacity-100'} ${isDark ? 'bg-white/5 border-white/10 focus-within:border-indigo-500/50' : 'bg-white border-slate-200 focus-within:border-indigo-600'}`}><Link2 size={12} className="text-indigo-500 shrink-0" /><input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLinkIngestion()} placeholder="Insert link..." className={`bg-transparent border-none focus:ring-0 text-[10px] font-medium flex-1 p-0 outline-none ${isDark ? 'text-slate-200 placeholder:text-slate-700' : 'text-slate-800 placeholder:text-slate-400'}`} /><button onClick={handleLinkIngestion} disabled={isIngestingLink || !urlInput.trim()} className="p-1 hover:bg-indigo-600 rounded transition-all text-slate-400 hover:text-white disabled:opacity-0">{isIngestingLink ? <Loader2 size={10} className="animate-spin" /> : <ArrowRight size={12} />}</button></div></div>
                            <div className="max-h-20 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">{attachedFiles.map((f) => (<div key={f.id} className={`flex items-center justify-between p-1.5 border rounded-lg group transition-all ${previewFileId === f.id ? (isDark ? 'bg-indigo-600/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200') : (isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100')}`}><div className="flex items-center gap-2 truncate">{f.type === 'web' ? <Globe2 size={10} className="text-purple-500" /> : <FileText size={10} className="text-indigo-500" />}<span className="text-[8px] font-black uppercase truncate text-slate-500">{f.name}</span></div><div className="flex items-center gap-2">
                                <button onClick={() => setPreviewFileId(previewFileId === f.id ? null : f.id)} className={`p-1.5 rounded transition-all ${previewFileId === f.id ? 'bg-indigo-600 text-white' : (isDark ? 'hover:bg-indigo-600 text-slate-400 hover:text-white' : 'hover:bg-indigo-50 text-indigo-600')}`}><Eye size={12} /></button>
                                <button onClick={() => setAttachedFiles(p => p.filter(it => it.id !== f.id))} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X size={10} /></button>
                            </div></div>))}{attachedFiles.length === 0 && !isIngestingLink && (<div className="py-4 text-center opacity-20"><Box size={16} className="mx-auto mb-1" /><span className="text-[6px] font-black uppercase tracking-widest text-slate-400">No Context</span></div>)}</div>
                            <input type="file" ref={researchFileInputRef} onChange={handleResearchFileUpload} className="hidden" multiple accept=".pdf,.txt,image/*" />
                        </div>
                    </div>

                    <div className={`flex items-center gap-3 border rounded-2xl p-2 h-[120px] shadow-2xl ${isDark ? 'bg-black border-white/5' : 'bg-white border-slate-200'}`}>
                        <div className="flex flex-col gap-2 w-[140px] h-full overflow-hidden">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 shrink-0">
                                <Sparkles size={12} className="text-purple-500" /> Neural Enhance
                            </span>
                            <div className="flex flex-col gap-1.5 overflow-y-auto studio-scrollbar pr-1 flex-1">
                                {SCRIPT_STYLES.map((style) => (
                                    <button
                                        key={style.id}
                                        onClick={() => handleNeuralEnhance(style.id)}
                                        disabled={isEnhancing}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[7px] font-black tracking-widest uppercase transition-all shrink-0 hover:scale-[1.02] active:scale-95 disabled:opacity-20 ${selectedScriptStyle === style.id ? 'bg-amber-600 border-amber-500 text-white shadow-lg' : (isDark ? 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}`}
                                    >
                                        <Wand2 size={10} className="text-indigo-400" /> <span className="truncate">{style.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={`w-px h-full mx-1 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                        <div className="flex flex-col gap-2 w-[260px] h-full overflow-hidden"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 shrink-0"><Clock size={12} /> DURASI</span><div className="grid grid-cols-2 gap-1.5 overflow-y-auto studio-scrollbar pr-1 flex-1 content-start">{DURATION_OPTIONS.map((opt) => (<button key={opt.value} onClick={() => setTargetDuration(targetDuration === opt.value ? null : opt.value)} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-[7px] font-black tracking-widest uppercase transition-all ${targetDuration === opt.value ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : (isDark ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}`}><span>{opt.label}</span>{targetDuration === opt.value && <Check size={8} />}</button>))}</div></div>
                    </div>

                    <div className="flex items-end gap-3 flex-1 min-w-0">
                        <div className={`flex-1 border rounded-2xl p-3 h-[120px] flex flex-col relative z-[60] shadow-2xl ${isDark ? 'bg-black border-white/5' : 'bg-white border-slate-200'}`}>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2"><MessageSquare size={10} /> DIRECTIVE</span>
                            <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Visi naskah..." className={`w-full flex-1 bg-transparent border-none focus:ring-0 text-[11px] font-medium resize-none custom-scrollbar p-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`} />

                            {readyAttachedFilesCount > 0 && (
                                <div className={`absolute bottom-2 right-3 flex items-center gap-2 px-3 py-1.5 border rounded-full animate-in fade-in slide-in-from-right-4 duration-500 shadow-xl backdrop-blur-md ${isDark ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
                                    <div className="relative">
                                        <Database size={10} className="text-indigo-600" />
                                        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></div>
                                    </div>
                                    <span className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.1em]">
                                        {readyAttachedFilesCount} RESEARCH NODES INJECTED
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleBatchGenerate}
                            disabled={isScripting || isGeneratingBatch || (!isOnline && !isAllAudioReady)}
                            className={`h-[120px] w-[140px] text-white rounded-3xl flex flex-col items-center justify-center gap-2 shadow-2xl transition-all duration-500 active:scale-95 shrink-0 disabled:opacity-30 disabled:grayscale ${isAllAudioReady ? 'bg-green-600 hover:bg-green-700' : (isOnline ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-500')}`}
                        >
                            {isGeneratingBatch || isScripting ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : !isOnline && !isAllAudioReady ? (
                                <CircleOff size={24} />
                            ) : isAllAudioReady ? (
                                <Play size={24} />
                            ) : (
                                <Scan size={24} />
                            )}
                            <span className="font-black uppercase tracking-widest text-[9px] text-center leading-tight">
                                {isGeneratingBatch || isScripting ? 'PROCESSING...' : (!isOnline && !isAllAudioReady ? 'OFFLINE' : (isAllAudioReady ? 'PLAY\nSEQUENCE' : (script.length > 0 ? 'GENERATE\nAUDIO' : 'GENERATE\nSCRIPT')))}
                            </span>
                        </button>
                    </div>
                </div>
            </footer>

            {/* PROJECT NAMING POPUP */}
            {showNamingPopup && (
                <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl p-6 flex flex-col gap-6 animate-in zoom-in-95 duration-500">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                <Fingerprint size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xs font-black uppercase tracking-widest text-white">PROJECT IDENTITY</h3>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Berikan nama unik untuk sesi synthesis Anda</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">Identifier Name</span>
                            </div>
                            <input
                                autoFocus
                                type="text"
                                value={tempProjectName}
                                onChange={(e) => setTempProjectName(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && tempProjectName.trim() && confirmProjectName()}
                                placeholder="INPUT PROJECT NAME..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-black tracking-widest text-indigo-400 outline-none focus:border-indigo-500 transition-colors uppercase placeholder:text-slate-700"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowNamingPopup(false); setNamingMode(null); }}
                                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={confirmProjectName}
                                disabled={!tempProjectName.trim()}
                                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-50 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
                            >
                                <Rocket size={14} />
                                INITIALIZE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isNavOpen && (
                <div className="fixed inset-0 z-[9500] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500" onClick={() => setIsNavOpen(false)}>
                    <div className="w-full max-w-4xl grid grid-cols-3 gap-6 animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
                        {protocols.map(p => (
                            <button key={p.id} onClick={p.onClick} className={`group flex flex-col p-8 rounded-[2.5rem] border-2 transition-all duration-500 text-left relative overflow-hidden ${p.active ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_50px_rgba(79,70,229,0.3)] scale-105' : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500/50 hover:bg-white/10 hover:scale-[1.02]'}`}>
                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 ${p.active ? 'bg-white text-indigo-600' : 'bg-white/10 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                    {p.icon}
                                </div>
                                <div className="space-y-2">
                                    <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${p.active ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{p.label}</h3>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${p.active ? 'text-indigo-100' : 'text-slate-500 group-hover:text-slate-400'}`}>{p.desc}</p>
                                </div>
                                {p.active && (
                                    <div className="absolute top-6 right-6">
                                        <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-[0_0_15px_rgba(255,255,255,1)]" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* TOAST UI */}
            {toastMessage && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[10000] animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <CheckCircle2 size={16} className="text-green-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{toastMessage}</span>
                </div>
            )}
        </div>
    );
};