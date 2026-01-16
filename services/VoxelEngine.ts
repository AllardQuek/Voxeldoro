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
  private onCountChange: (count: number) => void;
  private animationId: number = 0;
  private isProgressive: boolean = false;
  private manualProgress: number = 0;

  constructor(container: HTMLElement, onStateChange: (state: AppState) => void, onCountChange: (count: number) => void) {
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
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
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

  public loadInitialModel(data: VoxelData[]) {
    this.createVoxels(data);
    this.onCountChange(this.voxels.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
    const box = new THREE.Box3();
    data.forEach(v => box.expandByPoint(new THREE.Vector3(v.x, v.y, v.z)));
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.controls.target.set(center.x, center.y + 12, center.z);
  }

  private createVoxels(data: VoxelData[]) {
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
    }
    this.voxels = data.map((v, i) => ({
      id: i, x: v.x, y: v.y, z: v.z, color: new THREE.Color(v.color),
      vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, rvx: 0, rvy: 0, rvz: 0
    }));
    const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.scene.add(this.instanceMesh);
    this.draw();
  }

  private draw() {
    if (!this.instanceMesh) return;
    this.voxels.forEach((v, i) => {
      this.dummy.position.set(v.x, v.y, v.z);
      this.dummy.rotation.set(v.rx, v.ry, v.rz);
      this.dummy.scale.setScalar(v.y < CONFIG.FLOOR_Y - 1 ? 0.001 : 1);
      this.dummy.updateMatrix();
      this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);
      this.instanceMesh!.setColorAt(i, v.color);
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    if (this.instanceMesh.instanceColor) this.instanceMesh.instanceColor.needsUpdate = true;
  }

  public dismantle() {
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    this.voxels.forEach(v => { v.vy = -1.5; v.vx = (Math.random() - 0.5) * 0.5; });
  }

  public setProgress(p: number) {
    this.manualProgress = p;
    // When progressive (scrubbing), ensure we update physics immediately
    if (this.state === AppState.REBUILDING) this.updatePhysics(true);
  }

  public finishRebuild() {
    this.manualProgress = 1;
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
    this.voxels.forEach((v, i) => {
      const t = this.rebuildTargets[i];
      if (t && !t.isRubble) { v.x = t.x; v.y = t.y; v.z = t.z; v.rx = v.ry = v.rz = 0; }
    });
    this.draw();
  }

  public rebuild(targetModel: VoxelData[], progressive: boolean = false) {
    this.isProgressive = progressive;
    this.manualProgress = 0;
    if (targetModel.length > this.voxels.length) this.createVoxels(targetModel);
    const sorted = [...targetModel].sort((a, b) => a.y - b.y);
    this.rebuildTargets = this.voxels.map((_, i) => {
      const target = sorted[i];
      return target ? { x: target.x, y: target.y, z: target.z, delay: i / sorted.length } : { x: 0, y: -20, z: 0, delay: 1, isRubble: true };
    });
    this.state = AppState.REBUILDING;
    this.onStateChange(this.state);
    this.rebuildStartTime = Date.now();
  }

  private updatePhysics(immediate = false) {
    if (this.state === AppState.REBUILDING) {
      const lerpSpeed = this.isProgressive ? 0.5 : 0.15;
      this.voxels.forEach((v, i) => {
        const t = this.rebuildTargets[i];
        if (!t) return;
        const targetActive = this.manualProgress >= t.delay;
        const targetY = targetActive ? t.y : CONFIG.FLOOR_Y - 15;
        const targetX = targetActive ? t.x : v.x;
        const targetZ = targetActive ? t.z : v.z;
        v.x += (targetX - v.x) * lerpSpeed;
        v.y += (targetY - v.y) * lerpSpeed;
        v.z += (targetZ - v.z) * lerpSpeed;
      });
    } else if (this.state === AppState.DISMANTLING) {
      this.voxels.forEach(v => { v.y += v.vy; });
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    if (this.state !== AppState.STABLE) this.updatePhysics();
    this.draw();
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  public setAutoRotate(e: boolean) { this.controls.autoRotate = e; }
  public getJsonData() { return JSON.stringify(this.voxels.map(v => ({ x: v.x, y: v.y, z: v.z, c: '#' + v.color.getHexString() }))); }
  public cleanup() { cancelAnimationFrame(this.animationId); this.renderer.dispose(); }
}