/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';

interface WelcomeScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <div 
      onClick={onClose}
      className={`
        fixed inset-0 w-full h-full flex justify-center items-center sm:items-start sm:pt-48 z-[100] select-none
        transition-all duration-700 ease-out font-sans px-4
        ${visible ? 'opacity-100 pointer-events-auto bg-slate-900/10 backdrop-blur-sm' : 'opacity-0 pointer-events-none bg-transparent'}
    `}>
      <div 
        className="text-center flex flex-col items-center gap-6 bg-white/95 backdrop-blur-2xl p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-slate-100 shadow-2xl max-w-sm transform transition-all animate-in zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="w-full h-full flex flex-col items-center">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-widest mb-1.5 leading-tight">
                    Voxel Pomodoro
                </h1>
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">
                    Build while you focus
                </div>
            </div>
            
            <div className="space-y-4 mt-8 text-left w-full">
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">Choose a project from the <span className="text-indigo-500">Library</span>.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">Start your <span className="text-emerald-500">Pomodoro Timer</span> to begin assembly.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">3</div>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">Finish the session to see the complete <span className="text-amber-500">3D Sculpture</span>.</p>
                </div>
            </div>

            <button 
              onClick={onClose}
              className="mt-10 w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-colors shadow-xl shadow-slate-900/20 active:scale-95"
            >
              Get Started
            </button>
            
            <div className="mt-4 text-[9px] font-black text-slate-300 uppercase tracking-widest animate-pulse">
                or tap anywhere to skip
            </div>
        </div>
      </div>
    </div>
  );
};