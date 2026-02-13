# SiteDevice

A Chrome extension for responsive design testing that allows developers to view websites across multiple synchronized device frames on an infinite canvas.

![Version](https://img.shields.io/badge/version-1.0.5-blue)
![Chrome Extension](https://img.shields.io/badge/chrome-extension-green)
![React](https://img.shields.io/badge/react-19-61dafb)
![TypeScript](https://img.shields.io/badge/typescript-5.9-3178c6)

## Features

- **Multi-Device Canvas**: Place mobile, tablet, and desktop frames on an infinite canvas
- **Real-Time Synchronization**: Scroll, click, and input events sync across all devices automatically
- **Network-Level Device Emulation**: Per-device User-Agent and cookie isolation via Chrome's declarativeNetRequest API
- **Annotation System**: Draw arrows, shapes, text, and freehand annotations directly on the canvas
- **Full-Page Screenshots**: Capture viewport or full-page screenshots at 1x or 2x resolution
- **Focus Mode**: Isolate specific devices for detailed annotation work
- **Persistent State**: Canvas layout and device positions automatically saved

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/brycedriesenga/site-device.git
   cd site-device
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from the project directory

5. Click the SiteDevice icon in your Chrome toolbar to open the dashboard

### From Chrome Web Store

*Coming soon*

## Usage

1. **Open the Dashboard**: Click the SiteDevice extension icon
2. **Set a URL**: Enter a website URL in the address bar at the top
3. **Add Devices**: Use the toolbar on the left to add mobile, tablet, or desktop devices
4. **Interact**: Click and scroll in any device - all other devices will sync automatically
5. **Annotate**: Select a device and click the annotate button to enter focus mode for drawing
6. **Screenshot**: Click the camera icon on any device to capture screenshots

## Development

### Tech Stack

- **Core**: React 19, TypeScript
- **Build**: Vite 7, CRXJS (Chrome Extension plugin)
- **Canvas**: TLDraw (infinite canvas library)
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React

### Project Structure

```
src/
├── components/          # React UI components
│   ├── GlobalControls.tsx      # Address bar and navigation
│   ├── ContextualToolbar.tsx   # Device-specific actions
│   ├── VerticalToolbar.tsx     # Device type selector
│   ├── FocusOverlay.tsx        # Annotation mode overlay
│   └── DeviceSettingsModal.tsx # Device configuration
├── shapes/             # TLDraw custom shapes
│   ├── DeviceShapeUtil.tsx           # Device iframe shape
│   ├── AnnotationContainerShapeUtil.tsx # Annotation grouping
│   └── annotations/    # Annotation shapes (text, arrows, etc.)
├── tools/              # TLDraw custom tools
│   ├── BaseDeviceTool.ts
│   ├── MobileTool.ts
│   ├── TabletTool.ts
│   └── DesktopTool.ts
├── utils/              # Utility classes and hooks
│   ├── DeviceMessageBridge.ts    # Extension message handling
│   ├── DeviceEventMirror.ts      # Cross-device event sync
│   ├── DeviceScreenshotter.ts    # Screenshot capture logic
│   ├── useTldrawPersistence.ts   # Auto-save hook
│   └── ChromeStorageAdapter.ts   # Storage wrapper
├── background.ts       # Service worker
├── content.ts          # Content script (injected into pages)
├── manifest.ts         # Extension manifest definition
└── TldrawApp.tsx       # Main application component
```

### Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

### Architecture

#### Communication Flow

1. **Dashboard → Background**: React components send messages via `chrome.runtime.sendMessage`
2. **Background → Content Scripts**: Service worker broadcasts to all frames in a tab
3. **Content Scripts ↔ Iframes**: `DeviceMessageBridge` handles bidirectional messaging
4. **Event Sync**: `DeviceEventMirror` captures scroll/click/input events and replays them across devices

#### Key Components

**DeviceMessageBridge** (`utils/DeviceMessageBridge.ts`)
- Manages messaging between device iframes and extension
- Supports three messaging patterns:
  - `sendToBackground()`: To service worker
  - `sendToPeers()`: To other device iframes
  - `broadcast()`: Both background and peers

**DeviceEventMirror** (`utils/DeviceEventMirror.ts`)
- Captures user interactions in device iframes
- Prevents infinite loops via `isReplaying` flag
- Generates unique CSS selectors for element targeting
- Supports scroll, click, and input event mirroring

**DeviceScreenshotter** (`utils/DeviceScreenshotter.ts`)
- Tile-based screenshot capture strategy
- Supports viewport and full-page modes
- 1x and 2x resolution options
- Stitches multiple viewport captures for large pages

#### Data Flow

```
User Action (Scroll/Click/Input)
    ↓
DeviceEventMirror (content.ts)
    ↓
DeviceMessageBridge
    ↓
Background Script (broadcast)
    ↓
Peer Device Iframes
    ↓
Event Replay (synchronized action)
```

### Browser APIs Used

- **Manifest V3**: Extension format
- **declarativeNetRequest**: Modify headers (User-Agent, cookies) per device
- **chrome.tabs**: Tab management and screenshot capture
- **chrome.storage**: Persistent state storage
- **chrome.scripting**: Content script injection

### Development Notes

#### Adding New Device Types

1. Create a new tool in `src/tools/` extending `BaseDeviceTool`
2. Add device preset in `TldrawApp.tsx` `PRESETS` object
3. Register tool in `customTools` array
4. Add UI override in `uiOverrides`

#### Adding New Annotation Types

1. Create shape utility in `src/shapes/annotations/`
2. Extend appropriate TLDraw base class
3. Register in `shapeUtils` array in `TldrawApp.tsx`
4. Add to toolbar in `VerticalToolbar.tsx`

#### State Management

- **TLDraw Store**: Canvas state (shapes, camera, selection) managed by TLDraw
- **Chrome Storage**: Persistence via `ChromeStorageAdapter`
- **React State**: UI state (URLs, recent URLs, loading states)

### Performance Optimizations

- **Debounced UA Updates**: Device User-Agent rules update at most every 250ms
- **Memoized Components**: `FocusModeListener` extracted and memoized
- **Lazy Loading**: TLDraw component loaded via `React.lazy()` with Suspense
- **Event Cleanup**: Proper cleanup of message listeners and DOM events
- **Passive Event Listeners**: Scroll events use `{ passive: true }`

## License

MIT License - see LICENSE file for details

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run build` to verify
5. Submit a pull request

## Changelog

### v1.0.5
- Performance optimizations and code quality improvements
- Memoized FocusModeListener component
- Debounced UA rules updates (250ms)
- Extracted inline styles to CSS
- Lazy loaded TLDraw component
- Added proper event listener cleanup

### v1.0.4
- Fixed device selection and scroll sync issues

### v1.0.3
- Refactored device styling and toolbar layout
- Added Focus Mode support for annotations

### v1.0.2
- Migrated to TLDraw-based canvas system
- Removed legacy annotation system

### v1.0.1
- Added device message bridge and event mirroring

### v1.0.0
- Initial release with core multi-device functionality
