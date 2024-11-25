# React Drawing Canvas

A flexible React component that provides an interactive canvas for creating and manipulating rectangles and arrows with node-based connections.

## Features

- **Drawing Tools**
  - Rectangle: Click and drag to create rectangles, or click once for a default-sized rectangle (100x50)
  - Arrow: Create arrows with customizable start and end points
  
- **Interactive Elements**
  - Shape Selection: Click to select/deselect shapes
  - Drag and Drop: Move shapes freely on the canvas
  - Connection Nodes: Toggle visibility of connection points for shapes
  - Smart Snapping: Arrows automatically snap to nearby connection points within 20 pixels

- **Connection System**
  - Node-based connections for rectangles (left, right, top, bottom)
  - Arrows maintain connections when moving connected shapes
  - Visual feedback for selected shapes and connection points

## Installation

1. Add the component to your React project
2. Include the required CSS file (`Canvas.css`)

## Usage

```jsx
import Canvas from './Canvas';

function App() {
  return (
    <div className="App">
      <Canvas />
    </div>
  );
}
```

## Component Interface

### Tools

The canvas provides two main tools:
- Rectangle Tool: Creates rectangular shapes
- Arrow Tool: Creates arrows that can connect to rectangles

### Controls

- **Top Toolbar**
  - Rectangle: Switch to rectangle drawing mode
  - Arrow: Switch to arrow drawing mode

- **Left Toolbar**
  - Show/Hide Nodes: Toggle connection points visibility

### Interactions

1. **Drawing Shapes**
   - Select a tool from the toolbar
   - Click and drag on the canvas to draw
   - For rectangles, quick click creates a default 100x50 rectangle

2. **Selecting Shapes**
   - Click on any shape to select it
   - Click on the canvas to deselect
   - Selected shapes show in blue

3. **Moving Shapes**
   - Select a shape and drag to move it
   - Connected arrows maintain their connections during movement

4. **Connecting Arrows**
   - Show connection nodes using the toolbar button
   - Drag arrow endpoints near connection nodes to snap
   - Arrows automatically stay connected when moving shapes

## Technical Details

### Key Features Implementation

- **Snapping System**
  - Uses `SNAP_DISTANCE` constant (20 pixels)
  - Automatically finds nearest connection point
  - Maintains connections during shape movement

- **Shape Management**
  - Unique IDs for each shape
  - State management for selections and dragging
  - Separate rendering logic for different shape types

### State Management

The component manages several states:
- `selectedTool`: Current active tool
- `shapes`: Array of all shapes on canvas
- `selectedShapeId`: Currently selected shape
- `isDrawing`: Drawing state
- `isDragging`: Dragging state
- `showNodes`: Connection nodes visibility

## Customization

The component can be customized by:
1. Modifying the CSS file
2. Adjusting the `SNAP_DISTANCE` constant
3. Changing default rectangle dimensions
4. Modifying shape styles and colors

## Dependencies

- React (with Hooks)
- CSS Module support

## Notes

- The canvas uses relative positioning for all elements
- Shapes maintain their aspect ratio during creation
- Arrow endpoints snap to the nearest connection point within range
- Connected arrows update their positions automatically when moving shapes

## Contributing

Feel free to submit issues and enhancement requests.