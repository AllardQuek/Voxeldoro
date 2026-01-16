
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';

interface WelcomeScreenProps {
  visible: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ visible }) => {
  return (
    <div className={`
        absolute top-48 left-0 w-full pointer-events-none flex justify-center z-10 select-none
        transition-all duration-700 ease-out transform font-sans px-4
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12'}
    `}>
      <div className="text-center flex flex-col items-center gap-6 bg-white/90 backdrop-blur-xl p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl max-w-sm">
        <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-widest mb-1.5 leading-tight">
                Voxel Pomodoro
            </h1>
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">
                Productivity x Creativity
            </div>
        </div>
        
        <div className="space-y-3 mt-2">
            <p className="text-sm font-extrabold text-slate-600 leading-relaxed">Start your timer to begin building</p>
            <p className="text-sm font-extrabold text-slate-600 leading-relaxed">Models assemble as time passes</p>
            <p className="text-sm font-extrabold text-slate-600 leading-relaxed">Complete sessions to finish builds</p>
        </div>

        <div className="w-12 h-1 bg-slate-100 rounded-full" />
      </div>
    </div>
  );
};
