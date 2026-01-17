/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { AppState, SavedModel } from '../types';
import { Box, Bird, Cat, Rabbit, Users, Code2, Wand2, Hammer, FolderOpen, ChevronUp, FileJson, Play, Pause, Info, Settings2, Zap, Rotate3d, Brain, Coffee, Trophy, Star, RotateCcw } from 'lucide-react';

interface UIOverlayProps {
  voxelCount: number;
  appState: AppState;
  currentBaseModel: string;
  nextTargetModelName: string;
  customBuilds: SavedModel[];
  customRebuilds: SavedModel[];
  buildStats: Record<string, number>;
  isAutoRotate: boolean;
  isInfoVisible: boolean;
  isGenerating: boolean;
  timeLeft: number;
  isTimerActive: boolean;
  isWorkMode: boolean;
  sessionStarted: boolean;
  speedMultiplier: number;
  onSetSpeedMultiplier: (speed: number) => void;
  onDismantle: () => void;
  onRebuild: (type: 'Eagle' | 'Cat' | 'Rabbit' | 'Twins') => void;
  onNewScene: (type: 'Eagle' | 'Cat' | 'Rabbit' | 'Twins') => void;
  onSelectCustomBuild: (model: SavedModel) => void;
  onSelectCustomRebuild: (model: SavedModel) => void;
  onPromptCreate: () => void;
  onPromptMorph: () => void;
  onShowJson: () => void;
  onImportJson: () => void;
  onToggleRotation: () => void;
  onToggleInfo: () => void;
  onStartPomodoro: () => void;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSwitchMode: () => void;
  onSetTime: (t: number) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  voxelCount,
  currentBaseModel,
  nextTargetModelName,
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
  onDismantle,
  onPromptCreate,
  onShowJson,
  onImportJson,
  onToggleRotation,
  onToggleInfo,
  onStartPomodoro,
  onToggleTimer,
  onResetTimer,
  onSwitchMode,
  onSetTime,
  onNewScene
}) => {
  const [showDevTools, setShowDevTools] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime = isWorkMode ? 25 * 60 : 5 * 60;
  const progressPercent = ((totalTime - timeLeft) / totalTime) * 100;
  
  // Responsive sizing for the circular timer
  const viewBoxSize = 120;
  const strokeWidth = 8;
  const radius = (viewBoxSize / 2) - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    const newTime = Math.round(totalTime - (percent / 100) * totalTime);
    onSetTime(newTime);
  };

  const getMastery = (count: number) => {
    if (count >= 10) return { label: 'Gold', color: 'text-amber-500' };
    if (count >= 5) return { label: 'Silver', color: 'text-slate-400' };
    if (count >= 1) return { label: 'Bronze', color: 'text-orange-600' };
    return { label: 'Novice', color: 'text-slate-300' };
  };

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none font-sans overflow-hidden z-10">
      
      {/* --- COMMAND POD (Top Center) --- */}
      <div className="absolute top-2 sm:top-6 left-1/2 -translate-x-1/2 pointer-events-auto z-40 max-w-[95vw]">
        <div className={`
            relative flex flex-col bg-white/95 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl border-2 transition-all duration-500 overflow-hidden
            ${isWorkMode ? 'border-sky-100 shadow-sky-900/5' : 'border-emerald-100 shadow-emerald-900/5'}
        `}>
            <div className="flex items-center gap-1.5 sm:gap-6 p-1.5 pr-3 sm:pr-8">
                {/* Timer Circle */}
                <div className="relative w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                    <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx={viewBoxSize/2} cy={viewBoxSize/2} r={radius} className="fill-none stroke-slate-50" strokeWidth={strokeWidth} />
                        <circle 
                            cx={viewBoxSize/2} cy={viewBoxSize/2} r={radius} 
                            className={`fill-none transition-all duration-300 ease-out ${isWorkMode ? 'stroke-sky-500' : 'stroke-emerald-500'}`}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>
                    <div className={`flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-full shadow-inner ${isWorkMode ? 'bg-sky-50 text-sky-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {isWorkMode ? <Brain size={18} className="sm:hidden" /> : <Coffee size={18} className="sm:hidden" />}
                        {isWorkMode ? <Brain size={24} className="hidden sm:block" /> : <Coffee size={24} className="hidden sm:block" />}
                    </div>
                </div>

                {/* Time Readout */}
                <div className="flex flex-col min-w-[60px] sm:min-w-[100px]">
                    <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] mb-0 ${isWorkMode ? 'text-sky-500' : 'text-emerald-500'}`}>
                        {isWorkMode ? 'Focus' : 'Break'}
                    </span>
                    <span className="text-xl sm:text-4xl font-black text-slate-800 font-mono tracking-tighter leading-none tabular-nums">
                        {formatTime(timeLeft)}
                    </span>
                </div>

                {/* Main Actions */}
                <div className="flex items-center gap-1 sm:gap-2 pl-2 sm:pl-4 border-l-2 border-slate-50">
                    {!sessionStarted ? (
                        <button onClick={onStartPomodoro} className={`flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition-all shadow-lg active:scale-90 ${isWorkMode ? 'bg-sky-500 text-white' : 'bg-emerald-500 text-white'}`}>
                            <Play size={20} className="sm:hidden" fill="currentColor" />
                            <Play size={24} className="hidden sm:block" fill="currentColor" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-1 sm:gap-1">
                            <button onClick={onToggleTimer} className={`flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl transition-all shadow-md ${isTimerActive ? 'bg-slate-100 text-slate-600' : (isWorkMode ? 'bg-sky-500 text-white' : 'bg-emerald-500 text-white')}`}>
                                {isTimerActive ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                            </button>
                            <button onClick={onResetTimer} className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-slate-200 hover:text-slate-400 transition-colors">
                                <RotateCcw size={14} className="sm:w-[18px]" />
                            </button>
                        </div>
                    )}
                    <button onClick={onSwitchMode} disabled={sessionStarted} className={`ml-1 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border-2 transition-all ${sessionStarted ? 'opacity-20 cursor-not-allowed' : 'hover:bg-slate-50 text-slate-300 border-slate-50'}`}>
                        {isWorkMode ? <Coffee size={14} /> : <Brain size={14} />}
                    </button>
                </div>
            </div>

            <div className={`px-4 sm:px-6 py-1.5 sm:py-2 border-t flex items-center justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${isWorkMode ? 'bg-sky-50/50 text-sky-400' : 'bg-emerald-50/50 text-emerald-400'}`}>
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {sessionStarted ? 'Building' : 'Next'}: <span className="text-slate-700">{sessionStarted ? currentBaseModel : nextTargetModelName}</span>
                </span>
                {timeLeft === 0 && <span className="text-emerald-500 animate-bounce ml-2">Done!</span>}
            </div>
        </div>
      </div>

      {/* --- HALL OF RECORDS (Top Right) --- */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex flex-col items-end gap-2 z-30 pointer-events-auto">
        <button onClick={() => setShowLegend(!showLegend)} className={`flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-white rounded-xl shadow-lg border transition-all ${showLegend ? 'border-amber-200 text-amber-600' : 'border-slate-100 text-slate-400'}`}>
            <Trophy size={16} /> 
            <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Records</span>
        </button>

        {showLegend && (
            <div className="bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-100 w-56 sm:w-64 animate-in slide-in-from-right-10 duration-300">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Star size={12} fill="currentColor" className="text-amber-400" /> Mastery
                </h4>
                <div className="flex flex-col gap-3">
                    {['Eagle', 'Cat', 'Rabbit', 'Twins', ...customBuilds.map(b => b.name)].slice(0, 8).map(name => {
                        const count = buildStats[name] || 0;
                        const mastery = getMastery(count);
                        return (
                            <div key={name} className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{name}</span>
                                    <span className={`text-[8px] font-black uppercase tracking-tighter ${mastery.color}`}>{mastery.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono font-black text-slate-300">x</span>
                                    <span className="text-sm font-black text-slate-800">{count}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        <div className="flex gap-2">
            <button onClick={() => setShowDevTools(!showDevTools)} className={`w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border transition-all ${showDevTools ? 'text-rose-600 border-rose-100 bg-rose-50' : 'text-slate-300 border-slate-100'}`}>
                <Settings2 size={16} />
            </button>
            <button onClick={onToggleRotation} className={`w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border transition-all ${isAutoRotate ? 'text-indigo-600 border-indigo-100' : 'text-slate-300 border-slate-100'}`}>
                <Rotate3d 
                  size={16} 
                  style={{ animationDuration: '12s' }}
                  className={isAutoRotate ? 'animate-spin' : ''} 
                />
            </button>
        </div>

        {showDevTools && (
            <div className="bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-rose-100 w-48 sm:w-52 animate-in slide-in-from-right-10 duration-300 pointer-events-auto">
                <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap size={10} fill="currentColor"/> Controls
                </h4>
                <div className="mb-4">
                    <input 
                        type="range" min="0" max="100" step="0.1" 
                        value={progressPercent} 
                        onChange={handleScrubChange}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                </div>
                <div className="grid grid-cols-4 gap-1 mb-4">
                    {[1, 10, 60, 300].map(val => (
                        <button key={val} onClick={() => onSetSpeedMultiplier(val)} className={`py-1.5 rounded-lg text-[10px] font-black ${speedMultiplier === val ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                            {val}x
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-1">
                    <button onClick={() => onSetTime(10)} className="w-full py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase">Finish (10s)</button>
                    <button onClick={onDismantle} className="w-full py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase">Dismantle</button>
                </div>
            </div>
        )}
      </div>

      {/* --- LIBRARY (Top Left) --- */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex flex-col gap-2 z-30 pointer-events-auto">
        <DropdownMenu icon={<FolderOpen size={16} />} label="Library" color="indigo">
            <div className="px-2 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Presets</div>
            <DropdownItem onClick={() => onNewScene('Eagle')} icon={<Bird size={16}/>} label="Eagle" />
            <DropdownItem onClick={() => onNewScene('Cat')} icon={<Cat size={16}/>} label="Cat" />
            <DropdownItem onClick={() => onNewScene('Rabbit')} icon={<Rabbit size={16}/>} label="Rabbit" />
            <DropdownItem onClick={() => onNewScene('Twins')} icon={<Users size={16}/>} label="Twins" />
            <DropdownItem onClick={onPromptCreate} icon={<Wand2 size={16}/>} label="AI Forge..." highlight />
            <div className="h-px bg-slate-100 my-1" />
            <DropdownItem onClick={onImportJson} icon={<FileJson size={16}/>} label="Import" />
        </DropdownMenu>
        <div className="flex items-center gap-2 px-2.5 py-1 bg-white/70 rounded-xl border border-slate-100 shadow-sm text-slate-400 font-black w-fit">
            <Box size={10} className="text-blue-500 sm:w-3" />
            <span className="text-[10px] sm:text-xs font-mono">{voxelCount}</span>
        </div>
      </div>

      {/* --- GENERATING OVERLAY --- */}
      {isGenerating && (
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto">
              <div className="bg-white px-8 py-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center border-2 border-indigo-100 animate-in zoom-in duration-300">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-800">Gemini is Imagining...</h3>
              </div>
          </div>
      )}

      {/* --- BOTTOM CONTROLS --- */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-auto flex items-center justify-between">
        <button onClick={onShowJson} className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-100 text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:text-slate-800 transition-all">
            <Code2 size={14} /> <span className="hidden sm:inline">Blueprint</span>
        </button>
        <button onClick={onToggleInfo} className="w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-100 text-slate-400">
            <Info size={18} />
        </button>
      </div>

    </div>
  );
};

// --- Helpers ---
const DropdownMenu: React.FC<{ icon: React.ReactNode, label: string, children: React.ReactNode, color: string }> = ({ icon, label, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-white text-slate-500 shadow-md rounded-xl border border-slate-100 font-black text-xs uppercase tracking-widest transition-all">
                {icon} <span className="hidden sm:inline">{label}</span> <ChevronUp size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div 
                className="absolute left-0 top-full mt-2 w-48 sm:w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 flex flex-col gap-1 z-[100] animate-in slide-in-from-top-2 duration-200"
                onMouseLeave={() => setIsOpen(false)}
              >
                {children}
              </div>
            )}
        </div>
    )
}

const DropdownItem: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, highlight?: boolean, truncate?: boolean }> = ({ onClick, icon, label, highlight, truncate }) => {
    return (
        <button onClick={() => { onClick(); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${highlight ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>
            {icon} <span className={truncate ? "truncate" : ""}>{label}</span>
        </button>
    )
}