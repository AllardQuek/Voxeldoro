
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  const scrubbingDirection = useRef<number>(0); 
  const isCompleting = useRef<boolean>(false);
  
  const [appState, setAppState] = useState<AppState>(AppState.STABLE);
  const [voxelCount, setVoxelCount] = useState<number>(0);
  const [totalVoxelCount, setTotalVoxelCount] = useState<number>(0);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonModalMode, setJsonModalMode] = useState<'view' | 'import'>('view');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptMode, setPromptMode] = useState<'create' | 'morph'>('create');
  
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('voxeldoro_welcome_dismissed'));
  const [isGenerating, setIsGenerating] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [isAutoRotate, setIsAutoRotate] = useState(true);

  const [buildStats, setBuildStats] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('voxel_pomodoro_stats');
    return saved ? JSON.parse(saved) : {};
  });

  const [timeLeft, setTimeLeft] = useState<number>(POMODORO_WORK_TIME);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isWorkMode, setIsWorkMode] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [sessionStarted, setSessionStarted] = useState(false);

  const manualProgress = useMemo(() => {
    const total = isWorkMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME;
    return Math.min(1, Math.max(0, (total - timeLeft) / total));
  }, [timeLeft, isWorkMode]);

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
    const engine = new VoxelEngine(
      containerRef.current, 
      setAppState, 
      (active, total) => {
        setVoxelCount(active);
        setTotalVoxelCount(total);
      }
    );
    engineRef.current = engine;
    engine.loadInitialModel(nextTargetModel.data);

    const handleResize = () => engine.handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      engine.cleanup();
    };
  }, []);

  const queueNextRandomModel = useCallback(() => {
    const others = PRESET_KEYS.filter(k => k !== currentBaseModel);
    const nextKey = others[Math.floor(Math.random() * others.length)];
    const data = normalizeVoxels(Generators[nextKey]());
    setNextTargetModel({ name: nextKey, data });
  }, [currentBaseModel]);

  useEffect(() => {
    let interval: number;
    if (isTimerActive) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
            const step = (speedMultiplier * 0.1); 
            const next = prev - step;
            return next <= 0 ? 0 : next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, speedMultiplier]);

  useEffect(() => {
      if (timeLeft <= 0 && sessionStarted && !isCompleting.current) {
          isCompleting.current = true;
          setIsTimerActive(false);
          setSessionStarted(false);
          
          if (engineRef.current) {
              engineRef.current.finishRebuild();
              setBuildStats(prev => ({
                ...prev,
                [currentBaseModel]: (prev[currentBaseModel] || 0) + 1
              }));
          }
          
          setTimeout(() => { isCompleting.current = false; }, 400);
      }
  }, [timeLeft, sessionStarted, currentBaseModel]);

  useEffect(() => {
    if (engineRef.current && sessionStarted) {
      engineRef.current.setProgress(manualProgress);
    }
  }, [manualProgress, sessionStarted]);

  const handleStartPomodoro = useCallback(() => {
    if (!engineRef.current || isCompleting.current) return;
    
    let targetData = nextTargetModel.data;
    let targetName = nextTargetModel.name;

    // Handle end-of-session mode switch
    if (timeLeft <= 0) {
        const nextMode = !isWorkMode;
        setIsWorkMode(nextMode);
        const nextTime = nextMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME;
        setTimeLeft(nextTime);
        if (nextMode) queueNextRandomModel();
        // Since state updates are async, we use the values we just calculated
        targetName = nextTargetModel.name;
        targetData = nextTargetModel.data;
    }

    setSessionStarted(true);
    setIsTimerActive(true);
    
    engineRef.current.dismantle();
    setCurrentBaseModel(targetName);
    engineRef.current.rebuild(targetData, true);
    engineRef.current.setProgress(0);

  }, [isWorkMode, nextTargetModel, timeLeft, queueNextRandomModel]);

  const handleToggleTimer = useCallback(() => {
    if (timeLeft <= 0 || !sessionStarted) {
      handleStartPomodoro();
    } else {
      setIsTimerActive(prev => !prev);
    }
  }, [timeLeft, sessionStarted, handleStartPomodoro]);
  
  const handleResetTimer = useCallback(() => {
    setIsTimerActive(false);
    setSessionStarted(false);
    isCompleting.current = false;
    setSpeedMultiplier(1);
    const total = isWorkMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME;
    setTimeLeft(total);
    if (engineRef.current) {
        // Stick to the same build we were doing
        engineRef.current.loadInitialModel(nextTargetModel.data);
    }
  }, [isWorkMode, nextTargetModel]);

  const handleSwitchMode = useCallback(() => {
    const nextMode = !isWorkMode;
    setIsWorkMode(nextMode);
    setTimeLeft(nextMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME);
    setIsTimerActive(false);
    setSessionStarted(false);
    isCompleting.current = false;
    setSpeedMultiplier(1);
    
    // Maintain current build selection when switching modes manually
    if (engineRef.current) engineRef.current.loadInitialModel(nextTargetModel.data);
  }, [isWorkMode, nextTargetModel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPromptModalOpen || isJsonModalOpen) return;
      const key = e.key.toLowerCase();
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleTimer();
      }
      if (key === 'k') scrubbingDirection.current = -1;
      if (key === 'l') scrubbingDirection.current = 1;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'k' || key === 'l') scrubbingDirection.current = 0;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleToggleTimer, isPromptModalOpen, isJsonModalOpen]);

  useEffect(() => {
    let rafId: number;
    const updateScrub = () => {
      if (scrubbingDirection.current !== 0) {
        const total = isWorkMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME;
        const deltaSeconds = -scrubbingDirection.current * 4; 
        setTimeLeft(prev => {
          const next = Math.min(total, Math.max(0, prev + deltaSeconds));
          
          if (!sessionStarted && next < total) {
              setSessionStarted(true);
              setIsTimerActive(false);
              if (engineRef.current && appState === AppState.STABLE) {
                engineRef.current.dismantle(); 
                engineRef.current.rebuild(nextTargetModel.data, true);
              }
          }
          
          return next;
        });
      }
      rafId = requestAnimationFrame(updateScrub);
    };
    rafId = requestAnimationFrame(updateScrub);
    return () => cancelAnimationFrame(rafId);
  }, [isWorkMode, sessionStarted, nextTargetModel, appState]);

  // SMART MORPH HANDLER
  const handleSelectModel = useCallback((name: string, data: VoxelData[]) => {
    setNextTargetModel({ name, data });
    setCurrentBaseModel(name);
    
    if (engineRef.current) {
        if (sessionStarted && !isCompleting.current) {
            // Morph mid-session
            engineRef.current.rebuild(data, true);
        } else {
            // Fresh load if not in session or session just completed
            engineRef.current.loadInitialModel(data);
        }
    }
  }, [sessionStarted]);

  const handlePromptSubmit = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Create a 3D voxel model based on the prompt: "${prompt}". 
        Return a JSON array of voxel objects. Each object must have x, y, z and c (hex color).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.INTEGER },
                y: { type: Type.INTEGER },
                z: { type: Type.INTEGER },
                c: { type: Type.STRING }
              },
              required: ['x', 'y', 'z', 'c']
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        const rawData = JSON.parse(text);
        const voxels: VoxelData[] = rawData.map((v: any) => ({
          x: Number(v.x),
          y: Number(v.y),
          z: Number(v.z),
          color: parseInt(v.c.replace('#', ''), 16)
        }));
        const normalized = normalizeVoxels(voxels);
        const name = prompt.length > 20 ? prompt.substring(0, 17) + '...' : prompt;
        setCustomBuilds(prev => [...prev, { name, data: normalized }]);
        handleSelectModel(name, normalized);
      }
    } catch (err) {
      console.error('Gemini AI Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = (json: string) => {
    try {
      const data = JSON.parse(json);
      const voxels: VoxelData[] = data.map((v: any) => ({
        x: v.x, y: v.y, z: v.z,
        color: typeof v.c === 'string' ? parseInt(v.c.replace('#', ''), 16) : v.color
      }));
      const normalized = normalizeVoxels(voxels);
      handleSelectModel('Imported', normalized);
    } catch (e) {
      console.error('Import Error:', e);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <WelcomeScreen visible={showWelcome} onClose={() => {
        setShowWelcome(false);
        localStorage.setItem('voxeldoro_welcome_dismissed', 'true');
      }} />
      <UIOverlay
        voxelCount={voxelCount}
        totalVoxelCount={totalVoxelCount}
        appState={appState}
        currentBaseModel={currentBaseModel}
        customBuilds={customBuilds}
        buildStats={buildStats}
        isAutoRotate={isAutoRotate}
        isGenerating={isGenerating}
        timeLeft={Math.floor(timeLeft)}
        isTimerActive={isTimerActive}
        isWorkMode={isWorkMode}
        sessionStarted={sessionStarted}
        speedMultiplier={speedMultiplier}
        onSetSpeedMultiplier={setSpeedMultiplier}
        onNewScene={(key) => {
          const data = normalizeVoxels(Generators[key as keyof typeof Generators]());
          handleSelectModel(key, data);
        }}
        onSelectCustomBuild={(m) => {
          handleSelectModel(m.name, m.data);
        }}
        onPromptCreate={() => { setPromptMode('create'); setIsPromptModalOpen(true); }}
        onShowJson={() => {
          if (engineRef.current) {
            setJsonData(engineRef.current.getJsonData());
            setJsonModalMode('view');
            setIsJsonModalOpen(true);
          }
        }}
        onToggleRotation={() => {
          const newState = !isAutoRotate;
          setIsAutoRotate(newState);
          if (engineRef.current) engineRef.current.setAutoRotate(newState);
        }}
        onToggleInfo={() => setShowWelcome(true)}
        onStartPomodoro={handleStartPomodoro}
        onToggleTimer={handleToggleTimer}
        onResetTimer={handleResetTimer}
        onSwitchMode={handleSwitchMode}
        onResetCamera={() => engineRef.current?.resetCameraView()}
        onClearGarden={() => {
          setBuildStats({});
          localStorage.removeItem('voxel_pomodoro_stats');
        }}
        manualProgress={manualProgress}
        onSetManualProgress={(p) => {
            if (!sessionStarted && !isCompleting.current) {
              setSessionStarted(true);
              setIsTimerActive(false); 
              if (engineRef.current) {
                engineRef.current.dismantle();
                engineRef.current.rebuild(nextTargetModel.data, true);
              }
            }
            const total = isWorkMode ? POMODORO_WORK_TIME : POMODORO_BREAK_TIME;
            setTimeLeft(total * (1 - p));
        }}
      />
      <PromptModal isOpen={isPromptModalOpen} mode={promptMode} onClose={() => setIsPromptModalOpen(false)} onSubmit={handlePromptSubmit} />
      <JsonModal isOpen={isJsonModalOpen} onClose={() => setIsJsonModalOpen(false)} data={jsonData} isImport={jsonModalMode === 'import'} onImport={handleImport} />
    </div>
  );
};

export default App;
