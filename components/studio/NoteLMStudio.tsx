
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, FileText, Plus, Minus, Search, Database, 
  Globe, Book, Loader2, Bot, User, 
  Trash2, Volume2, Copy, Layers, 
  Share2, Microscope, Wand2, Archive, 
  Link as LinkIcon, Link2Off, Eye, TriangleAlert,
  ImageIcon, ZoomIn, ZoomOut, Maximize, 
  ChevronLeft, ChevronRight,
  Cpu, Briefcase, PencilLine, GraduationCap, BarChart4, List,
  MessageSquare, Layout, Activity, Sparkles, Box, Signal,
  ArrowLeft, Grid, ChevronDown, ExternalLink, Download,
  FileType, FileSpreadsheet, FileCode, Printer, File as FileIcon, BookOpen,
  Check, Save, Type as LucideType, ArrowDown, ArrowUp, Hash, Workflow,
  MonitorUp, FileBarChart, Presentation, Network, CircleAlert,
  BarChart, TrendingUp, ShieldCheck, Sun, Moon, UploadCloud,
  Scan, FileSearch, HardDrive, Flame, CheckCircle2, Filter, Link2, History,
  Maximize2, Minimize2, RotateCcw, Move, Scissors, LayoutGrid, Split, Columns, PanelRight, ArrowRight, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Underline, FileCheck, ChevronsLeft, ChevronsRight, Undo, Redo, SpellCheck, 
  PaintRoller, Highlighter, Link, MessageCircle, Image, ListOrdered, ListIcon, Outdent, Indent, Strikethrough,
  Table, Grid3X3, FileJson, FileType2, FileOutput, Eraser, FilePlus, Menu, Hand, Sidebar, Square,
  Globe2, ArrowUpRight, RefreshCcw, Info, AlertCircle, ShieldAlert, Radio,
  PaintBucket, FunctionSquare, Lock, Star, AlignJustify, MoreHorizontal,
  FileDown, FilePlus2, EraserIcon, TableProperties, SortAsc, FilterIcon, Languages, Settings2, Puzzle,
  Ruler, Clipboard, Rocket
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { 
    saveNoteDoc, getAllNoteDocs, deleteNoteDoc 
} from '../../services/storageService';
import { SpaceNoteLM } from '../spacenotelm/SpaceNoteLM';
import { NoteDocument } from '../../types';

// --- STYLES ---
const studioStyles = `
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .toolbar-scroll::-webkit-scrollbar { height: 6px; }
  .toolbar-scroll::-webkit-scrollbar-track { background: transparent; }
  .toolbar-scroll::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.2); border-radius: 0; }
  .toolbar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.4); }
  @keyframes neon-glow {
    0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.4), 0 0 10px rgba(99, 102, 241, 0.2); }
    50% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.6), 0 0 25px rgba(99, 102, 241, 0.3); }
  }
  .research-active { animation: neon-glow 2s infinite ease-in-out; }
`;

interface NoteLMStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCooking: () => void;
  onApplyVisual: (src: string) => void;
  onOpenVoiceStudio: () => void;
}

// --- GLOBAL PDF CACHE ---
const pdfDocCache: Record<string, any> = {};

const fileToBase64Helper = (file: File): Promise<string> => 
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

const isRestrictedDomain = (url: string): boolean => {
    const restricted = ['youtube.com', 'google.com', 'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'github.com'];
    return restricted.some(domain => url.toLowerCase().includes(domain));
};

const PDFThumbnailCanvas: React.FC<{ docId: string, src: string, pageNum: number }> = ({ docId, src, pageNum }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        let isMounted = true;
        const render = async () => {
            try {
                if (!src || !src.includes(',')) throw new Error("Invalid Source");
                const pdfjsLib = (window as any).pdfjsLib;
                if (!pdfjsLib) throw new Error("PDF.js not loaded");

                let pdf;
                if (pdfDocCache[docId]) {
                    pdf = pdfDocCache[docId];
                } else {
                    const binary = atob(src.split(',')[1]);
                    const loadingTask = pdfjsLib.getDocument({ data: binary });
                    pdf = await loadingTask.promise;
                    pdfDocCache[docId] = pdf;
                }

                const page = await pdf.getPage(pageNum);
                
                if (!isMounted || !canvasRef.current) return;
                
                const viewport = page.getViewport({ scale: 0.25 }); 
                const context = canvasRef.current.getContext('2d');
                if (!context) return;

                canvasRef.current.height = viewport.height;
                canvasRef.current.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                if (isMounted) setStatus('ready');
            } catch (e) {
                console.error("Thumbnail render fail", e);
                if (isMounted) setStatus('error');
            }
        };
        render();
        return () => { isMounted = false; };
    }, [docId, src, pageNum]);

    return (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
            {status === 'loading' && <Loader2 size={12} className="animate-spin text-slate-700" />}
            {status === 'error' && <CircleAlert size={12} className="text-red-900/30" />}
            <canvas ref={canvasRef} className={`w-full h-full object-cover transition-opacity duration-500 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`} />
        </div>
    );
};

const PageThumbnail: React.FC<{ 
    index: number; 
    isActive: boolean; 
    type: string;
    docId: string;
    src?: string;
    onClick: () => void;
}> = ({ index, isActive, type, docId, src, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className={`w-full aspect-[3/4] mb-4 rounded-none border-2 transition-all flex flex-col overflow-hidden relative group ${isActive ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-[1.02] z-10 shadow-xl' : 'border-white/5 hover:border-white/20 opacity-60 hover:opacity-100 shadow-md'}`}
        >
            <div className="flex-1 bg-white/5 flex items-center justify-center overflow-hidden">
                {type === 'pdf' && src ? (
                    <PDFThumbnailCanvas docId={docId} src={src} pageNum={index + 1} />
                ) : type === 'image' && src ? (
                    <img src={src} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        {type === 'pdf' ? <FileIcon size={20} className="text-slate-600" /> : (type === 'web' ? <Globe2 size={20} className="text-slate-600" /> : (type === 'doc' ? <FileText size={20} className="text-blue-500" /> : (type === 'sheet' ? <Table size={20} className="text-green-500" /> : <ImageIcon size={20} className="text-slate-600" />)))}
                        <span className="text-[7px] font-bold text-slate-500 uppercase">Preview</span>
                    </div>
                )}
            </div>
            <div className={`h-7 w-full flex items-center justify-center text-[10px] font-black tracking-widest ${isActive ? 'bg-indigo-600 text-white' : 'bg-black/60 text-slate-400 group-hover:text-white'}`}>
                {index + 1}
            </div>
            {isActive && <div className="absolute inset-0 border-2 border-indigo-400/50 pointer-events-none rounded-none" />}
        </button>
    );
};

const GoogleSheetsEditor: React.FC<{ filename: string; initialData?: string; isDark: boolean; onSave: (data: string) => void }> = ({ filename, initialData, isDark, onSave }) => {
    const [gridData, setGridData] = useState<string[][]>([]);
    const [selectedCell, setSelectedCell] = useState<{ r: number, c: number } | null>(null);
    const [cellStyles, setCellStyles] = useState<Record<string, React.CSSProperties>>({});
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // Drag Scroll state
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startScrollTop, setStartScrollTop] = useState(0);

    useEffect(() => {
        if (initialData) {
            const lines = initialData.split('\n');
            const parsed = lines.map(line => line.split(','));
            const minRows = 50;
            const minCols = 26;
            const loadedRows = parsed.length;
            const loadedCols = parsed[0]?.length || 0;

            const finalGrid = [...parsed];
            for (let i = loadedRows; i < minRows; i++) {
                finalGrid.push(new Array(Math.max(loadedCols, minCols)).fill(''));
            }
            finalGrid.forEach(row => {
                while (row.length < Math.max(loadedCols, minCols)) row.push('');
            });
            setGridData(finalGrid);
        } else {
            setGridData(Array.from({ length: 50 }, () => Array(26).fill('')));
        }
    }, [initialData]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Robust window-level drag listeners
    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (!isDragging || !scrollContainerRef.current) return;
            const dy = e.clientY - startY;
            scrollContainerRef.current.scrollTop = startScrollTop - dy;
        };

        const handleWindowMouseUp = () => {
            setIsDragging(false);
            document.body.style.userSelect = 'auto';
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
            document.body.style.userSelect = 'none';
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
            document.body.style.userSelect = 'auto';
        };
    }, [isDragging, startY, startScrollTop]);

    const handleCellChange = (r: number, c: number, value: string) => {
        const newGrid = [...gridData];
        newGrid[r][c] = value;
        setGridData(newGrid);
    };

    const handleCellClick = (r: number, c: number) => {
        setSelectedCell({ r, c });
    };

    const applyStyle = (style: React.CSSProperties) => {
        if (!selectedCell) return;
        const key = `${selectedCell.r}-${selectedCell.c}`;
        setCellStyles(prev => ({
            ...prev,
            [key]: { ...prev[key], ...style }
        }));
    };

    const getCellStyle = (r: number, c: number) => {
        return cellStyles[`${r}-${c}`] || {};
    };

    const handleSave = () => {
        const csv = gridData.map(row => row.join(',')).join('\n');
        onSave(csv);
        setActiveMenu(null);
    };

    const handleDownloadCSV = () => {
        const csv = gridData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
        setActiveMenu(null);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // Don't drag if user is typing in a cell input
        if (target.tagName === 'INPUT') return;
        
        setIsDragging(true);
        setStartY(e.clientY);
        setStartScrollTop(scrollContainerRef.current?.scrollTop || 0);
    };

    const handleMenuAction = (action: string) => {
        switch (action) {
            case 'new': setGridData(Array.from({ length: 50 }, () => Array(26).fill(''))); break;
            case 'clear': setGridData(prev => prev.map(row => row.map(() => ''))); break;
            case 'insert-row': 
                if (selectedCell) {
                    const next = [...gridData];
                    next.splice(selectedCell.r, 0, new Array(gridData[0].length).fill(''));
                    setGridData(next);
                }
                break;
            case 'insert-col':
                if (selectedCell) {
                    const next = gridData.map(row => {
                        const r = [...row];
                        r.splice(selectedCell.c, 0, '');
                        return r;
                    });
                    setGridData(next);
                }
                break;
            case 'bold': applyStyle({ fontWeight: 'bold' }); break;
            case 'italic': applyStyle({ fontStyle: 'italic' }); break;
            case 'underline': applyStyle({ textDecoration: 'underline' }); break;
            case 'align-left': applyStyle({ textAlign: 'left' }); break;
            case 'align-center': applyStyle({ textAlign: 'center' }); break;
            case 'align-right': applyStyle({ textAlign: 'right' }); break;
            case 'save': handleSave(); break;
            case 'download-csv': handleDownloadCSV(); break;
        }
        setActiveMenu(null);
    };

    const menuItems: Record<string, { label: string; icon?: any; action?: string; shortcut?: string }[]> = {
        'File': [
            { label: 'New', icon: FilePlus2, action: 'new', shortcut: 'Ctrl+N' },
            { label: 'Save Project', icon: Save, action: 'save', shortcut: 'Ctrl+S' },
            { label: 'Download CSV', icon: FileDown, action: 'download-csv' },
            { label: 'Print', icon: Printer, action: 'print', shortcut: 'Ctrl+P' }
        ],
        'Edit': [
            { label: 'Undo', icon: Undo, action: 'undo', shortcut: 'Ctrl+Z' },
            { label: 'Redo', icon: Redo, action: 'redo', shortcut: 'Ctrl+Y' },
            { label: 'Clear All', icon: EraserIcon, action: 'clear' },
            { label: 'Delete Selection', icon: Trash2, action: 'delete-sel', shortcut: 'Del' }
        ],
        'View': [
            { label: 'Toggle Theme', icon: isDark ? Sun : Moon, action: 'theme' },
            { label: 'Show Gridlines', icon: Grid3X3, action: 'grid' },
            { label: 'Zoom (100%)', icon: ZoomIn, action: 'zoom' }
        ],
        'Insert': [
            { label: 'Row Above', icon: ArrowUp, action: 'insert-row' },
            { label: 'Column Left', icon: ArrowLeft, action: 'insert-col' },
            { label: 'Chart', icon: BarChart, action: 'chart' },
            { label: 'Function', icon: FunctionSquare, action: 'func' }
        ],
        'Format': [
            { label: 'Bold', icon: Bold, action: 'bold', shortcut: 'Ctrl+B' },
            { label: 'Italic', icon: Italic, action: 'italic', shortcut: 'Ctrl+I' },
            { label: 'Underline', icon: Underline, action: 'underline', shortcut: 'Ctrl+U' },
            { label: 'Align Left', icon: AlignLeft, action: 'align-left' },
            { label: 'Align Center', icon: AlignCenter, action: 'align-center' },
            { label: 'Align Right', icon: AlignRight, action: 'align-right' }
        ],
        'Data': [
            { label: 'Sort A-Z', icon: SortAsc, action: 'sort' },
            { label: 'Create Filter', icon: FilterIcon, action: 'filter' },
            { label: 'Data Validation', icon: CheckCircle2, action: 'valid' }
        ],
        'Tools': [
            { label: 'Spelling', icon: SpellCheck, action: 'spell' },
            { label: 'Language Settings', icon: Languages, action: 'lang' },
            { label: 'Settings', icon: Settings2, action: 'settings' }
        ],
        'Extensions': [
            { label: 'Add-ons', icon: Puzzle, action: 'addons' },
            { label: 'Macros', icon: FileCode, action: 'macro' }
        ],
        'Help': [
            { label: 'Documentation', icon: Info, action: 'help' },
            { label: 'Keyboard Shortcuts', icon: Hash, action: 'keys' }
        ]
    };

    const bgMain = isDark ? 'bg-[#1a1a1a]' : 'bg-white';
    const borderMain = isDark ? 'border-white/10' : 'border-gray-200';
    const textMain = isDark ? 'text-gray-100' : 'text-gray-800';
    const textSec = isDark ? 'text-gray-400' : 'text-gray-500';
    const bgToolbar = isDark ? 'bg-[#252525]' : 'bg-[#f0f4f8]';
    const bgHeader = isDark ? 'bg-[#2d2d2d]' : 'bg-gray-50';

    const headers = gridData[0] ? Array.from({ length: gridData[0].length }, (_, i) => String.fromCharCode(65 + (i % 26))) : [];

    return (
        <div className={`flex flex-col h-full w-full overflow-hidden ${bgMain} ${textMain}`} ref={menuRef}>
            {/* Fixed Header Area */}
            <div className="shrink-0 z-30">
                <div className={`flex items-center px-4 py-2 border-b ${borderMain}`}>
                    <div className="p-2 bg-green-600 rounded-none mr-4 shadow-lg shadow-green-900/20">
                        <FileSpreadsheet className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <input
                                type="text"
                                defaultValue={filename.replace(/\.(csv|xlsx|xls)$/i, '')}
                                className={`text-lg font-bold bg-transparent border-b border-transparent hover:border-white/20 focus:border-green-500 focus:outline-none transition-all ${textMain}`}
                            />
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        </div>
                        <div className="flex gap-1">
                            {Object.keys(menuItems).map(m => (
                                <div key={m} className="relative">
                                    <button 
                                        onClick={() => setActiveMenu(activeMenu === m ? null : m)}
                                        className={`px-2 py-0.5 text-[11px] font-medium rounded-none hover:bg-white/10 transition-colors ${activeMenu === m ? 'bg-white/10 text-green-500' : textSec}`}
                                    >
                                        {m}
                                    </button>
                                    {activeMenu === m && (
                                        <div className={`absolute top-full left-0 mt-1 w-56 rounded-none border shadow-2xl z-[1000] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#222] border-white/10' : 'bg-white border-gray-100'}`}>
                                            <div className="p-1">
                                                {menuItems[m].map((item, idx) => (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => handleMenuAction(item.action!)}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-none text-[11px] font-medium transition-colors ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {item.icon && <item.icon size={14} className="text-gray-400" />}
                                                            <span>{item.label}</span>
                                                        </div>
                                                        {item.shortcut && <span className="text-[9px] text-gray-500 font-mono">{item.shortcut}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className={`p-2 rounded-none hover:bg-white/10 ${textSec}`}><MessageSquare className="w-5 h-5" /></button>
                        <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-none font-bold text-xs hover:bg-green-500 cursor-pointer transition-all shadow-lg shadow-green-900/20">
                            <Lock className="w-3 h-3" />
                            <span>Share</span>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className={`flex items-center px-4 py-2 ${bgToolbar} border-b ${borderMain} gap-2 overflow-x-auto toolbar-scroll`}>
                    <div className={`flex items-center gap-1 pr-2 border-r ${borderMain}`}>
                        <button className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><Undo className="w-4 h-4" /></button>
                        <button className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><Redo className="w-4 h-4" /></button>
                        <button className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><Printer className="w-4 h-4" /></button>
                        <button className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><PaintBucket className="w-4 h-4" /></button>
                    </div>
                    <div className={`flex items-center gap-2 px-2 border-r ${borderMain}`}>
                        <span className={`text-xs font-bold ${textMain}`}>100%</span>
                        <ChevronDown className={`w-3 h-3 ${textSec}`} />
                    </div>
                    <div className={`flex items-center gap-1 px-2 border-r ${borderMain}`}>
                        <button onClick={() => handleMenuAction('bold')} className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><Bold className="w-4 h-4" /></button>
                        <button onClick={() => handleMenuAction('italic')} className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><Italic className="w-4 h-4" /></button>
                        <button onClick={() => applyStyle({ textDecoration: 'line-through' })} className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><Strikethrough className="w-4 h-4" /></button>
                    </div>
                    <div className={`flex items-center gap-1 px-2 border-r ${borderMain}`}>
                        <button onClick={() => handleMenuAction('align-left')} className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><AlignLeft className="w-4 h-4" /></button>
                        <button onClick={() => handleMenuAction('align-center')} className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><AlignCenter className="w-4 h-4" /></button>
                        <button onClick={() => handleMenuAction('align-right')} className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><AlignRight className="w-4 h-4" /></button>
                    </div>
                    <div className={`flex items-center gap-1 px-2`}>
                        <button className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><LinkIcon className="w-4 h-4" /></button>
                        <button className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><Filter className="w-4 h-4" /></button>
                        <button className={`p-1.5 rounded-none hover:bg-white/10 ${textSec}`}><FunctionSquare className="w-4 h-4" /></button>
                    </div>
                </div>

                {/* Formula Bar */}
                <div className={`flex items-center px-2 py-1 ${bgMain} border-b ${borderMain}`}>
                    <div className={`px-2 border-r ${borderMain} font-bold ${textSec} w-10 text-center text-xs italic font-serif`}>fx</div>
                    <input
                        type="text"
                        className={`flex-1 px-3 py-1 outline-none text-xs bg-transparent ${textMain}`}
                        value={selectedCell ? gridData[selectedCell.r]?.[selectedCell.c] || '' : ''}
                        onChange={(e) => selectedCell && handleCellChange(selectedCell.r, selectedCell.c, e.target.value)}
                        placeholder={selectedCell ? `Function for ${String.fromCharCode(65 + selectedCell.c)}${selectedCell.r + 1}` : ""}
                    />
                </div>
            </div>

            {/* Scrollable Grid Area */}
            <div 
                ref={scrollContainerRef}
                className={`flex-1 overflow-auto relative hide-scrollbar ${isDark ? 'bg-[#111]' : 'bg-gray-100'} ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
            >
                <table className={`border-collapse w-full table-fixed text-xs ${bgMain}`}>
                    <thead>
                        <tr>
                            <th className={`w-10 ${bgHeader} border ${borderMain} sticky top-0 left-0 z-20`}></th>
                            {headers.map((h, i) => (
                                <th key={i} className={`w-24 ${bgHeader} border ${borderMain} font-bold ${textSec} py-1 sticky top-0 z-10 select-none`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {gridData.map((row, r) => (
                            <tr key={r}>
                                <td className={`${bgHeader} border ${borderMain} text-center ${textSec} font-bold sticky left-0 z-10 select-none`}>
                                    {r + 1}
                                </td>
                                {row.map((cellValue, c) => {
                                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                                    return (
                                        <td
                                            key={c}
                                            onClick={() => handleCellClick(r, c)}
                                            className={`border min-w-[6rem] p-0 relative ${isSelected ? 'border-2 border-green-500 z-10' : borderMain}`}
                                            style={getCellStyle(r, c)}
                                        >
                                            <input
                                                type="text"
                                                className={`w-full h-full px-1 py-0.5 bg-transparent outline-none border-none ${textMain}`}
                                                value={cellValue}
                                                onChange={(e) => handleCellChange(r, c, e.target.value)}
                                                style={{ ...getCellStyle(r, c) }}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Tabs */}
            <div className={`shrink-0 flex items-center px-4 py-1.5 ${bgHeader} border-t ${borderMain} text-xs`}>
                <button className={`p-1 hover:bg-white/10 rounded-none mr-4 ${textSec}`}><Plus className="w-4 h-4" /></button>
                <div className="flex items-center gap-1">
                    <button className={`px-4 py-1.5 bg-white border-b-2 border-green-500 text-green-600 font-bold shadow-sm rounded-t-none ${isDark ? 'bg-[#333] text-green-400' : ''}`}>Sheet1</button>
                    <button className={`px-4 py-1.5 ${textSec} hover:bg-white/5 rounded-t-none`}>Sheet2</button>
                </div>
            </div>
        </div>
    );
};

const GoogleDocsEditor: React.FC<{ filename: string; initialContent: string; isDark: boolean; onSave: (data: string) => void }> = ({ filename, initialContent, isDark, onSave }) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startScrollTop, setStartScrollTop] = useState(0);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = initialContent || "<p>Start typing...</p>";
        }
    }, [initialContent]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Robust window-level drag listeners
    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (!isDragging || !scrollContainerRef.current) return;
            const dy = e.clientY - startY;
            scrollContainerRef.current.scrollTop = startScrollTop - dy;
        };

        const handleWindowMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [isDragging, startY, startScrollTop]);

    const handleFormat = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            editorRef.current.focus();
        }
        setActiveMenu(null);
    };

    const handleSave = () => {
        if (editorRef.current) {
            onSave(editorRef.current.innerHTML);
        }
        setActiveMenu(null);
    };

    const handleDownload = () => {
        if (!editorRef.current) return;
        const blob = new Blob([editorRef.current.innerHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.html`;
        link.click();
        setActiveMenu(null);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // Don't drag if user clicked inside the editable area
        if (target.closest('[contenteditable="true"]')) return;
        
        setIsDragging(true);
        setStartY(e.clientY);
        setStartScrollTop(scrollContainerRef.current?.scrollTop || 0);
    };

    const handleMenuAction = (action: string) => {
        switch (action) {
            case 'save': handleSave(); break;
            case 'download': handleDownload(); break;
            case 'print': window.print(); break;
            default: handleFormat(action); break;
        }
    };

    const menuItems: Record<string, { label: string; icon?: any; action?: string; shortcut?: string }[]> = {
        'File': [
            { label: 'New', icon: FilePlus2, action: 'new', shortcut: 'Ctrl+N' },
            { label: 'Save Project', icon: Save, action: 'save', shortcut: 'Ctrl+S' },
            { label: 'Download HTML', icon: FileDown, action: 'download' },
            { label: 'Print', icon: Printer, action: 'print', shortcut: 'Ctrl+P' }
        ],
        'Edit': [
            { label: 'Undo', icon: Undo, action: 'undo', shortcut: 'Ctrl+Z' },
            { label: 'Redo', icon: Redo, action: 'redo', shortcut: 'Ctrl+Y' },
            { label: 'Paste', icon: Clipboard, action: 'paste', shortcut: 'Ctrl+V' },
            { label: 'Select All', icon: FileCheck, action: 'selectAll', shortcut: 'Ctrl+A' }
        ],
        'View': [
            { label: 'Full Screen', icon: Maximize2, action: 'fullscreen' },
            { label: 'Show Rulers', icon: Ruler, action: 'ruler' },
            { label: 'Light Theme', icon: Sun, action: 'light' }
        ],
        'Insert': [
            { label: 'Image', icon: Image, action: 'insertImage' },
            { label: 'Link', icon: Link, action: 'createLink' },
            { label: 'Table', icon: Table, action: 'insertTable' },
            { label: 'Special Characters', icon: Hash, action: 'chars' }
        ],
        'Help': [
            { label: 'Documentation', icon: Info, action: 'help' },
            { label: 'About', icon: AlertCircle, action: 'about' }
        ]
    };

    const bgMain = isDark ? 'bg-[#1a1a1a]' : 'bg-white';
    const bgDoc = isDark ? 'bg-[#222]' : 'bg-[#F9FBFD]';
    const borderMain = isDark ? 'border-white/10' : 'border-gray-200';
    const textMain = isDark ? 'text-gray-100' : 'text-gray-800';
    const textSec = isDark ? 'text-gray-400' : 'text-gray-500';
    const bgToolbar = isDark ? 'bg-[#2d2d2d]' : 'bg-[#EDF2FA]';

    return (
        <div className={`flex flex-col h-full ${bgDoc} transition-colors duration-300 w-full overflow-hidden`} ref={menuRef}>
            {/* Fixed Header Area */}
            <div className="shrink-0 z-30">
                <div className={`flex items-center px-4 py-2 ${bgMain} border-b ${borderMain}`}>
                    <div className="p-2 bg-blue-600 rounded-none mr-4 shadow-lg shadow-blue-900/20">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <input
                                type="text"
                                defaultValue={filename.replace(/\.(doc|docx)$/i, '')}
                                className={`text-lg font-bold bg-transparent hover:border hover:border-gray-300 dark:hover:border-gray-600 rounded-none px-1.5 focus:outline-none focus:border-blue-500 transition-colors ${textMain}`}
                            />
                            <Star className="w-4 h-4 text-gray-400 hover:text-yellow-400 cursor-pointer" />
                        </div>
                        <div className="flex gap-1">
                            {Object.keys(menuItems).map(m => (
                                <div key={m} className="relative">
                                    <button 
                                        onClick={() => setActiveMenu(activeMenu === m ? null : m)}
                                        className={`px-2 py-0.5 text-[11px] font-medium rounded-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${activeMenu === m ? 'bg-gray-100 dark:bg-gray-700 text-blue-500' : textSec}`}
                                    >
                                        {m}
                                    </button>
                                    {activeMenu === m && (
                                        <div className={`absolute top-full left-0 mt-1 w-56 rounded-none border shadow-2xl z-[1000] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#222] border-white/10' : 'bg-white border-gray-100'}`}>
                                            <div className="p-1">
                                                {menuItems[m].map((item, idx) => (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => handleMenuAction(item.action!)}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-none text-[11px] font-medium transition-colors ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {item.icon && <item.icon size={14} className="text-gray-400" />}
                                                            <span>{item.label}</span>
                                                        </div>
                                                        {item.shortcut && <span className="text-[9px] text-gray-500 font-mono">{item.shortcut}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-none ${textSec}`}>
                            <MessageSquare className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-none font-bold text-xs hover:shadow-sm cursor-pointer transition-all">
                            <Lock className="w-3 h-3" />
                            <span>Share</span>
                        </div>
                    </div>
                </div>

                {/* Fixed Toolbar */}
                <div className={`flex items-center px-4 py-1.5 ${bgToolbar} rounded-none mx-4 my-2 gap-1 overflow-x-auto shadow-sm select-none border border-transparent ${isDark ? 'border-gray-700' : ''} toolbar-scroll`}>
                    <div className={`flex items-center gap-1 pr-2 border-r ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                        <button onClick={() => handleFormat('undo')} className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none ${textSec}`} title="Undo"><Undo className="w-4 h-4" /></button>
                        <button onClick={() => handleFormat('redo')} className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none ${textSec}`} title="Redo"><Redo className="w-4 h-4" /></button>
                        <button onClick={() => window.print()} className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none ${textSec}`} title="Print"><Printer className="w-4 h-4" /></button>
                    </div>
                    <div className={`flex items-center gap-1 px-2 border-r ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                        <button onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none font-bold ${textSec}`} title="Bold"><Bold className="w-4 h-4" /></button>
                        <button onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }} className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none italic ${textSec}`} title="Italic"><Italic className="w-4 h-4" /></button>
                        <button onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }} className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-none underline ${textSec}`} title="Underline"><Underline className="w-4 h-4" /></button>
                    </div>
                    <button onClick={handleSave} className="ml-auto p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-none flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-md">
                        <Save size={14} /> SAVE
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div
                ref={scrollContainerRef}
                className={`flex-1 overflow-auto flex justify-center p-8 ${bgDoc} hide-scrollbar ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={handleMouseDown}
            >
                <div
                    ref={editorRef}
                    className="w-[816px] min-h-[1056px] bg-white shadow-2xl p-[96px] outline-none cursor-text shrink-0 text-slate-800"
                    contentEditable
                    suppressContentEditableWarning
                    style={{
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '11pt',
                        lineHeight: '1.5',
                        backgroundColor: '#ffffff',
                        height: 'auto'
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    );
};

const DocumentVisualizer: React.FC<{ 
    doc: NoteDocument; 
    isDark: boolean;
    onContentChange: (newContent: string) => void;
    isMultiMode: boolean; 
}> = ({ doc, isDark, onContentChange, isMultiMode }) => {
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const renderTasks = useRef<any[]>([]); 
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const textEditorRef = useRef<HTMLDivElement>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(0.85);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const [isDraggingScroll, setIsDraggingScroll] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startScrollTop, setStartScrollTop] = useState(0);

    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMultiMode); 
    const [viewMode, setViewMode] = useState<'focus' | 'flow'>(doc.pageCount > 1 ? 'flow' : 'focus');
    
    const [browserUrl, setBrowserUrl] = useState(doc.url || "");
    const [addressInput, setAddressInput] = useState(doc.url || "");
    const [refreshKey, setRefreshKey] = useState(0);

    const [jumpValue, setJumpValue] = useState("1");
    const [editValue, setEditValue] = useState(doc.content);

    useEffect(() => {
        setEditValue(doc.content);
        if (textEditorRef.current) {
            textEditorRef.current.innerText = doc.content;
        }
        setCurrentPage(1);
        setJumpValue("1");
        setViewMode(doc.pageCount > 1 ? 'flow' : 'focus');
        if (doc.type === 'web') {
            setBrowserUrl(doc.url || "");
            setAddressInput(doc.url || "");
        }
    }, [doc.content, doc.id, doc.pageCount, doc.url, doc.type]);

    useEffect(() => {
        if (doc.type === 'pdf' && doc.originalSrc) {
            const renderSequence = async () => {
                renderTasks.current.forEach(task => { if (task) try { task.cancel(); } catch(e){} });
                renderTasks.current = [];

                try {
                    const pdfjsLib = (window as any).pdfjsLib;
                    let pdf;
                    if (pdfDocCache[doc.id]) {
                        pdf = pdfDocCache[doc.id];
                    } else {
                        const binary = atob(doc.originalSrc!.split(',')[1]);
                        const loadingTask = pdfjsLib.getDocument({ data: binary });
                        pdf = await loadingTask.promise;
                        pdfDocCache[doc.id] = pdf;
                    }

                    const limit = viewMode === 'flow' ? 3 : 1;

                    for (let i = 0; i < limit; i++) {
                        const pageNum = currentPage + i;
                        if (pageNum > doc.pageCount) break;

                        const canvas = canvasRefs.current[i];
                        if (!canvas) continue;

                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 1.5 });
                        const context = canvas.getContext('2d');
                        if (!context) continue;

                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        
                        const renderTask = page.render({ canvasContext: context, viewport: viewport });
                        renderTasks.current[i] = renderTask;
                        await renderTask.promise;
                    }
                } catch (e) {}
            };
            renderSequence();
        }
    }, [doc.id, currentPage, doc.originalSrc, doc.pageCount, viewMode]);

    // Robust window-level drag listeners for DocumentVisualizer
    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
            } else if (isDraggingScroll && scrollContainerRef.current) {
                const dy = e.clientY - startY;
                scrollContainerRef.current.scrollTop = startScrollTop - dy;
            }
        };

        const handleWindowMouseUp = () => {
            setIsDragging(false);
            setIsDraggingScroll(false);
            document.body.style.userSelect = 'auto';
        };

        if (isDragging || isDraggingScroll) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
            document.body.style.userSelect = 'none';
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
            document.body.style.userSelect = 'auto';
        };
    }, [isDragging, isDraggingScroll, startY, startScrollTop]);

    const handleJump = (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseInt(jumpValue);
        if (!isNaN(p) && p >= 1 && p <= doc.pageCount) {
            setCurrentPage(p);
        } else {
            setJumpValue(currentPage.toString());
        }
    };

    const handleAddressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let url = addressInput.trim();
        if (!url) return;
        if (!url.startsWith('http')) url = `https://${url}`;
        setBrowserUrl(url);
        setAddressInput(url);
        setRefreshKey(prev => prev + 1);
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const isCanvasMode = doc.type === 'pdf' || doc.type === 'image';
    const isUrlRestricted = isRestrictedDomain(browserUrl);

    // --- SCROLL DRAG HANDLERS ---
    const handleMouseDownScroll = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // Don't start drag if we aren't clicking interactive elements like textarea or inputs
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'TD' || target.closest('button') || target.closest('[contenteditable="true"]')) return;

        if (isCanvasMode) {
            setIsDragging(true);
            dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        } else {
            setIsDraggingScroll(true);
            setStartY(e.clientY);
            setStartScrollTop(scrollContainerRef.current?.scrollTop || 0);
        }
    };

    // Workspace Background
    const workspaceBg = isDark ? 'bg-[#0a0a0a]' : 'bg-[#f1f5f9]';

    return (
        <div className={`relative w-full h-full overflow-hidden flex ${isDark ? 'bg-[#050505]' : 'bg-slate-100'}`}>
            <style dangerouslySetInnerHTML={{ __html: studioStyles }} />
            
            {/* SIDEBAR WRAPPER */}
            {(doc.pageCount > 1 || doc.type === 'pdf') && !isMultiMode && (
                <div className="relative flex shrink-0 z-[200]">
                    <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border-r relative flex flex-col overflow-hidden ${isSidebarOpen ? 'w-52' : 'w-0 border-none' } ${isDark ? 'bg-[#080808] border-white/5' : 'bg-white border-slate-200'}`}>
                        <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20 shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">Document Grid</span>
                            <div className="px-2 py-0.5 rounded-none bg-indigo-500/10 text-indigo-500 text-[8px] font-black shrink-0">{doc.pageCount} Pgs</div>
                        </div>
                        <div className="flex-1 overflow-y-auto studio-scrollbar p-5">
                            {Array.from({ length: doc.pageCount }).map((_, i) => (
                                <PageThumbnail 
                                    key={i} 
                                    index={i} 
                                    isActive={currentPage === i + 1} 
                                    type={doc.type}
                                    docId={doc.id}
                                    src={doc.originalSrc}
                                    // Use correct icon names without suffix where appropriate
                                    onClick={() => { setCurrentPage(i + 1); setJumpValue((i + 1).toString()); }}
                                />
                            ))}
                        </div>
                    </div>

                    <div 
                        className={`absolute top-0 right-[-10px] bottom-0 w-6 flex items-center justify-center z-[300] group cursor-pointer`}
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <div className={`w-0.5 h-full transition-colors duration-500 ${isSidebarOpen ? (isDark ? 'bg-white/5 group-hover:bg-indigo-500/50' : 'bg-slate-200 group-hover:bg-indigo-500/50') : 'bg-transparent'}`} />
                        
                        <button 
                            className={`
                                absolute flex flex-col items-center justify-center w-6 h-20 
                                rounded-none shadow-2xl border backdrop-blur-xl
                                transition-all duration-500 group-hover:scale-110 active:scale-95
                                ${isDark 
                                    ? 'bg-black/80 border-white/10 text-slate-400 group-hover:text-white group-hover:border-indigo-500/50' 
                                    : 'bg-white/90 border-slate-200 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-500/50'
                                }
                            `}
                            title={isSidebarOpen ? "Minimize Grid" : "Maximize Grid"}
                        >
                            <div className="flex flex-col items-center gap-1">
                                {/* Use correct icon names */}
                                {isSidebarOpen ? <ChevronLeft size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                                <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                                    <div className="w-1 h-1 rounded-none bg-current"></div>
                                    <div className="w-1 h-1 rounded-none bg-current"></div>
                                    <div className="w-1 h-1 rounded-none bg-current"></div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                
                {doc.type !== 'web' && doc.type !== 'sheet' && doc.type !== 'doc' && doc.type !== 'text' && (
                    <div className="absolute right-4 top-4 z-[400] flex items-center gap-2 animate-in slide-in-from-right-2 duration-700">
                        <div className={`flex items-center h-10 px-3 backdrop-blur-3xl border rounded-none shadow-[0_15px_35px_rgba(0,0,0,0.5)] transition-colors ${isDark ? 'bg-black/60 border-white/10' : 'bg-white border-slate-200'}`}>
                            
                            {(doc.pageCount > 1 || doc.type === 'pdf') && (
                                <div className="flex items-center gap-1.5 border-r border-white/10 pr-3 mr-3 h-full">
                                    <button 
                                        onClick={() => { const p = Math.max(1, currentPage - 1); setCurrentPage(p); setJumpValue(p.toString()); }}
                                        disabled={currentPage === 1}
                                        className="p-1 rounded-none hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 disabled:opacity-10 transition-all active:scale-90 flex items-center justify-center"
                                    >
                                        {/* Use correct icon names */}
                                        <ChevronLeft size={13} strokeWidth={4} />
                                    </button>
                                    
                                    <form onSubmit={handleJump} className={`flex items-center justify-center gap-1 px-2 h-6 rounded-none border transition-all focus-within:border-indigo-500/50 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        <input 
                                            type="text" 
                                            value={jumpValue} 
                                            onChange={(e) => setJumpValue(e.target.value)}
                                            className={`w-4 bg-transparent border-none text-center font-black text-[10px] p-0 outline-none flex items-center justify-center h-full leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}
                                        />
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center h-full leading-none">/ {doc.pageCount}</span>
                                    </form>

                                    <button 
                                        onClick={() => { const p = Math.min(doc.pageCount, currentPage + 1); setCurrentPage(p); setJumpValue(p.toString()); }}
                                        disabled={currentPage === doc.pageCount}
                                        className="p-1 rounded-none hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 disabled:opacity-10 transition-all active:scale-90 flex items-center justify-center"
                                    >
                                        {/* Use correct icon names */}
                                        <ChevronRight size={13} strokeWidth={4} />
                                    </button>
                                </div>
                            )}

                            {(doc.pageCount > 1 || doc.type === 'pdf') && (
                                <div className="flex items-center gap-1 border-r border-white/10 pr-3 mr-3">
                                    <div className={`flex p-0.5 rounded-none border ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                        <button 
                                            onClick={() => { setViewMode('focus'); setScale(0.85); setPosition({x:0,y:0}); }}
                                            className={`w-8 h-6 rounded-none flex items-center justify-center transition-all ${viewMode === 'focus' ? (isDark ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-md') : 'text-slate-500 hover:text-slate-400'}`}
                                            title="Focus Mode"
                                        >
                                            <Square size={10} strokeWidth={3} />
                                        </button>
                                        <button 
                                            onClick={() => { setViewMode('flow'); setScale(0.75); setPosition({x:0,y:0}); }}
                                            className={`w-8 h-6 rounded-none flex items-center justify-center transition-all ${viewMode === 'flow' ? (isDark ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-md') : 'text-slate-500 hover:text-slate-400'}`}
                                            title="Flow Mode"
                                        >
                                            <Columns size={10} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setScale(s => Math.max(0.1, s / 1.15))} className="p-1 text-slate-500 hover:text-indigo-500 transition-colors"><ZoomOut size={13}/></button>
                                <span className="text-[10px] font-black text-slate-400 w-8 text-center">{Math.round(scale * 100)}%</span>
                                <button onClick={() => setScale(s => Math.min(4, s * 1.15))} className="p-1 text-slate-500 hover:text-indigo-500 transition-colors"><ZoomIn size={13}/></button>
                            </div>
                        </div>
                    </div>
                )}

                <div 
                    ref={scrollContainerRef}
                    className={`flex-1 relative ${isDragging || isDraggingScroll ? 'cursor-grabbing' : (isCanvasMode ? 'cursor-grab' : 'cursor-default')} ${workspaceBg} hide-scrollbar ${doc.type === 'web' || doc.type === 'sheet' || doc.type === 'doc' || doc.type === 'text' ? 'overflow-hidden' : 'overflow-auto'}`}
                    onMouseDown={handleMouseDownScroll}
                >
                    {/* Workspace dot grid */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                    
                    <div 
                        className={`w-full flex items-center ${doc.type === 'web' || doc.type === 'sheet' || doc.type === 'doc' || doc.type === 'text' ? 'flex-col justify-start pt-0 px-0 min-h-full' : (viewMode === 'flow' ? 'flex-row justify-center min-h-full' : 'flex-col justify-center min-h-full')} transition-all duration-300 ease-out ${viewMode === 'flow' ? 'gap-10' : ''}`}
                        style={{ 
                            transform: (doc.type === 'web' || doc.type === 'sheet' || doc.type === 'doc' || doc.type === 'text') ? 'none' : `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16,1,0.3,1)'
                        }}
                    >
                        {doc.type === 'web' ? (
                            <div className="w-full h-full min-h-screen flex flex-col animate-in fade-in zoom-in-95 duration-700 bg-white shadow-2xl border border-white/10 overflow-hidden">
                                <div className={`h-12 px-4 border-b flex items-center gap-3 shrink-0 ${isDark ? 'bg-black border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className="flex items-center gap-1">
                                        {/* Use correct icon names */}
                                        <button className="p-2 rounded-none hover:bg-black/5 text-slate-500 active:scale-95 transition-all" title="Back"><ChevronLeft size={16} /></button>
                                        <button className="p-2 rounded-none hover:bg-black/5 text-slate-500 active:scale-95 transition-all" title="Forward"><ChevronRight size={16} /></button>
                                        <button 
                                            onClick={handleRefresh}
                                            className="p-2 rounded-none hover:bg-black/5 text-slate-500 active:rotate-180 transition-all duration-500" 
                                            title="Reload"
                                        >
                                            <RefreshCcw size={14} />
                                        </button>
                                    </div>
                                    
                                    <form onSubmit={handleAddressSubmit} className={`flex-1 flex items-center h-8 px-4 rounded-none border group transition-all focus-within:border-indigo-500/50 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                        <Globe2 size={12} className="text-orange-500 mr-2 shrink-0" />
                                        <input 
                                            type="text"
                                            value={addressInput}
                                            onChange={(e) => setAddressInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddressSubmit(e as any)}
                                            className={`flex-1 bg-transparent border-none text-[10px] font-bold py-2 focus:ring-0 outline-none ${isDark ? 'text-slate-200 placeholder:text-slate-700' : 'text-slate-900 placeholder:text-slate-400'}`}
                                            spellCheck={false}
                                        />
                                        <ShieldCheck size={12} className="text-green-500 ml-2 shrink-0" />
                                    </form>

                                    <button 
                                        onClick={() => window.open(browserUrl, '_blank')}
                                        className={`flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-none text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/20 active:scale-95 group`}
                                    >
                                        <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> OPEN EXTERNAL
                                    </button>
                                </div>

                                <div className="flex-1 bg-[#f8fafc] relative overflow-hidden">
                                    {!isUrlRestricted ? (
                                        <iframe 
                                            key={refreshKey}
                                            src={browserUrl} 
                                            className="w-full h-full border-none bg-white"
                                            title={doc.title}
                                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-white">
                                            <div className="bg-white p-10 rounded-none border border-slate-200 shadow-2xl max-w-lg animate-in zoom-in-95 duration-700">
                                                <div className="w-20 h-20 bg-orange-50 rounded-none flex items-center justify-center text-orange-500 mx-auto mb-8 shadow-inner">
                                                    <ShieldAlert size={40} />
                                                </div>
                                                <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 mb-4">Neural Gateway Protocol</h3>
                                                <p className="text-[11px] font-medium leading-relaxed text-slate-500 uppercase tracking-wide mb-8 px-4">
                                                    Situs <span className="text-indigo-600 font-bold">{browserUrl.split('/')[2]}</span> memiliki kebijakan keamanan ketat yang mencegah tampilan di dalam kanvas (Refused to Connect).
                                                </p>
                                                
                                                <button 
                                                    onClick={() => window.open(browserUrl, '_blank')}
                                                    className="w-full py-4 bg-slate-950 text-white rounded-none font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl active:scale-95 group"
                                                >
                                                    <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> 
                                                    LUNCURKAN KE WINDOW BARU
                                                </button>

                                                <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-center gap-4 opacity-40">
                                                    <div className="flex items-center gap-2">
                                                        <Radio size={12} className="text-slate-400 animate-pulse" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">ENCRYPTED LINK</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : doc.type === 'pdf' ? (
                            (viewMode === 'flow' ? [0, 1, 2] : [0]).map(i => {
                                const pageNum = currentPage + i;
                                if (pageNum > doc.pageCount) return null;
                                return (
                                    <div key={pageNum} className="flex flex-col items-center gap-4 group/page animate-in fade-in zoom-in-95 duration-500">
                                        <div className="relative shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] border border-white/5 rounded-none overflow-hidden bg-white">
                                            <canvas 
                                                ref={el => { canvasRefs.current[i] = el; }} 
                                                className="max-w-[85vw] max-h-[90vh] object-contain transition-all duration-500" 
                                            />
                                        </div>
                                        <div className="px-6 py-2 rounded-none bg-black/60 backdrop-blur-xl text-[11px] font-black text-white/50 border border-white/10 opacity-0 group-hover/page:opacity-100 transition-all shadow-2xl shrink-0">
                                            HALAMAN {pageNum}
                                        </div>
                                    </div>
                                );
                            })
                        ) : doc.type === 'image' ? (
                            <img src={doc.originalSrc} className="max-w-[85vw] max-h-[85vh] object-contain shadow-[0_80px_160px_-40px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none" draggable={false} />
                        ) : doc.type === 'sheet' ? (
                            <div className="w-full h-full min-h-screen flex flex-col overflow-hidden shadow-2xl">
                                <GoogleSheetsEditor filename={doc.title} initialData={doc.content} isDark={isDark} onSave={(data) => onContentChange(data)} />
                            </div>
                        ) : doc.type === 'doc' ? (
                            <div className="w-full h-full min-h-screen flex flex-col overflow-hidden shadow-2xl">
                                <GoogleDocsEditor filename={doc.title} initialContent={doc.content} isDark={isDark} onSave={(data) => onContentChange(data)} />
                            </div>
                        ) : (
                            <div className="w-full min-h-screen flex flex-col overflow-hidden shadow-2xl">
                                {/* Simple Text Header (Fixed) */}
                                <div className={`shrink-0 h-12 px-6 border-b flex items-center justify-between z-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className="flex items-center gap-3">
                                        <FileText size={16} className="text-indigo-50" />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>{doc.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-none bg-green-500 animate-pulse"></div>
                                        <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">PROSESSOR TEKS AKTIF</span>
                                    </div>
                                </div>
                                
                                {/* Centered Paper Scroll Area */}
                                <div 
                                    ref={scrollContainerRef} 
                                    className="flex-1 overflow-auto flex justify-center p-8 hide-scrollbar bg-slate-100/50 dark:bg-black/20"
                                >
                                    <div 
                                        ref={textEditorRef}
                                        className="w-[816px] min-h-[1056px] bg-white shadow-2xl p-[96px] outline-none cursor-text shrink-0 text-slate-800 block"
                                        contentEditable
                                        suppressContentEditableWarning
                                        style={{
                                            fontFamily: 'Montserrat, sans-serif',
                                            fontSize: '11pt',
                                            lineHeight: '1.8',
                                            backgroundColor: '#ffffff',
                                            display: 'block',
                                            height: 'auto'
                                        }}
                                        onInput={(e) => onContentChange(e.currentTarget.innerText)}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const NoteLMStudio: React.FC<NoteLMStudioProps> = ({ isOpen, onClose, onOpenCooking, onApplyVisual, onOpenVoiceStudio }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('space_studio_theme') as any) || 'dark');
  const isDark = theme === 'dark';
  const [documents, setDocuments] = useState<NoteDocument[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeDocIds, setActiveDocIds] = useState<string[]>([]);
  const [leftOpen, setLeftOpen] = useState(false); 
  const [isResearchActive, setIsResearchActive] = useState(false);
  const [viewMode, setViewMode] = useState<'default' | 'space'>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => { try { setDocuments(await getAllNoteDocs()); } catch (e) {} };
    if (isOpen) loadData();
  }, [isOpen]);

  const processDocxFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
                reject(new Error("Failed to read file"));
                return;
            }
            try {
                const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                resolve(result.value);
            } catch (error) {
                console.error("Docx processing failed:", error);
                reject(error);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
  };

  const processSheetFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            if (!data) {
                reject(new Error("Failed to read file"));
                return;
            }
            try {
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                resolve(csv);
            } catch (error) {
                console.error("Sheet processing failed:", error);
                reject(error);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      for (const file of files) {
          let content = ""; let originalSrc = ""; 
          const fileType = file.type.toLowerCase();
          const extension = file.name.split('.').pop()?.toLowerCase();
          const isDoc = ['doc', 'docx'].includes(extension || '') || fileType.includes('word');
          const isSheet = ['xls', 'xlsx', 'csv'].includes(extension || '') || fileType.includes('spreadsheet') || fileType.includes('excel');
          let pageCount = 1;

          if (fileType === 'application/pdf') { 
              originalSrc = await fileToBase64Helper(file); 
              content = "PDF_CONTEXT_EXTRACTED";
              try {
                  const pdfjsLib = (window as any).pdfjsLib;
                  const binary = atob(originalSrc.split(',')[1]);
                  const loadingTask = pdfjsLib.getDocument({ data: binary });
                  const pdf = await loadingTask.promise;
                  pageCount = pdf.numPages;
                  pdfDocCache[file.name] = pdf; 
              } catch(e) {}
          } else if (fileType.startsWith('image/')) {
              originalSrc = await fileToBase64Helper(file);
              content = "IMAGE_ANALYSIS_READY";
          } else if (isDoc) {
              originalSrc = await fileToBase64Helper(file); 
              content = await processDocxFile(file);
          } else if (isSheet) {
              originalSrc = await fileToBase64Helper(file);
              content = await processSheetFile(file);
          } else {
              content = await file.text();
          }

          const newDoc: NoteDocument = { 
              id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
              title: file.name.toUpperCase(), 
              content, 
              pages: [content], 
              originalSrc, 
              timestamp: Date.now(), 
              type: fileType.includes('pdf') ? 'pdf' : (fileType.startsWith('image/') ? 'image' : (isDoc ? 'doc' : (isSheet ? 'sheet' : 'text'))), 
              pageCount,
              fileSize: (file.size / 1024).toFixed(1) + " KB"
          };
          await saveNoteDoc(newDoc); 
          setDocuments(prev => [newDoc, ...prev]);
      }
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    let url = urlInput.trim();
    if (!url.startsWith('http')) url = `https://${url}`;
    const newDoc: NoteDocument = {
        id: `web-${Date.now()}`,
        title: url.replace(/^https?:\/\//, '').toUpperCase(),
        content: `WEB_CONTEXT_INGESTED: ${url}`,
        pages: [],
        timestamp: Date.now(),
        type: 'web',
        pageCount: 1,
        url: url,
        fileSize: "N/A"
    };
    await saveNoteDoc(newDoc);
    setDocuments(prev => [newDoc, ...prev]);
    setUrlInput("");
    setActiveDocIds([newDoc.id]);
  };

  const handleContentUpdate = async (id: string, newContent: string) => {
      setDocuments(prev => {
          const updated = prev.map(doc => doc.id === id ? { ...doc, content: newContent } : doc);
          const docToSave = updated.find(d => d.id === id);
          if (docToSave) saveNoteDoc(docToSave);
          return updated;
      });
  };

  const handleDocClick = (id: string, e: React.MouseEvent) => {
      const isMultiKey = e.metaKey || e.ctrlKey || e.shiftKey;
      setActiveDocIds(prev => { 
          if (prev.includes(id)) return prev.filter(d => d !== id); 
          if (isMultiKey) return [...prev, id]; 
          return [id]; 
      });
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && activeDocIds.length === 0) || isLoading) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    const query = chatInput || "Analisa semua dokumen aktif."; 
    setChatInput(""); 
    setIsLoading(true); 
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const activeDocsList = documents.filter(d => activeDocIds.includes(d.id));
      const contextText = activeDocsList.map(d => `[FILE: ${d.title}]\n${d.content}`).join('\n\n'); 
      
      const researchDirective = isResearchActive ? " Perform a deep research analysis using external grounding if necessary. Cross-reference internal document facts with broader industry trends." : "";

      const response = await ai.models.generateContent({ 
          model: 'gemini-3-pro-preview', 
          contents: `CONTEXT:\n${contextText}\n\nQUERY: ${query}${researchDirective}`, 
          config: { 
              systemInstruction: "You are the Lead Neural Architect. Provide technical insights based on the documents.", 
              tools: [{ googleSearch: {} }] 
          } 
      });
      setChatMessages(prev => [...prev, { 
          role: 'model', 
          text: response.text || "",
          sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      }]);
    } catch (e: any) {
        setChatMessages(prev => [...prev, { role: 'model', text: "Neural uplink interrupted." }]);
    } finally { 
        setIsLoading(false); 
    }
  };

  const activeDocs = useMemo(() => activeDocIds.map(id => documents.find(d => d.id === id)).filter(Boolean) as NoteDocument[], [activeDocIds, documents]);

  if (!isOpen) return null;

  if (viewMode === 'space') {
      return (
        <SpaceNoteLM 
            isOpen={isOpen} 
            onClose={() => setViewMode('default')} 
            documents={documents}
            onUpload={() => fileInputRef.current?.click()}
            onDeleteDoc={(id) => { deleteNoteDoc(id); setDocuments(p => p.filter(d => d.id !== id)); }}
        />
      );
  }

  return (
    <div className={`fixed inset-0 z-[7000] flex flex-col font-sans overflow-hidden animate-in fade-in duration-500 transition-colors duration-500 ${isDark ? 'bg-[#050505] text-white' : 'bg-white text-slate-900'}`}>
      <style dangerouslySetInnerHTML={{ __html: studioStyles }} />
      <div className={`h-14 border-b flex items-center justify-between px-6 shrink-0 relative z-100 transition-colors ${isDark ? 'bg-black border-white/5' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-none bg-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-600/20">
                <BookOpen size={18} fill="white" />
            </div>
            <div className="flex flex-col"><span className={`text-[11px] font-black uppercase tracking-[0.3em] leading-none ${isDark ? 'text-orange-50' : 'text-indigo-600'}`}>BEATSTORIA AI</span><span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">KNOWLEDGE CORE V5.8</span></div>
        </div>
        <div className="flex items-center gap-6">
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="p-2 rounded-none hover:bg-white/10 transition-colors">{isDark ? <Sun size={14}/> : <Moon size={14}/>}</button>
            <button onClick={onClose} className="p-2 rounded-none hover:bg-white/10 transition-colors"><X size={22}/></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`transition-[width] duration-300 ease-in-out border-r shrink-0 overflow-hidden relative ${isDark ? 'bg-[#080808] border-white/5' : 'bg-slate-50 border-slate-200'} ${leftOpen ? 'w-[280px]' : 'w-0 border-none'}`}>
            <div className="w-[280px] h-full flex flex-col p-5 space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2"><Globe size={14} className="text-orange-500" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">REPOSITORI</span></div>
                    <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 bg-orange-600 rounded-none flex items-center justify-center text-white shadow-xl hover:bg-orange-500 transition-all active:scale-95"><Plus size={18} strokeWidth={4}/></button>
                </div>
                
                <button 
                    onClick={() => setViewMode('space')}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-none font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                >
                    <Rocket size={14} /> Launch Space NoteLM
                </button>

                <div className={`p-1 rounded-none border flex items-center gap-2 shadow-inner group transition-all focus-within:border-orange-500/50 ${isDark ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="w-8 h-8 rounded-none bg-indigo-600/10 flex items-center justify-center text-indigo-500 ml-1">
                        <Link2 size={14} />
                    </div>
                    <input 
                        type="text" 
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                        placeholder="Drop link website..." 
                        className={`flex-1 bg-transparent border-none text-[10px] font-bold py-2 focus:ring-0 outline-none ${isDark ? 'text-slate-200 placeholder:text-slate-700' : 'text-slate-900 placeholder:text-slate-400'}`}
                    />
                    <button 
                        onClick={handleAddUrl}
                        disabled={!urlInput.trim()}
                        className={`w-8 h-8 rounded-none flex items-center justify-center transition-all mr-1 ${urlInput.trim() ? 'bg-orange-600 text-white shadow-lg' : 'bg-white/5 text-slate-600'}`}
                    >
                        <ArrowUpRight size={14} strokeWidth={3} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto studio-scrollbar px-2 space-y-2 pb-10">
                    {documents.map(doc => (
                        <div key={doc.id} className={`group flex items-center gap-3 p-4 border rounded-none transition-all cursor-pointer relative ${activeDocIds.includes(doc.id) ? (isDark ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg' : 'bg-indigo-50 border-indigo-200 shadow-md') : (isDark ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-white border-slate-100 hover:border-slate-200')}`} onClick={(e) => handleDocClick(doc.id, e)}>
                            <div className={`w-10 h-10 rounded-none flex items-center justify-center border shrink-0 ${isDark ? 'bg-black border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                {doc.type === 'pdf' ? <FileIcon size={18} /> : (doc.type === 'image' ? <ImageIcon size={18}/> : (doc.type === 'web' ? <Globe2 size={18} className="text-orange-500" /> : (doc.type === 'doc' ? <FileText size={18} className="text-blue-500" /> : (doc.type === 'sheet' ? <Table size={18} className="text-green-500" /> : <FileText size={18} />))))}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className={`text-[11px] font-black uppercase truncate block ${activeDocIds.includes(doc.id) ? 'text-white' : (isDark ? 'text-slate-300' : 'text-slate-800')}`}>{doc.title}</span>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{doc.type === 'web' ? 'LIVE LINK' : `${doc.pageCount} HALAMAN`} • {doc.fileSize}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteNoteDoc(doc.id); setDocuments(p => p.filter(d => d.id !== doc.id)); }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept=".pdf,.txt,image/*,.doc,.docx,.xls,.xlsx,.csv" />
            </div>
        </div>

        {/* SIDEBAR EDGE SLIDE HANDLE */}
        <div 
            className={`absolute bottom-10 w-8 h-20 flex items-center justify-center z-[300] group cursor-pointer transition-all duration-300`}
            style={{ left: leftOpen ? '272px' : '-8px' }}
            onClick={() => setLeftOpen(!leftOpen)}
        >
            <div className={`absolute top-[-500%] bottom-[-500%] w-0.5 transition-colors duration-500 ${leftOpen ? (isDark ? 'bg-white/5 group-hover:bg-orange-500/50' : 'bg-slate-200 group-hover:bg-orange-500/50') : 'bg-transparent'}`} />
            
            <button 
                className={`
                    absolute flex flex-col items-center justify-center w-6 h-20 
                    rounded-none shadow-2xl border backdrop-blur-xl
                    transition-all duration-500 group-hover:scale-110 active:scale-95
                    ${isDark 
                        ? 'bg-black/80 border-white/10 text-slate-400 group-hover:text-white group-hover:border-indigo-500/50' 
                        : 'bg-white/90 border-slate-200 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-500/50'
                    }
                `}
                title={leftOpen ? "Minimize Repository" : "Maximize Repository"}
            >
                <div className="flex flex-col items-center gap-1">
                    {/* Use correct icon names without alias to fix Cannot find name error */}
                    {leftOpen ? <ChevronLeft size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                    <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                        <div className="w-1 h-1 rounded-none bg-current"></div>
                        <div className="w-1 h-1 rounded-none bg-current"></div>
                        <div className="w-1 h-1 rounded-none bg-current"></div>
                    </div>
                </div>
            </button>
        </div>

        <div className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
            {activeDocs.length > 0 ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className={`h-12 border-b flex items-center justify-between px-8 shrink-0 z-10 transition-colors ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <button onClick={() => setActiveDocIds([])} className={`flex items-center gap-2.5 transition-all active:scale-95 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-600 hover:text-indigo-600'}`}><ArrowLeft size={16} /><span className="text-[10px] font-black uppercase tracking-[0.2em]">KEMBALI KE CHAT</span></button>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{activeDocs.length} DOKUMEN AKTIF</span>
                        </div>
                    </div>
                    <div className={`flex-1 overflow-hidden grid ${activeDocs.length === 1 ? 'grid-cols-1' : (activeDocs.length === 2 ? 'grid-cols-2' : (activeDocs.length === 3 ? 'grid-cols-3' : 'grid-cols-2 overflow-y-auto studio-scrollbar'))} divide-x transition-colors ${isDark ? 'bg-[#0a0a0a] divide-white/5' : 'bg-slate-200 divide-slate-300'}`}>
                        {activeDocs.map((doc) => (
                            <div key={doc.id} className="h-full flex flex-col overflow-hidden relative">
                                <DocumentVisualizer doc={doc} isDark={isDark} onContentChange={(newContent) => handleContentUpdate(doc.id, newContent)} isMultiMode={activeDocs.length > 1} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 select-none">
                    <div className={`w-24 h-24 rounded-none flex items-center justify-center border shadow-2xl mb-8 ${isDark ? 'bg-orange-600/10 border-orange-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                        <Database size={48} className={isDark ? "text-orange-500" : "text-indigo-600"} strokeWidth={1} />
                    </div>
                    <h2 className={`text-4xl font-anton uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-slate-900'}`}>Beatstoria Knowledge</h2>
                    <p className="text-[11px] font-black uppercase tracking-[0.5em] mt-6 text-slate-500 max-w-md leading-loose">
                        Analisa data multi-dokumen secara simultan. Pilih file atau injeksi link website dari repositori untuk memulai sintesis neural.
                    </p>
                </div>
            )}
            
            {/* CHAT BOX */}
            {leftOpen && (
                <div className={`absolute bottom-0 left-0 right-0 p-8 pb-10 bg-gradient-to-t pointer-events-none z-50 animate-in slide-in-from-bottom-4 duration-500 ${isDark ? 'from-black via-black/95 to-transparent' : 'from-slate-100 via-slate-100/95 to-transparent'}`}>
                    <div className="max-w-5xl mx-auto flex flex-col gap-2 pointer-events-auto">
                        <div className={`flex items-center border rounded-none p-2 shadow-2xl transition-all focus-within:border-indigo-500/40 w-full group relative ${isDark ? 'bg-[#0d0d0d]/90 border-white/10 backdrop-blur-3xl' : 'bg-white/90 border-slate-200 backdrop-blur-2xl'}`}>
                            {/* AI RESEARCH TOGGLE BUTTON */}
                            <button 
                                onClick={() => setIsResearchActive(!isResearchActive)}
                                className={`w-12 h-12 flex items-center justify-center rounded-none transition-all active:scale-90 ml-1 group/research ${isResearchActive ? 'bg-indigo-600 research-active text-white' : 'text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-400'}`}
                                title={isResearchActive ? "Mode Riset Lanjutan AKTIF" : "Aktifkan FITUR Lanjutan AI Research"}
                            >
                                <Microscope size={20} className={isResearchActive ? 'animate-pulse' : 'group-hover/research:scale-110 transition-transform'} />
                            </button>

                            <input 
                                type="text" 
                                value={chatInput} 
                                onChange={(e) => setChatInput(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                                placeholder={isResearchActive ? "Riset lanjutan aktif: Tanyakan detail teknis..." : "Tanyakan sesuatu tentang dokumen..."} 
                                className={`flex-1 bg-transparent border-none text-[14px] font-bold px-4 py-4 focus:ring-0 outline-none ${isDark ? 'text-white placeholder:text-slate-800' : 'text-slate-900 placeholder:text-slate-300'}`} 
                            />
                            
                            <button onClick={handleSendMessage} disabled={isLoading} className={`w-14 h-14 border rounded-none font-black text-[12px] uppercase shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-30 group/btn shrink-0 mr-1 ${isDark ? 'bg-[#16161c] border-white/10 text-slate-400 hover:bg-orange-600 hover:text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}>
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-orange-500" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
