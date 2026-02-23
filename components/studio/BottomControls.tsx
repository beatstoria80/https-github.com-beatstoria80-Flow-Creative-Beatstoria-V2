import React from 'react';
import { 
  Send, Paperclip, Sparkles, Wand2, Zap, 
  Terminal, Globe, Loader2, RefreshCw, Layers, Sliders, Box, Layout, Target, Palette, ChevronUp
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { AssistantPanel } from '../editor/AssistantPanel';

interface BottomControlsProps {
  height: number;
  aiPanelWidth: number;
  showAiPanel: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  chatAttachments: {file: File, url: string}[];
  setChatAttachments?: React.Dispatch<React.SetStateAction<{file: File, url: string}[]>>;
  isChatLoading: boolean;
  handleSendMessage: (text?: string) => void;
  handleNewChat: () => void;
  handleChatFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (i: number) => void;
  chatFileRef: React.RefObject<HTMLInputElement>;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  setIsResizing: (v: 'ai-panel' | 'bottom' | null) => void;
  promptText: string;
  setPromptText: (v: string) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  handleStopGeneration: () => void;
  showGenerateControl: boolean;
  mode: string;
  setMode: (m: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  handleScan: () => void;
  isScanning: boolean;
  originalImage: string | null;
  presetsPanelWidth: number;
  presetData: any;
  appendTag: (t: string) => void;
  isCompareMode: boolean;
  setIsCompareMode: (v: boolean) => void;
  hasGeneratedResults: boolean;
  onRefinePrompt: () => void;
  isRefining: boolean;
  isSmartAssistantActive: boolean;
  toggleSmartAssistant: () => void;
  onCaptureContext: () => void;
  groundingSources?: any[];
}

export const BottomControls: React.FC<BottomControlsProps> = (props) => {
  const { 
    height, aiPanelWidth, showAiPanel, chatMessages, chatInput, setChatInput, isChatLoading, 
    handleSendMessage, handleNewChat, promptText, setPromptText, isGenerating, handleGenerate, mode, setMode,
    presetData, appendTag, onRefinePrompt, isRefining, groundingSources = [], chatAttachments, setChatAttachments
  } = props;

  return (
    <div className="bg-[#0a0a0a] border-t border-white/10 shrink-0 flex overflow-hidden z-40 relative shadow-[0_-10px_30px_rgba(0,0,0,0.5)]" style={{ height: height + 60 }}>
      
      {/* AI ASSISTANT OVERLAY */}
      {showAiPanel && (
          <div className="h-full border-r border-white/5 bg-black/40 flex flex-col shrink-0 overflow-hidden transition-all duration-500" style={{ width: aiPanelWidth }}>
            <AssistantPanel 
                messages={chatMessages}
                input={chatInput}
                setInput={setChatInput}
                onSend={handleSendMessage}
                isLoading={isChatLoading}
                onClear={handleNewChat}
                attachments={chatAttachments}
                setAttachments={setChatAttachments || (() => {})}
                variant="dark"
            />
          </div>
      )}

      {/* COMPACT HUD INTERFACE - VERTICAL HIERARCHY */}
      <div className="flex-1 flex flex-col gap-4 p-6 bg-black/80 backdrop-blur-xl justify-center">
        
        {/* ROW 1: PARAMETER CONTROLS (ABOVE) */}
        <div className="flex items-center gap-8 px-2">
           <div className="flex items-center gap-6 shrink-0">
              <div className="flex flex-col gap-1.5">
                 <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">BATCH SIZE</span>
                 <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
                   {['1X', '2X', '4X'].map(b => (
                      <button key={b} className={`px-3 py-1 rounded text-[7px] font-black transition-all ${b === '1X' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{b}</button>
                   ))}
                 </div>
              </div>

              <div className="h-8 w-px bg-white/10" />

              <div className="flex flex-col gap-1.5">
                 <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">ENGINE MODE</span>
                 <div className="flex gap-2">
                   {['Txt2Img', 'Img2Img'].map(m => (
                      <button key={m} onClick={() => setMode(m)} className={`px-4 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-white text-black border-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>{m}</button>
                   ))}
                 </div>
              </div>
           </div>

           <div className="flex-1" />

           <div className="flex items-center gap-4">
              <div className="flex flex-col items-end gap-1">
                 <span className="text-[7px] font-black text-green-500 uppercase tracking-widest">NEURAL READY</span>
                 <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                    <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">1 SOURCE ACTIVE</span>
                 </div>
              </div>
           </div>
        </div>

        {/* ROW 2: DESCRIBE & ANALISA (BELOW) */}
        <div className="flex items-center gap-4">
           <div className="flex-1 flex items-center gap-3 relative bg-[#0d0d0d] border border-white/5 rounded-2xl p-1.5 shadow-2xl transition-all focus-within:border-indigo-500/30">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                 <Terminal size={16} />
              </div>
              <textarea 
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Describe your creative vision..."
                className="flex-1 h-12 bg-transparent border-none text-[12px] font-bold text-slate-100 focus:ring-0 placeholder:text-slate-700 resize-none py-3 custom-scrollbar"
              />
              <button 
                onClick={onRefinePrompt}
                disabled={isRefining || !promptText}
                className="p-3 text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-0"
                title="Refine Prompt"
              >
                {isRefining ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={18} />}
              </button>
           </div>

           <button 
             onClick={handleGenerate}
             disabled={isGenerating || !promptText}
             className="h-14 w-14 bg-[#1a1a24] border border-white/10 hover:bg-orange-600 hover:border-orange-500 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 group shadow-xl"
             title={isGenerating ? "Synthesizing..." : "Analyze Node"}
           >
             {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Wand2 size={24} className="group-hover:rotate-12 transition-transform text-orange-500" />}
           </button>
        </div>
      </div>

      {/* QUICK PRESETS PANEL (Slim Vertical Rail) */}
      <div className="w-[60px] bg-black border-l border-white/10 flex flex-col items-center py-4 gap-4 overflow-y-auto no-scrollbar shrink-0">
         <button onClick={() => props.setIsCompareMode(!props.isCompareMode)} className={`p-2 rounded-lg transition-all ${props.isCompareMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`} title="Compare Mode"><Layers size={18}/></button>
         <button className="p-2 rounded-lg text-slate-500 hover:text-white transition-all" title="Style Nodes"><Palette size={18}/></button>
         <button className="p-2 rounded-lg text-slate-500 hover:text-white transition-all" title="Global Surface"><Layout size={18}/></button>
         <div className="mt-auto mb-2">
            <button className="p-2 rounded-lg text-slate-700 hover:text-white transition-all" title="Expand Controls"><ChevronUp size={16}/></button>
         </div>
      </div>

    </div>
  );
};