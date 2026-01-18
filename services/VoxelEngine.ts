
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData } from '../types';
import { CONFIG } from '../utils/voxelConstants';

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
  private onCountChange: (active: number, total: number) => void;
  private animationId: number = 0;

  private isProgressive: boolean = false;
  private manualProgress: number = 0;

  private baseRings: THREE.Group;

  private isResettingCamera: boolean = false;
  private resetAlpha: number = 0;
  private startCameraPos = new THREE.Vector3();
  private startTargetPos = new THREE.Vector3();
  private targetCameraPos = new THREE.Vector3(30, 30, 80);
  private targetTargetPos = new THREE.Vector3(0, 0, 0);

  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (active: number, total: number) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.BG_COLOR);

    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.camera.position.set(60, 40, 120);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.15; 
    this.controls.maxDistance = 1500;
    this.controls.minDistance = 5;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    this.baseRings = new THREE.Group();
    this.baseRings.position.y = CONFIG.FLOOR_Y;
    this.scene.add(this.baseRings);

    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0x6366f1, 
      transparent: true, 
      opacity: 0.1, 
      side: THREE.DoubleSide 
    });

    const createRing = (inner: number, outer: number, opacity: number) => {
      const geo = new THREE.RingGeometry(inner, outer, 128);
      const mat = ringMat.clone();
      mat.opacity = opacity;
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      return ring;
    };

    this.baseRings.add(createRing(40, 40.5, 0.15));
    this.baseRings.add(createRing(55, 56, 0.08));
    this.baseRings.add(createRing(75, 75.2, 0.05));

    const shadowCatchGeo = new THREE.PlaneGeometry(2000, 2000);
    const shadowCatchMat = new THREE.ShadowMaterial({ opacity: 0.06 });
    const shadowPlane = new THREE.Mesh(shadowCatchGeo, shadowCatchMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = CONFIG.FLOOR_Y - 0.1;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  public getActiveModelData(): VoxelData[] {
    return this.voxels.map(v => ({
      x: v.x, y: v.y, z: v.z,
      color: v.color.getHex()
    }));
  }

  public getJsonData(): string {
    return JSON.stringify(this.getActiveModelData().map(v => ({
      x: v.x, y: v.y, z: v.z, c: '#' + v.color.toString(16).padStart(6, '0')
    })), null, 2);
  }

  private draw() {
    if (!this.instanceMesh) return;
    const now = Date.now();
    const elapsed = (now - this.rebuildStartTime) / 1000;
    let activeCount = 0;

    this.voxels.forEach((v, i) => {
        let s = 1.0;
        const target = this.rebuildTargets[i];

        if (this.state === AppState.STABLE) {
          s = 1.0;
          activeCount++;
        } else if (this.state === AppState.REBUILDING) {
            if (!target || target.isRubble) {
              s = 0.0001;
            } else {
              const isUnlocked = this.isProgressive ? (this.manualProgress >= target.delay) : (elapsed > target.delay * 2);
              if (!isUnlocked) {
                // Scaling down logic for "locked" blocks based on depth
                if (v.y < CONFIG.FLOOR_Y - 5) {
                  s = 0.0001;
                } else {
                  s = 1.0;
                }
              } else {
                activeCount++;
                s = 1.0;
              }
            }
        } else if (this.state === AppState.DISMANTLING) {
           s = 1.0;
        }

        this.dummy.scale.set(s, s, s);
        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        this.dummy.updateMatrix();
        this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);
        this.instanceMesh!.setColorAt(i, v.color);
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    if (this.instanceMesh.instanceColor) this.instanceMesh.instanceColor.needsUpdate = true;
    
    this.onCountChange(activeCount, this.voxels.length);
  }

  public resetCameraView() {
    this.startCameraPos.copy(this.camera.position);
    this.startTargetPos.copy(this.controls.target);
    this.resetAlpha = 0;
    this.isResettingCamera = true;
  }

  private centerCameraOnTarget(data: VoxelData[]) {
    if (data.length === 0) return;
    const box = new THREE.Box3();
    data.forEach(v => box.expandByPoint(new THREE.Vector3(v.x, v.y, v.z)));
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.4; 
    this.targetTargetPos.copy(center);
    this.targetCameraPos.set(center.x + distance * 0.5, center.y + distance * 0.4, center.z + distance * 1.2);
    if (!this.isResettingCamera) {
      this.controls.target.copy(center);
      const dir = new THREE.Vector3().subVectors(this.camera.position, center).normalize();
      this.camera.position.copy(center).add(dir.multiplyScalar(distance));
    }
  }

  public loadInitialModel(data: VoxelData[]) {
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
    this.manualProgress = 0;
    this.rebuildTargets = data.map(v => ({ x: v.x, y: v.y, z: v.z, delay: 0 }));
    this.createVoxels(data);
    this.centerCameraOnTarget(data);
    this.onCountChange(data.length, data.length);
  }

  private createVoxels(data: VoxelData[]) {
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      (Array.isArray(this.instanceMesh.material) ? this.instanceMesh.material : [this.instanceMesh.material]).forEach(m => m.dispose());
    }
    this.voxels = data.map((v, i) => ({
        id: i,
        x: v.x, y: v.y, z: v.z, color: new THREE.Color(v.color),
        vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, rvx: 0, rvy: 0, rvz: 0
    }));
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.2 });
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.instanceMesh.frustumCulled = false;
    this.scene.add(this.instanceMesh);
    this.draw();
  }

  public dismantle() {
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    const center = new THREE.Vector3();
    this.voxels.forEach(v => { center.x += v.x; center.y += v.y; center.z += v.z; });
    center.divideScalar(this.voxels.length);
    this.voxels.forEach(v => {
        const dir = new THREE.Vector3(v.x - center.x, (v.y - center.y) * 0.1, v.z - center.z).normalize();
        const force = 0.1 + Math.random() * 0.15; 
        v.vx = dir.x * force;
        v.vy = Math.random() * 0.15 + 0.1; 
        v.vz = dir.z * force;
        v.rvx = (Math.random() - 0.5) * 0.1; v.rvy = (Math.random() - 0.5) * 0.1; v.rvz = (Math.random() - 0.5) * 0.1;
    });
  }

  public setProgress(p: number) { 
    this.manualProgress = p; 
    if (p >= 1.0 && this.state === AppState.REBUILDING) {
        this.finishRebuild();
    }
  }

  public finishRebuild() {
    this.manualProgress = 1;
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
    this.voxels.forEach((v, i) => {
        const t = this.rebuildTargets[i];
        if (t && !t.isRubble) {
            v.x = t.x; v.y = t.y; v.z = t.z;
            v.rx = v.ry = v.rz = v.vx = v.vy = v.vz = 0;
        } else if (t && t.isRubble) {
          v.y = CONFIG.FLOOR_Y - 300; 
        }
    });
    this.draw();
  }

  public rebuild(targetModel: VoxelData[], progressive: boolean = false) {
    // PREVENT FLICKER: Set state first so next frame draw respects transition
    this.state = AppState.REBUILDING;
    this.onStateChange(this.state);
    
    this.isProgressive = progressive;
    this.centerCameraOnTarget(targetModel);
    
    // Resize mesh if target is larger, using temporary targets to avoid draw flicker
    if (targetModel.length > this.voxels.length) {
      this.rebuildTargets = targetModel.map(v => ({ x: v.x, y: v.y, z: v.z, delay: 2, isRubble: false }));
      this.createVoxels(targetModel);
    }
    
    const sortedTargets = [...targetModel].sort((a, b) => a.y - b.y);
    const available = this.voxels.map((v, i) => ({ index: i, color: v.color, taken: false }));
    const mappings: RebuildTarget[] = new Array(this.voxels.length).fill(null);
    
    sortedTargets.forEach((target, targetIdx) => {
        let bestDist = 9999, bestIdx = -1;
        for (let i = 0; i < available.length; i++) {
            if (available[i].taken) continue;
            const d = Math.abs(available[i].color.r - new THREE.Color(target.color).r);
            if (d < bestDist) { bestDist = d; bestIdx = i; if (d < 0.01) break; }
        }
        if (bestIdx !== -1) {
            const vIdx = available[bestIdx].index;
            available[bestIdx].taken = true;
            mappings[vIdx] = { x: target.x, y: target.y, z: target.z, delay: targetIdx / sortedTargets.length };
            this.voxels[vIdx].color.setHex(target.color);
        }
    });

    for (let i = 0; i < this.voxels.length; i++) {
        if (!mappings[i]) {
          mappings[i] = { x: 0, y: CONFIG.FLOOR_Y - 300, z: 0, isRubble: true, delay: 2 };
        }
    }
    
    this.rebuildTargets = mappings;
    this.rebuildStartTime = Date.now();
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    if (this.baseRings) {
      this.baseRings.children.forEach((ring, idx) => {
        ring.rotation.z += 0.002 * (idx + 1) * (idx % 2 === 0 ? 1 : -1);
      });
    }
    if (this.isResettingCamera) {
        this.resetAlpha += 0.035; 
        if (this.resetAlpha >= 1) { this.resetAlpha = 1; this.isResettingCamera = false; }
        const eased = 1 - Math.pow(1 - this.resetAlpha, 4); 
        this.camera.position.lerpVectors(this.startCameraPos, this.targetCameraPos, eased);
        this.controls.target.lerpVectors(this.startTargetPos, this.targetTargetPos, eased);
    }
    this.controls.update();

    if (this.state === AppState.DISMANTLING) {
        this.voxels.forEach(v => {
            v.vy -= 0.006; v.x += v.vx; v.y += v.vy; v.z += v.vz;
            v.rx += v.rvx; v.ry += v.rvy; v.rz += v.rvz;
            v.vx *= 0.98; v.vz *= 0.98;
        });
    } else if (this.state === AppState.REBUILDING) {
        const now = Date.now();
        const elapsed = (now - this.rebuildStartTime) / 1000;
        this.voxels.forEach((v, i) => {
            const t = this.rebuildTargets[i];
            if (!t || t.isRubble) return;
            const isUnlocked = this.isProgressive ? (this.manualProgress >= t.delay) : (elapsed > t.delay * 2);
            
            if (isUnlocked) {
                const lerpSpeed = 0.15;
                v.x += (t.x - v.x) * lerpSpeed;
                v.y += (t.y - v.y) * lerpSpeed;
                v.z += (t.z - v.z) * lerpSpeed;
                v.rx += (0 - v.rx) * lerpSpeed; v.ry += (0 - v.ry) * lerpSpeed; v.rz += (0 - v.rz) * lerpSpeed;
                v.vx = v.vy = v.vz = 0; 
            } else {
                if (v.y > CONFIG.FLOOR_Y - 5) {
                   v.vy -= 0.006; v.x += v.vx; v.y += v.vy; v.z += v.vz;
                   v.rx += v.rvx; v.ry += v.rvy; v.rz += v.rvz;
                   v.vx *= 0.98; v.vz *= 0.98;
                } else {
                   v.y += ( (CONFIG.FLOOR_Y - 10) - v.y ) * 0.1;
                   v.vx = v.vy = v.vz = 0;
                }
            }
        });
    }
    this.draw();
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  public setAutoRotate(enabled: boolean) { this.controls.autoRotate = enabled; }
  public cleanup() {
    cancelAnimationFrame(this.animationId);
    if (this.container.contains(this.renderer.domElement)) this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}
