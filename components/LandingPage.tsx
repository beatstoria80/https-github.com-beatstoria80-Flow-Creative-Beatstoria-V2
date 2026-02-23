
import React, { useEffect, useState, useRef } from 'react';
import { 
  Zap, Layout, Wand2, ArrowRight, History, Clock, Monitor, Sparkles, 
  Trophy, Dumbbell, Flame, Scissors, Bandage, Film, Clapperboard, 
  Cpu, Box, Target, Layers, MousePointer2, BookOpen, Video, Type, PenLine,
  Mic2
} from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onOpenAiStudio?: () => void;
  onLoadProject: (id: string) => void;
  onOpenCooking?: () => void;
  onOpenTitanFill?: () => void;
  onOpenPurgeBg?: () => void;
  onOpenRetouch?: () => void;
  onOpenNoteLM?: () => void;
  onOpenCineEngine?: () => void;
  onOpenTypeface?: () => void;
  onOpenVoiceStudio?: () => void;
  onOpenSpaceCampaign?: () => void;
  onOpenCinematicDirector?: () => void;
}

const QuillIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12.5 13.5L3.5 20.5V22.5H5.5L12.5 15.5M12.5 13.5C12.5 13.5 13.5 12.5 14.5 12.5C15.5 12.5 17.5 13.5 18.5 13.5C19.5 13.5 21.5 11.5 21.5 8.5C21.5 5.5 18.5 2.5 14.5 2.5C10.5 2.5 6.5 5.5 6.5 10.5C6.5 12.5 7.5 13.5 8.5 14.5C9.5 15.5 10.5 15.5 12.5 15.5M12.5 13.5L12.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = (props) => {
  const { 
    onStart, onOpenAiStudio, onLoadProject, onOpenCooking, onOpenTitanFill, 
    onOpenPurgeBg, onOpenRetouch, onOpenNoteLM, onOpenCineEngine, 
    onOpenTypeface, onOpenVoiceStudio, onOpenSpaceCampaign, onOpenCinematicDirector
  } = props;

  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollStartRef = useRef({ y: 0, scrollTop: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('space_studio_library');
    if (saved) {
      try { setRecentProjects(JSON.parse(saved).slice(0, 3)); } catch (e) { }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingScroll && containerRef.current) {
        const dy = e.clientY - scrollStartRef.current.y;
        containerRef.current.scrollTop = scrollStartRef.current.scrollTop - dy;
      }
    };

    const handleMouseUp = () => {
      setIsDraggingScroll(false);
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingScroll]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;
    setIsDraggingScroll(true);
    document.body.style.userSelect = 'none';
    if (containerRef.current) {
      scrollStartRef.current = { y: e.clientY, scrollTop: containerRef.current.scrollTop };
    }
  };

  const features = [
    { id: 'canvas', label: 'Kanvas Utama', desc: 'TEMPAT DIMANA VISI MENJADI REALITAS', icon: <Layout size={24} />, color: 'bg-indigo-600', onClick: onStart },
    { id: 'director', label: 'Cine Director', desc: '16-ANGLE AUTOMATED PRODUCTION', icon: <Film size={24} />, color: 'bg-purple-600', onClick: onOpenCinematicDirector },
    { id: 'campaign', label: 'Space Campaign', desc: 'SISTEM DESAIN BERBASIS NODE AI', icon: <Monitor size={24} />, color: 'bg-cyan-500', onClick: onOpenSpaceCampaign },
    { id: 'notelm', label: 'NoteLM Intelijen', desc: 'PUSAT RISET DAN SINTESIS NEURAL', icon: <BookOpen size={24} />, color: 'bg-slate-700', onClick: onOpenNoteLM || onStart },
    { id: 'cooking', label: 'Dapur Penciptaan', desc: 'LABORATORIUM GENERASI ASSET AI', icon: <Flame size={24} />, color: 'bg-orange-600', onClick: onOpenCooking || onOpenAiStudio },
    { id: 'voice', label: 'Space Voice Studio', desc: 'SINTESIS NARASI VOCAL BEATSTORIA AI', icon: <Mic2 size={24} />, color: 'bg-blue-600', onClick: onOpenVoiceStudio },
    { id: 'cine', label: 'CineEngine Pro', desc: 'SUTRADARA VIRTUAL ULTRA-HD', icon: <Video size={24} />, color: 'bg-red-600', onClick: onOpenCineEngine },
    { id: 'titan', label: 'Titan Fill', desc: 'REKONSTRUKSI PIXEL GENERATIF', icon: <Wand2 size={24} />, color: 'bg-purple-600', onClick: onOpenTitanFill },
    { id: 'purge', label: 'Purge BG', desc: 'EKSTRAKSI SUBJEK DARI REALITAS', icon: <Scissors size={24} />, color: 'bg-rose-600', onClick: onOpenPurgeBg },
    { id: 'retouch', label: 'Penyembuh Neural', desc: 'KOREKSI TEKSTUR TINGKAT TINGGI', icon: <Bandage size={24} />, color: 'bg-emerald-600', onClick: onOpenRetouch },
    { id: 'typeface', label: 'Studio Tipografi', desc: 'MORFOLOGI TEKS TIGA DIMENSI', icon: <Type size={24} />, color: 'bg-pink-600', onClick: onOpenTypeface }
  ];

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={`fixed inset-0 z-[200] bg-black text-white font-sans overflow-y-auto custom-scrollbar flex flex-col items-center py-20 px-8 scroll-smooth ${isDraggingScroll ? 'active-dragging cursor-grabbing' : 'cursor-default'}`}
    >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.05)_0%,_transparent_70%)] pointer-events-none fixed"></div>

        <div className="max-w-6xl w-full space-y-24 relative z-10 pointer-events-none">
            <div className="text-center space-y-10 pointer-events-auto">
                <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-center gap-6">
                        <div className="relative p-3 bg-white text-black rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] rotate-3 hover:rotate-0 transition-transform overflow-visible group">
                            <QuillIcon size={32} className="relative z-10 text-black animate-quill-write" />
                        </div>
                        <div className="flex flex-col items-start -space-y-1">
                            <span className="text-4xl font-black tracking-tighter uppercase text-white">SPACE STUDIO <span className="text-orange-500">NEURAL</span></span>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.8em] pl-1.5 leading-none">BEATSTORIA AI</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 max-w-3xl mx-auto">
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-indigo-500">CREATIVE LAB</span>
                    </h1>
                    <p className="text-lg text-slate-400 font-medium tracking-wide max-w-2xl mx-auto animate-in fade-in duration-1000 delay-500">
                        Sintesis visual masa depan dengan kontrol presisi. Rancang kampanye editorial dan konten visual tanpa batas dengan kekuatan AI Gemini.
                    </p>
                </div>
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-700 pointer-events-auto">
                <div className="flex items-center gap-3 px-1 border-b border-white/5 pb-4">
                    <PenLine size={16} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">GERBANG ARSITEKTUR VISUAL</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {features.map((feat, i) => (
                        <button 
                            key={feat.id}
                            onClick={feat.onClick}
                            className="group relative flex flex-col items-start p-8 bg-white/5 border border-white/5 rounded-[2.5rem] hover:bg-white/10 hover:border-white/20 transition-all duration-500 text-left active:scale-[0.98] overflow-hidden"
                        >
                            <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${feat.color}`} />
                            <div className="relative z-10 w-full flex flex-col gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-500 group-hover:rotate-6 ${feat.color}`}>
                                    {feat.icon}
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-orange-400 transition-colors">{feat.label}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                        {feat.desc}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-2 group-hover:translate-x-2 transition-transform">
                                    Inisialisasi Protokol <ArrowRight size={14} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="mt-auto py-10 text-[8px] font-black text-slate-700 uppercase tracking-[0.5em] animate-pulse shrink-0 pointer-events-none">
            Sistem Desain Neural v3.5 Dioptimalkan untuk Sintesis Visual Premium
        </div>
    </div>
  );
};
