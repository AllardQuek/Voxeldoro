# Technical Architecture 🛠️

Voxel Pomodoro is built with **React**, **Three.js**, and the **Google Gemini API**.

## 1. High-Performance Rendering
To render thousands of voxels at 60FPS, the app avoids creating individual Mesh objects.

### InstancedMesh
The `VoxelEngine` utilizes `THREE.InstancedMesh`. This allows the GPU to render every single voxel in a **single draw call**.
- **Transformation:** We use a shared `THREE.Object3D` ("dummy") to calculate the matrix for each instance.
- **Memory:** All voxels share the same geometry and material, significantly reducing the memory footprint.

## 2. Voxel Engine State Machine
The simulation transitions through three primary states defined in `types.ts`:

- **STABLE:** The model is static and fully formed.
- **DISMANTLING:** Voxels are given an initial downward velocity and fall below the "floor" plane (`CONFIG.FLOOR_Y`).
- **REBUILDING:** Voxels are lerped (linear interpolation) from their hidden positions back to their target coordinates.

## 3. The Assembly Algorithm
The "Progressive Build" logic is the heart of the Pomodoro experience:
1. **Y-Sorting:** When a model is loaded, target voxels are sorted by their Y-coordinate (height).
2. **Delay Assignment:** Each voxel is assigned a `delay` value between 0 and 1 based on its position in the sorted list.
3. **Progress Mapping:** The Pomodoro timer (e.g., 25 minutes) is mapped to a 0.0 to 1.0 progress value.
4. **Unlocking:** A voxel only begins moving to its target when the `currentProgress` exceeds its `delay`. This creates the satisfying "growing from the ground" effect.

## 4. Physics & Animation
- **Lerping:** Instead of a complex physics engine, we use simple Linear Interpolation for the rebuilding phase. This ensures 100% accuracy in the final sculpture.
- **Culling:** Voxels that are deep below the floor are scaled to `0.001` to ensure they don't interfere with shadows or performance while hidden.
