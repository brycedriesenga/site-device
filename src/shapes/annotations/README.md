# Tldraw Annotation Shapes

This directory contains 5 custom annotation shape utilities for tldraw that enable drawing and annotating on the canvas.

## Shape Utilities

### 1. RectangleAnnotationShapeUtil
- **Type:** `annotation-rect`
- **Purpose:** Create rectangle/square annotations with customizable stroke and fill
- **Props:**
  - `w`, `h`: dimensions
  - `color`: stroke color (default: `#ef4444` - red)
  - `strokeWidth`: border width (default: 2)
  - `fillColor`: fill color (default: `#ffffff`)
  - `fillOpacity`: fill opacity (default: 0 - transparent)

### 2. CircleAnnotationShapeUtil
- **Type:** `annotation-circle`
- **Purpose:** Create circle/ellipse annotations for highlighting areas
- **Props:**
  - `w`, `h`: dimensions (width = 2*rx, height = 2*ry)
  - `color`: stroke color (default: `#3b82f6` - blue)
  - `strokeWidth`: border width (default: 2)
  - `fillColor`: fill color (default: `#ffffff`)
  - `fillOpacity`: fill opacity (default: 0 - transparent)
- **Geometry:** Uses `Ellipse2d` for proper hit-testing

### 3. ArrowAnnotationShapeUtil
- **Type:** `annotation-arrow`
- **Purpose:** Create directional arrows with customizable arrowheads
- **Props:**
  - `w`, `h`: dimensions (defines start/end points)
  - `color`: arrow color (default: `#8b5cf6` - purple)
  - `strokeWidth`: line width (default: 2)
  - `arrowheadStart`: show arrowhead at start (default: false)
  - `arrowheadEnd`: show arrowhead at end (default: true)
- **Features:** Dynamic arrowhead sizing based on stroke width

### 4. TextAnnotationShapeUtil
- **Type:** `annotation-text`
- **Purpose:** Add text annotations with formatting options
- **Props:**
  - `w`, `h`: dimensions
  - `text`: annotation text content (default: "Text annotation")
  - `color`: text color (default: `#1f2937` - dark gray)
  - `fontSize`: font size in pixels (default: 16)
  - `fontFamily`: font family (default: 'sans-serif')
  - `textAlign`: alignment - 'left' | 'center' | 'right' (default: 'left')
- **Features:** 
  - Multiline support with word wrapping
  - User-selectable text
  - Auto-padding

### 5. PathAnnotationShapeUtil
- **Type:** `annotation-path`
- **Purpose:** Freehand drawing with polylines/curves
- **Props:**
  - `w`, `h`: bounding box dimensions
  - `points`: flat array of coordinates [x1, y1, x2, y2, ...]
  - `color`: path color (default: `#10b981` - green)
  - `strokeWidth`: line width (default: 2)
  - `smooth`: enable curve smoothing (default: false)
- **Features:** 
  - Supports both straight lines and smooth curves
  - Uses quadratic curves when smooth mode enabled

## Usage

All shapes can be imported individually or via the index:

```typescript
// Individual imports
import { RectangleAnnotationShapeUtil } from './shapes/annotations/RectangleAnnotationShapeUtil'

// Bulk import
import {
  RectangleAnnotationShapeUtil,
  CircleAnnotationShapeUtil,
  ArrowAnnotationShapeUtil,
  TextAnnotationShapeUtil,
  PathAnnotationShapeUtil
} from './shapes/annotations'
```

## Implementation Details

All shapes:
- Extend `BaseBoxShapeUtil` from tldraw
- Use SVG rendering (except TextAnnotation which uses HTML)
- Support resizing via `resizeBox`
- Include proper `getGeometry()` for hit-testing
- Have sensible default props
- Follow tldraw naming conventions
- Include proper TypeScript types

## Integration

To register these shapes with tldraw, add them to the `shapeUtils` array in your Tldraw component:

```typescript
const shapeUtils = [
  DeviceShapeUtil,
  RectangleAnnotationShapeUtil,
  CircleAnnotationShapeUtil,
  ArrowAnnotationShapeUtil,
  TextAnnotationShapeUtil,
  PathAnnotationShapeUtil
]
```

## Next Steps

These shapes are the foundation for Phase 2, which will:
- Add UI controls to create these shapes
- Implement tool buttons in the toolbar
- Add keyboard shortcuts
- Enable shape property editing
