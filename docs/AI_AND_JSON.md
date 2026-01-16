# AI & JSON Blueprints 🤖💎

This project uses a custom JSON format to represent 3D voxel art, enabling both portability and AI generation.

## 1. The Blueprint Format
A "Blueprint" is a simple JSON array. Since voxels exist on a 1x1x1 grid, we only need coordinates and colors.

```json
[
  { "x": 0, "y": 0, "z": 0, "color": 16711680 },
  { "x": 1, "y": 0, "z": 0, "color": 16711680 }
]
```
- **x, y, z:** Integer grid coordinates.
- **color:** Hexadecimal integer representation of the color.

## 2. Gemini 3 Pro Integration
The "Prompt a build" feature uses the **Gemini 3 Pro** model to translate human language into 3D coordinates.

### The System Prompt
We instruct the model to act as a 3D Architect. We provide a strict `responseSchema` using the `@google/genai` SDK to ensure the output is always valid JSON that our `VoxelEngine` can parse.

### How it "Visualizes"
Gemini maps your text description (e.g., "A red sports car") into a spatial grid. Because it understands the relationship between parts (wheels, body, windows), it can generate a coherent 3D structure without ever "seeing" a 3D file.

## 3. Sharing & Portability
Because the data is just text:
- **Sharing:** Use the "Share" tool to copy the JSON string to your clipboard.
- **Importing:** Paste a JSON string into the "Import" modal to instantly load a sculpture created by someone else (or by the AI in a previous session).
- **Modification:** You can manually edit the JSON to change colors or positions without needing a 3D modeling suite.
