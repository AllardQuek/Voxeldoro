/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { VoxelEngine } from './services/VoxelEngine';
import { UIOverlay } from './components/UIOverlay';
import { JsonModal } from './components/JsonModal';
import { PromptModal } from './components/PromptModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Generators } from './utils/voxelGenerators';
import { AppState, VoxelData, SavedModel } from './types';
import { GoogleGenAI, Type } from "@google/genai";

const POMODORO_WORK_TIME = 25 * 60;
const POMODORO_BREAK_TIME = 5 * 60;

const PRESET_KEYS: (keyof typeof Generators)[] = ['Eagle', 'Cat', 'Rabbit', 'Twins'];

const normalizeVoxels = (voxels: VoxelData[]): VoxelData[] => {
  if (voxels.length === 0) return voxels;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  voxels.forEach(v => {
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
  });
  const offsetX = -(minX + maxX) / 2;
  const offsetY = -minY; 
  const offsetZ = -(minZ + maxZ) / 2;
  return voxels.map(v => ({
    ...v,
    x: Math.round(v.x + offsetX),
    y: Math.round(v.y + offsetY),
    z: Math.round(v.z + offsetZ)
  }));
};

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.STABLE);
  const [voxelCount, setVoxelCount] = useState<number>(0);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonModalMode, setJsonModalMode] = useState<'view' | 'import'>('view');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptMode, setPromptMode] = useState<'create' | 'morph'>('create');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [buildStats, setBuildStats] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('voxel_pomodoro_stats');
    return saved ? JSON.parse(saved) : {};
  });
  const [timeLeft, setTimeLeft] = useState(POMODORO_WORK_TIME);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isWorkMode, setIsWorkMode] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentBaseModel, setCurrentBaseModel] = useState<string>('Eagle');
  const [nextTargetModel, setNextTargetModel] = useState<{ name: string, data: VoxelData[] }>({
    name: 'Eagle',
    data: normalizeVoxels(Generators.Eagle())
  });
  const [customBuilds, setCustomBuilds] = useState<SavedModel[]>([]);

  useEffect(() => {
    localStorage.setItem('voxel_pomodoro_stats', JSON.stringify(buildStats));
  }, [buildStats]);

  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new VoxelEngine(containerRef.current, setAppState, setVoxelCount);
    engineRef.current = engine;
    engine.loadInitialModel(nextTargetModel.data);
    const handleResize = () => engine.handleResize();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(() => setShowWelcome(false), 5000);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      engine.cleanup();
    };
  }, []);

  useEffect(() => {
    let interval: number;
    if (isTimerActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - speedMultiplier));
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
      setSessionStarted(false);
      if (engineRef.current) {
          engineRef.current.finishRebuild();
          setBuildStats(prev => ({ ...prev, [currentBaseModel]: (prev[currentBaseModel] || 0) + 1 }));
          const others = PRESET_KEYS.filter(k => k !== currentBaseModel);
          const nextKey = others[Math.floor(Math.random() * others.length)];
          setNextTargetModel({ name: nextKey, data: normalizeVoxels(Generators[nextKey]()) });
      }
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft, currentBaseModel, speedMultiplier]);

  // Scrubbing logic: when timeLeft changes manually, update the engine
  useEffect(() => {
    if (engineRef.current && sessionStarted) {
      const total = isWorkMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME;
      const progress = (total - timeLeft) / total;
      engineRef.current.setProgress(progress);
    }
  }, [timeLeft, sessionStarted, isWorkMode]);

  const handleStartPomodoro = () => {
    if (!engineRef.current) return;
    setSessionStarted(true);
    setIsTimerActive(true);
    const total = isWorkMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME;
    setTimeLeft(total);
    engineRef.current.dismantle();
    setCurrentBaseModel(nextTargetModel.name);
    setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.rebuild(nextTargetModel.data, true);
        engineRef.current.setProgress(0);
      }
    }, 600);
  };

  const handlePromptSubmit = async (prompt: string) => {
    setIsGenerating(true);
    setIsPromptModalOpen(false);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Create a 3D voxel representation of "${prompt}". Return JSON array of {x, y, z, color}. Max 600 voxels.`,
            config: { responseMimeType: "application/json" }
        });
        if (response.text) {
            const rawData = JSON.parse(response.text);
            const voxelData: VoxelData[] = rawData.map((v: any) => ({
                x: v.x, y: v.y, z: v.z,
                color: parseInt(v.color?.replace('#', '') || 'CCCCCC', 16)
            }));
            const normalized = normalizeVoxels(voxelData);
            if (engineRef.current) {
                setNextTargetModel({ name: prompt, data: normalized });
                setCurrentBaseModel(prompt);
                engineRef.current.loadInitialModel(normalized);
                setCustomBuilds(prev => [...prev, { name: prompt, data: normalized }]);
                setSessionStarted(false);
            }
        }
    } catch (err) { console.error(err); } finally { setIsGenerating(false); }
  };

  return (
    <div className="relative w-full h-screen bg-[#f0f2f5] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <UIOverlay 
        voxelCount={voxelCount}
        appState={appState}
        currentBaseModel={currentBaseModel}
        nextTargetModelName={nextTargetModel.name}
        customBuilds={customBuilds}
        customRebuilds={[]} 
        buildStats={buildStats}
        isAutoRotate={isAutoRotate}
        isInfoVisible={showWelcome}
        isGenerating={isGenerating}
        timeLeft={timeLeft}
        isTimerActive={isTimerActive}
        isWorkMode={isWorkMode}
        sessionStarted={sessionStarted}
        speedMultiplier={speedMultiplier}
        onSetSpeedMultiplier={setSpeedMultiplier}
        onDismantle={() => engineRef.current?.dismantle()}
        onNewScene={(type) => {
            const data = normalizeVoxels(Generators[type]());
            setNextTargetModel({ name: type, data });
            setCurrentBaseModel(type);
            engineRef.current?.loadInitialModel(data);
            setSessionStarted(false);
        }}
        onSelectCustomBuild={(m) => {
            const data = normalizeVoxels(m.data);
            setNextTargetModel({ name: m.name, data });
            setCurrentBaseModel(m.name);
            engineRef.current?.loadInitialModel(data);
            setSessionStarted(false);
        }}
        onPromptCreate={() => { setPromptMode('create'); setIsPromptModalOpen(true); }}
        onShowJson={() => { setJsonData(engineRef.current?.getJsonData() || ''); setJsonModalMode('view'); setIsJsonModalOpen(true); }}
        onImportJson={() => { setJsonModalMode('import'); setIsJsonModalOpen(true); }}
        onToggleRotation={() => { setIsAutoRotate(!isAutoRotate); engineRef.current?.setAutoRotate(!isAutoRotate); }}
        onToggleInfo={() => setShowWelcome(!showWelcome)}
        onStartPomodoro={handleStartPomodoro}
        onToggleTimer={() => setIsTimerActive(!isTimerActive)}
        onResetTimer={() => { setSessionStarted(false); setTimeLeft(isWorkMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME); }}
        onSwitchMode={() => { setIsWorkMode(!isWorkMode); setTimeLeft(!isWorkMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME); setSessionStarted(false); }}
        onSetTime={setTimeLeft}
        onRebuild={() => {}} 
        onPromptMorph={() => {}}
        onSelectCustomRebuild={() => {}}
      />
      <WelcomeScreen visible={showWelcome} />
      <JsonModal isOpen={isJsonModalOpen} onClose={() => setIsJsonModalOpen(false)} data={jsonData} isImport={jsonModalMode === 'import'} onImport={(json) => {
          const raw = JSON.parse(json);
          const data = normalizeVoxels(raw.map((v: any) => ({ x: v.x, y: v.y, z: v.z, color: parseInt((v.c || v.color).replace('#', ''), 16) })));
          setNextTargetModel({ name: 'Imported', data });
          setCurrentBaseModel('Imported');
          engineRef.current?.loadInitialModel(data);
          setSessionStarted(false);
      }} />
      <PromptModal isOpen={isPromptModalOpen} mode={promptMode} onClose={() => setIsPromptModalOpen(false)} onSubmit={handlePromptSubmit} />
    </div>
  );
};

export default App;