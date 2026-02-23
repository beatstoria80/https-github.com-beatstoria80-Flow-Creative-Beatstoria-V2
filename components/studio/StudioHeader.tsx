import React from 'react';
import { X, Zap, Activity, MessageSquare, Flame, PenLine } from 'lucide-react';

interface StudioHeaderProps {
  onClose: () => void;
  showAiPanel: boolean;
  onToggleAiPanel: () => void;
}

const QuillIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12.5 13.5L3.5 20.5V22.5H5.5L12.5 15.5M12.5 13.5C12.5 13.5 13.5 12.5 14.5 12.5C15.5 12.5 17.5 13.5 18.5 13.5C19.5 13.5 21.5 11.5 21.5 8.5C21.5 5.5 18.5 2.5 14.5 2.5C10.5 2.5 6.5 5.5 6.5 10.5C6.5 12.5 7.5 13.5 8.5 14.5C9.5 15.5 10.5 15.5 12.5 15.5M12.5 13.5L12.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const StudioHeader: React.FC<StudioHeaderProps> = ({ onClose, showAiPanel, onToggleAiPanel }) => {
  return (
    <div className="h-14 border-b border-white/10 bg-black flex items-center justify-between px-6 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <div className="relative flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-lg shadow-white/5 overflow-visible">
          <QuillIcon size={16} className="text-black relative z-10 animate-quill-write" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-white">SPACE <span className="text-orange-500">STUDIO</span></span>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Sinergi Neural Aktif</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
            onClick={onToggleAiPanel}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${showAiPanel ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
            title="Toggle Asisten Kreatif"
        >
            <MessageSquare size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Asisten Visual</span>
        </button>

        <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-[9px] font-bold text-slate-400">
           <div className="flex items-center gap-1.5 border-r border-white/10 pr-4">
              <Activity size={10} className="text-purple-400" />
              <span>SINTESIS DIPERCEPAT</span>
           </div>
           <span>MESIN: BEATSTORIA AI</span>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};