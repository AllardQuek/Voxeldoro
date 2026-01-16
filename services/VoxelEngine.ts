
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData } from '../types';
import { CONFIG, COLORS } from '../utils/voxelConstants';

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private instanceMesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  
  private voxels: SimulationVoxel[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  private rebuildStartTime: number = 0;
  
  private state: AppState = AppState.STABLE;
  private onStateChange: (state: AppState) => void;
  private onCountChange: (count: number) => void;
  private animationId: number = 0;

  private isProgressive: boolean = false;
  private manualProgress: number = 0;

  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.BG_COLOR);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(30, 30, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 2.0; 
    this.controls.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    this.scene.add(dirLight);

    const planeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 1 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = CONFIG.FLOOR_Y;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private centerCameraOnModel() {
    if (this.voxels.length === 0) return;

    const box = new THREE.Box3();
    this.voxels.forEach(v => {
      if (v.y > CONFIG.FLOOR_Y - 5) {
        box.expandByPoint(new THREE.Vector3(v.x, v.y, v.z));
      }
    });

    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // UI HEADROOM OFFSET: Target a point higher than the model to visually "push" the model down
    const verticalOffset = 10; 
    const targetY = Math.max(center.y, CONFIG.FLOOR_Y) + verticalOffset;
    
    this.controls.target.lerp(new THREE.Vector3(center.x, targetY, center.z), 0.1);
  }

  public loadInitialModel(data: VoxelData[]) {
    this.createVoxels(data);
    this.onCountChange(this.voxels.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
    
    const box = new THREE.Box3();
    data.forEach(v => box.expandByPoint(new THREE.Vector3(v.x, v.y, v.z)));
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.controls.target.set(center.x, Math.max(center.y, CONFIG.FLOOR_Y + 12), center.z);
  }

  private createVoxels(data: VoxelData[]) {
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      (Array.isArray(this.instanceMesh.material) ? this.instanceMesh.material : [this.instanceMesh.material]).forEach(m => m.dispose());
    }

    this.voxels = data.map((v, i) => {
        const c = new THREE.Color(v.color);
        return {
            id: i,
            x: v.x, y: v.y, z: v.z, color: c,
            vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0,
            rvx: 0, rvy: 0, rvz: 0
        };
    });

    const geometry = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 });
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.scene.add(this.instanceMesh);

    this.draw();
  }

  private draw() {
    if (!this.instanceMesh) return;
    this.voxels.forEach((v, i) => {
        if (v.y < CONFIG.FLOOR_Y - 2) {
            this.dummy.scale.set(0.0001, 0.0001, 0.0001);
        } else {
            this.dummy.scale.set(1, 1, 1);
        }

        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        this.dummy.updateMatrix();
        this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);
        this.instanceMesh!.setColorAt(i, v.color);
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    if (this.instanceMesh.instanceColor) {
        this.instanceMesh.instanceColor.needsUpdate = true;
    }
  }

  public dismantle() {
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    this.voxels.forEach(v => {
        v.vy = -1.5; 
        v.vx = (Math.random() - 0.5) * 0.5;
        v.vz = (Math.random() - 0.5) * 0.5;
    });
  }

  private getColorDist(c1: THREE.Color, hex2: number): number {
    const c2 = new THREE.Color(hex2);
    return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
  }

  public setProgress(p: number) {
    this.manualProgress = p;
  }

  public finishRebuild() {
    this.manualProgress = 1;
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
    this.voxels.forEach((v, i) => {
        const t = this.rebuildTargets[i];
        if (t && !t.isRubble) {
            v.x = t.x; v.y = t.y; v.z = t.z;
            v.rx = v.ry = v.rz = 0;
            v.vx = v.vy = v.vz = 0;
        }
    });
    this.draw();
  }

  public rebuild(targetModel: VoxelData[], progressive: boolean = false) {
    this.isProgressive = progressive;
    this.manualProgress = 0;
    
    if (targetModel.length > this.voxels.length) {
      this.createVoxels(targetModel);
      this.onCountChange(this.voxels.length);
    }

    const sortedTargets = [...targetModel].sort((a, b) => a.y - b.y);

    const available = this.voxels.map((v, i) => ({ index: i, color: v.color, taken: false }));
    const mappings: RebuildTarget[] = new Array(this.voxels.length).fill(null);

    sortedTargets.forEach((target, targetIdx) => {
        let bestDist = 9999;
        let bestIdx = -1;
        for (let i = 0; i < available.length; i++) {
            if (available[i].taken) continue;
            const d = this.getColorDist(available[i].color, target.color);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
                if (d < 0.01) break;
            }
        }
        if (bestIdx !== -1) {
            const vIdx = available[bestIdx].index;
            available[bestIdx].taken = true;
            mappings[vIdx] = {
                x: target.x, y: target.y, z: target.z,
                delay: targetIdx / sortedTargets.length
            };
            this.voxels[vIdx].color.setHex(target.color);
        }
    });

    for (let i = 0; i < this.voxels.length; i++) {
        if (!mappings[i]) {
            mappings[i] = { x: 0, y: CONFIG.FLOOR_Y - 20, z: 0, isRubble: true, delay: 2 };
        }
    }

    this.rebuildTargets = mappings;
    this.rebuildStartTime = Date.now();
    this.state = AppState.REBUILDING;
    this.onStateChange(this.state);

    this.voxels.forEach(v => {
        v.y = CONFIG.FLOOR_Y - 15;
        v.vx = v.vy = v.vz = 0;
        v.rx = v.ry = v.rz = 0;
    });
  }

  private updatePhysics() {
    if (this.state === AppState.DISMANTLING) {
        this.voxels.forEach(v => {
            v.y += v.vy;
        });
    } else if (this.state === AppState.REBUILDING) {
        const now = Date.now();
        const elapsed = (now - this.rebuildStartTime) / 1000;
        let allDone = true;

        this.voxels.forEach((v, i) => {
            const t = this.rebuildTargets[i];
            if (!t) return;
            if (t.isRubble) {
                v.y = CONFIG.FLOOR_Y - 20;
                return;
            }

            const isAboveThreshold = this.isProgressive ? (this.manualProgress >= t.delay) : (elapsed > t.delay * 2);
            
            const targetY = isAboveThreshold ? t.y : (CONFIG.FLOOR_Y - 15);
            const targetX = t.x;
            const targetZ = t.z;

            // Instant lerp for scrubbing
            const lerpSpeed = this.isProgressive ? 0.4 : 0.15;
            
            v.x += (targetX - v.x) * lerpSpeed;
            v.y += (targetY - v.y) * lerpSpeed;
            v.z += (targetZ - v.z) * lerpSpeed;
            v.rx += (0 - v.rx) * lerpSpeed;
            v.ry += (0 - v.ry) * lerpSpeed;
            v.rz += (0 - v.rz) * lerpSpeed;

            if (Math.abs(targetY - v.y) > 0.05) {
                allDone = false;
            }
        });

        if (allDone && !this.isProgressive) {
            this.state = AppState.STABLE;
            this.onStateChange(this.state);
        }
    }
    
    if (this.state !== AppState.STABLE) {
      this.centerCameraOnModel();
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.updatePhysics();
    this.draw();
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  public setAutoRotate(enabled: boolean) { this.controls.autoRotate = enabled; }
  public getJsonData(): string {
    return JSON.stringify(this.voxels.map((v, i) => ({ x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(2), c: '#' + v.color.getHexString() })), null, 2);
  }
  public getUniqueColors(): string[] {
    const colors = new Set<string>();
    this.voxels.forEach(v => colors.add('#' + v.color.getHexString()));
    return Array.from(colors);
  }
  public cleanup() {
    cancelAnimationFrame(this.animationId);
    if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
