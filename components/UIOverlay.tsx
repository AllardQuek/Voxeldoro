
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo } from 'react';
import { AppState, SavedModel } from '../types';
import { Box, Bird, Cat, Rabbit, Users, Code2, Wand2, FolderOpen, ChevronUp, Play, Pause, Info, Settings2, Brain, Coffee, Trophy, Star, RotateCcw, Target, Trash2, Rotate3d, X, Zap } from 'lucide-react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const posClasses = {
    top: 'bottom-full mb-3 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-3 left-1/2 -translate-x-1/2',
    left: 'right-full mr-3 top-1/2 -translate-y-1/2',
    right: 'left-full ml-3 top-1/2 -translate-y-1/2',
  };
  return (
    <div className="relative flex items-center justify-center overflow-visible" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && (
        <div className={`absolute z-[999999] px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-lg shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap border border-white/10 ${posClasses[position]}`}>
          {text}
        </div>
      )}
    </div>
  );
};

interface UIOverlayProps {
  voxelCount: number;
  totalVoxelCount?: number;
  appState: AppState;
  currentBaseModel: string;
  customBuilds: SavedModel[];
  buildStats: Record<string, number>;
  isAutoRotate: boolean;
  isGenerating: boolean;
  timeLeft: number;
  isTimerActive: boolean;
  isWorkMode: boolean;
  sessionStarted: boolean;
  speedMultiplier: number;
  onSetSpeedMultiplier: (speed: number) => void;
  onNewScene: (type: any) => void;
  onSelectCustomBuild: (m: SavedModel) => void;
  onPromptCreate: () => void;
  onShowJson: () => void;
  onToggleRotation: () => void;
  onToggleInfo: () => void;
  onStartPomodoro: () => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSwitchMode: () => void;
  onResetCamera: () => void;
  onClearGarden: () => void;
  manualProgress?: number;
  onSetManualProgress?: (p: number) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  voxelCount,
  totalVoxelCount = 0,
  currentBaseModel,
  customBuilds,
  buildStats,
  isAutoRotate,
  isGenerating,
  timeLeft,
  isTimerActive,
  isWorkMode,
  sessionStarted,
  speedMultiplier,
  onSetSpeedMultiplier,
  onNewScene,
  onSelectCustomBuild,
  onPromptCreate,
  onShowJson,
  onToggleRotation,
  onToggleInfo,
  onStartPomodoro,
  onToggleTimer,
  onResetTimer,
  onSwitchMode,
  onResetCamera,
  onClearGarden,
  manualProgress = 0,
  onSetManualProgress
}) => {
  const [showDevTools, setShowDevTools] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime: number = isWorkMode ? 25 * 60 : 5 * 60;
  const progressPercent: number = !sessionStarted ? 0 : Math.min(100, Math.max(0, ((totalTime - timeLeft) / totalTime) * 100));
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const getModelIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('cat')) return <Cat size={18} />;
    if (lower.includes('eagle')) return <Bird size={18} />;
    if (lower.includes('rabbit')) return <Rabbit size={18} />;
    if (lower.includes('twins')) return <Users size={18} />;
    return <Box size={18} />;
  }

  const handlePrimaryAction = () => {
    if (!sessionStarted || timeLeft <= 0) {
      onStartPomodoro();
    } else {
      onToggleTimer();
    }
  };

  const buttonConfig = useMemo(() => {
    const isFinished = timeLeft <= 0;
    let text = '';
    let isFocus = isWorkMode;

    if (isFinished) {
      text = isWorkMode ? 'Start Break' : 'Start Focus';
      isFocus = !isWorkMode; 
    } else if (!sessionStarted) {
      text = isWorkMode ? 'Start Focus' : 'Start Break';
      isFocus = isWorkMode;
    } else {
      text = isTimerActive ? 'Pause' : 'Resume';
      isFocus = isWorkMode;
    }

    return { text, isFocus };
  }, [timeLeft <= 0, isWorkMode, sessionStarted, isTimerActive]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none font-sans overflow-hidden z-10 flex flex-col items-center">
      
      <div className="w-full max-w-screen-2xl px-4 sm:px-10 pt-4 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-none">
        <div className="flex w-full items-center justify-between sm:contents">
          <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto shrink-0">
            <div className="relative">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-slate-900 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-xl">
                <Box size={18} className="sm:size-[20px]" strokeWidth={2.5} />
              </div>
              {isTimerActive && (
                <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white animate-pulse ${isWorkMode ? 'bg-sky-500' : 'bg-emerald-500'}`} />
              )}
            </div>
            <div className="flex flex-col drop-shadow-sm">
              <h1 className="text-[10px] sm:text-[12px] font-black text-slate-800 uppercase tracking-[0.1em] sm:tracking-[0.2em] leading-none">Voxeldoro</h1>
              <span className="text-[6px] sm:text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1 opacity-70">Build Your Focus</span>
            </div>
          </div>
          
          <div className="flex sm:hidden">
            <div className="flex items-center gap-1 sm:gap-3 pointer-events-auto shrink-0">
              <button onClick={onToggleInfo} className="w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center bg-transparent hover:bg-white/40 rounded-full transition-colors text-slate-400 hover:text-slate-800 backdrop-blur-sm focus:outline-none focus-visible:ring-0">
                <Info size={18} className="sm:size-5" />
              </button>
              <button onClick={() => setShowDevTools(!showDevTools)} className={`w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-0 ${showDevTools ? 'bg-rose-500 text-white shadow-lg' : 'bg-transparent hover:bg-white/40 text-slate-400 hover:text-slate-800 backdrop-blur-sm'}`}>
                {showDevTools ? <X size={18} className="sm:size-5" /> : <Settings2 size={18} className="sm:size-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center pointer-events-auto w-full sm:w-auto">
          <div className="bg-white/70 backdrop-blur-3xl rounded-full border border-white/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.12)] p-1 flex items-center gap-1.5 sm:gap-5 px-2 sm:px-6 min-w-[300px] sm:min-w-[500px] justify-between">
            <div className="flex bg-slate-100/50 p-0.5 rounded-full border border-slate-200/40 shrink-0">
              <button 
                onClick={() => !isWorkMode && onSwitchMode()}
                className={`flex items-center gap-2 py-1 sm:py-2 px-2 sm:px-5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors duration-300 focus:outline-none focus-visible:ring-0 ${isWorkMode ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
              >
                <Brain size={12} className="sm:size-3.5" /> <span className="hidden sm:inline">Focus</span>
              </button>
              <button 
                onClick={() => isWorkMode && onSwitchMode()}
                className={`flex items-center gap-2 py-1 sm:py-2 px-2 sm:px-5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors duration-300 focus:outline-none focus-visible:ring-0 ${!isWorkMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
              >
                <Coffee size={12} className="sm:size-3.5" /> <span className="hidden sm:inline">Break</span>
              </button>
            </div>

            <div className="hidden md:block w-px h-8 bg-slate-200/60 shrink-0" />

            <div className="flex items-center gap-2 sm:gap-6 flex-1 justify-center sm:justify-start">
              <button 
                onClick={handlePrimaryAction}
                className="relative group w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center rounded-full active:scale-95 shrink-0 overflow-visible focus:outline-none focus-visible:ring-0"
              >
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible">
                  <circle cx="50" cy="50" r="45" className="fill-none stroke-slate-200/40" strokeWidth="4" />
                  <circle cx="50" cy="50" r="38" className="fill-slate-50/40 stroke-none group-hover:fill-slate-100/60 transition-colors" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    className="fill-none" 
                    strokeWidth="7" 
                    strokeLinecap="round" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                    style={{ 
                      stroke: isWorkMode ? '#0ea5e9' : '#10b981',
                      transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' 
                    }} 
                  />
                </svg>
                <div className="relative z-10 w-full flex items-center justify-center">
                  <span className="text-[9px] sm:text-[15px] font-black text-slate-800 font-mono tabular-nums leading-none tracking-tighter">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </button>
              
              <div className="flex items-center gap-1.5 sm:gap-1.5 shrink-0">
                <button 
                  onClick={handlePrimaryAction} 
                  className={`flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-6 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl transition-[background-color,box-shadow,transform] duration-200 active:scale-95 shadow-lg min-w-[90px] sm:min-w-[150px] relative z-10 focus:outline-none focus-visible:ring-0 ${
                    buttonConfig.isFocus 
                      ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-500/20 active:bg-sky-700' 
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 active:bg-emerald-700'
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center w-full">
                    <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] whitespace-nowrap">
                      {buttonConfig.text}
                    </span>
                    <div className="w-3.5 flex items-center justify-center pointer-events-none">
                      {(timeLeft <= 0 || !sessionStarted || !isTimerActive) ? <Play size={12} className="sm:size-3.5" fill="currentColor" /> : <Pause size={12} className="sm:size-3.5" fill="currentColor" />}
                    </div>
                  </div>
                </button>

                <div className="w-8 sm:w-10 flex items-center justify-center">
                  {sessionStarted && timeLeft > 0 && (
                    <button 
                      onClick={onResetTimer} 
                      className="p-2 sm:p-3 text-slate-300 hover:text-rose-500 transition-colors duration-200 hover:bg-rose-50 rounded-lg sm:rounded-xl shrink-0 focus:outline-none focus-visible:ring-0"
                    >
                      <RotateCcw size={14} className="sm:size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex">
          <div className="flex items-center gap-1 sm:gap-3 pointer-events-auto shrink-0">
            <button onClick={onToggleInfo} className="w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center bg-transparent hover:bg-white/40 rounded-full transition-colors text-slate-400 hover:text-slate-800 backdrop-blur-sm focus:outline-none focus-visible:ring-0">
              <Info size={18} className="sm:size-5" />
            </button>
            <button onClick={() => setShowDevTools(!showDevTools)} className={`w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-0 ${showDevTools ? 'bg-rose-500 text-white shadow-lg' : 'bg-transparent hover:bg-white/40 text-slate-400 hover:text-slate-800 backdrop-blur-sm'}`}>
              {showDevTools ? <X size={18} className="sm:size-5" /> : <Settings2 size={18} className="sm:size-5" />}
            </button>
          </div>
        </div>
      </div>

      {showDevTools && (
        <div className="absolute top-20 sm:top-24 right-4 sm:right-10 pointer-events-auto bg-white/95 backdrop-blur-3xl p-5 sm:p-6 rounded-[2rem] shadow-2xl border border-slate-200 w-56 sm:w-72 animate-in slide-in-from-right-4 duration-200 z-[9999]">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center justify-between border-b border-slate-100 pb-3">
              Workbench <Zap size={12} className="text-amber-500" />
            </h4>
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex justify-between">Time Warp <span>{speedMultiplier}x</span></label>
              <input type="range" min="1" max="300" value={speedMultiplier} onChange={(e) => onSetSpeedMultiplier(parseInt(e.target.value))} className="w-full h-1 bg-slate-100 rounded-lg appearance-none accent-indigo-500 cursor-pointer focus:outline-none" />
            </div>

            {onSetManualProgress && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex justify-between">Scrub <span>{Math.round(manualProgress * 100)}%</span></label>
                <input type="range" min="0" max="1" step="0.001" value={manualProgress} onChange={(e) => onSetManualProgress(parseFloat(e.target.value))} className="w-full h-1 bg-slate-100 rounded-lg appearance-none accent-emerald-500 cursor-pointer focus:outline-none" />
              </div>
            )}

            <button onClick={onClearGarden} className="w-full py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-0"><Trash2 size={12}/> Reset Records</button>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="w-full flex flex-col items-center gap-3 pb-6 sm:pb-10 px-4 sm:px-6">
        
        <div className="w-full max-sm:px-4 w-full max-w-sm flex justify-between items-end pointer-events-auto">
          <div className="flex gap-2">
            <Tooltip text="Project Library" position="top">
              <DropdownMenu icon={<FolderOpen size={16} />} label="Library">
                <DropdownItem onClick={() => onNewScene('Eagle')} icon={<Bird size={16}/>} label="Eagle" />
                <DropdownItem onClick={() => onNewScene('Cat')} icon={<Cat size={16}/>} label="Cat" />
                <DropdownItem onClick={() => onNewScene('Rabbit')} icon={<Rabbit size={16}/>} label="Rabbit" />
                <DropdownItem onClick={() => onNewScene('Twins')} icon={<Users size={16}/>} label="Twins" />
                {customBuilds.map((m) => (
                  <DropdownItem key={m.name} onClick={() => onSelectCustomBuild(m)} icon={<Box size={16}/>} label={m.name} />
                ))}
                <div className="border-t border-slate-100 my-1 pt-1">
                  <DropdownItem onClick={onPromptCreate} icon={<Wand2 size={16}/>} label="Forge AI Build..." highlight />
                </div>
              </DropdownMenu>
            </Tooltip>
            <Tooltip text="View JSON" position="top">
              <button onClick={onShowJson} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white/60 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 text-slate-400 hover:text-indigo-500 transition-colors duration-200 focus:outline-none focus-visible:ring-0"><Code2 size={16} className="sm:size-[18px]" /></button>
            </Tooltip>
          </div>

          <div className="flex gap-2">
            <Tooltip text="Orbit View" position="top">
              <button onClick={onToggleRotation} className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-xl shadow-lg border transition-colors duration-200 focus:outline-none focus-visible:ring-0 ${isAutoRotate ? 'text-indigo-600 border-indigo-200' : 'text-slate-300 border-white/50'}`}><Rotate3d size={16} className="sm:size-[18px]" /></button>
            </Tooltip>
            <Tooltip text="Reset View" position="top">
              <button onClick={onResetCamera} className="w-9 h-9 sm:w-10 h-10 flex items-center justify-center bg-white/60 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 text-sky-400 hover:text-sky-600 transition-colors duration-200 focus:outline-none focus-visible:ring-0"><Target size={16} className="sm:size-[18px]" /></button>
            </Tooltip>
          </div>
        </div>

        <div className="relative pointer-events-auto bg-white/70 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/80 w-full max-w-lg overflow-visible flex flex-col">
          
          <div className="flex items-center gap-4 px-6 sm:px-8 pt-4 sm:pt-5 pb-1 border-b border-slate-100/50 overflow-visible">
            <div className="shrink-0 flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-amber-500/10 rounded-lg sm:rounded-xl">
                <Trophy size={16} className="text-amber-500 sm:size-[18px]" />
              </div>
              <div className="h-6 sm:h-7 w-[1px] bg-slate-200" />
            </div>
            
            <div className="relative flex-1 overflow-visible">
              {Object.entries(buildStats).length === 0 ? (
                <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-40 italic">Complete sessions to earn badges</span>
              ) : (
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 py-2.5 sm:py-3 overflow-visible">
                  {(Object.entries(buildStats) as [string, number][]).sort((a,b) => b[1]-a[1]).map(([name, count]) => (
                    <Tooltip key={name} text={`${name} x${count}`} position="top">
                      <div 
                        className={`group relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl border-2 transition-all shrink-0 bg-white/80 ${currentBaseModel === name ? 'border-indigo-500/50 ring-4 ring-indigo-500/5 text-indigo-600 shadow-xl scale-110 z-10' : 'border-slate-100 text-slate-300 grayscale opacity-60'}`}
                      >
                        {currentBaseModel === name && (
                          <div className="absolute -bottom-1 w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                        )}
                        <div className="scale-75 sm:scale-100">
                          {getModelIcon(name)}
                        </div>
                        <div className={`absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] sm:min-w-[18px] sm:h-[18px] px-1 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-black border-2 shadow-sm z-[20] ${count >= 5 ? 'bg-amber-500 text-white border-white' : 'bg-slate-800 text-white border-white'}`}>
                          {count}
                        </div>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 sm:px-10 py-3 sm:py-3.5 bg-slate-50/50 text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] rounded-b-[2rem] sm:rounded-b-[2.5rem]">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`flex items-center gap-2 sm:gap-2.5 ${voxelCount < totalVoxelCount ? 'text-sky-500' : 'text-slate-500'}`}>
                <Box size={10} strokeWidth={3} className="sm:size-[11px]" />
                <span className="tabular-nums font-mono text-[9px] sm:text-[10px] tracking-normal">{voxelCount} <span className="opacity-30 text-slate-400">/</span> {totalVoxelCount}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-[1px] h-3 sm:h-3.5 bg-slate-200" />
              <div className="flex items-center gap-2 text-slate-700">
                <Star size={10} className="text-amber-400 sm:size-[11px]" fill="currentColor"/>
                <span className="tracking-[0.05em] sm:tracking-[0.1em] truncate max-w-[80px] sm:max-w-none">{currentBaseModel}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {isGenerating && (
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xl z-[2999999] flex items-center justify-center pointer-events-auto">
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 sm:gap-8 text-center border-4 border-slate-50 animate-in zoom-in-95 duration-200 mx-4">
            <div className="relative">
               <div className="w-12 h-12 sm:w-14 sm:h-14 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin" />
               <Wand2 size={20} className="absolute inset-0 m-auto text-indigo-500 animate-pulse sm:size-[24px]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">AI Forging</h3>
              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Assembling Coordinates</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DropdownMenu: React.FC<{ icon: React.ReactNode, label: string, children: React.ReactNode, disabled?: boolean }> = ({ icon, label, children, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button 
        onClick={() => !disabled && setIsOpen(!isOpen)} 
        disabled={disabled}
        className={`flex items-center gap-2 px-3 sm:px-4 h-9 sm:h-10 shadow-lg rounded-xl border font-black text-[8px] sm:text-[9px] uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-0 ${disabled ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-80' : (isOpen ? 'bg-white ring-2 ring-indigo-500/20 border-indigo-300 text-slate-800 shadow-indigo-100' : 'bg-white/60 backdrop-blur-xl text-slate-800 border-white/50 hover:bg-white')}`}
      >
        {icon} <span className="hidden sm:inline">{label}</span> <ChevronUp size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && !disabled && (
        <div className="absolute left-0 bottom-full mb-3 w-48 sm:w-52 bg-white/95 backdrop-blur-3xl rounded-2xl shadow-2xl border border-slate-200 p-2 flex flex-col gap-1 z-[100000] animate-in slide-in-from-bottom-2 duration-200" onMouseLeave={() => setIsOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

const DropdownItem: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, highlight?: boolean }> = ({ onClick, icon, label, highlight }) => {
  return (
    <button onClick={() => { onClick(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 sm:py-3 rounded-xl text-[8px] sm:text-[9px] font-black transition-colors focus:outline-none focus-visible:ring-0 ${highlight ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
      {icon} {label}
    </button>
  )
}
