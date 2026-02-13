# SiteDevice Developer Guide

Technical documentation for developers and AI agents working on the SiteDevice Chrome extension.

## Quick Reference

### Common Tasks

**Add a new message type:**
1. Add handler in `DeviceMessageBridge.on()` 
2. Handle in `content.ts` or `background.ts`
3. Type the payload in message handlers

**Modify device behavior:**
- Edit `DeviceShapeUtil.tsx` for rendering
- Edit device presets in `TldrawApp.tsx` for defaults
- Modify `background.ts` DNR rules for network behavior

**Add a new annotation tool:**
1. Create shape utility in `src/shapes/annotations/`
2. Export from `src/shapes/annotations/index.ts`
3. Register in `shapeUtils` array in `TldrawApp.tsx`

## Code Patterns

### Message Passing Pattern

```typescript
// Sending from component
chrome.runtime.sendMessage({
    type: 'MY_EVENT',
    payload: { data: value }
})

// Handling in background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'MY_EVENT') {
        // Handle message
        sendResponse({ success: true })
    }
})

// Handling in content script
bridge.on('MY_EVENT', (payload) => {
    // Handle message
})
```

### Event Mirroring Pattern

```typescript
// Capture event
element.addEventListener('click', (e) => {
    if (this.isReplaying) return // Prevent loops
    
    const selector = this.getUniqueSelector(e.target)
    this.bridge.sendToBackground('EVENT_CLICK', { selector })
})

// Replay event
this.bridge.on('REPLAY_CLICK', (payload) => {
    this.isReplaying = true
    const element = document.querySelector(payload.selector)
    element?.click()
    setTimeout(() => { this.isReplaying = false }, 50)
})
```

### Store Persistence Pattern

```typescript
// In hook
useEffect(() => {
    if (!editor) return
    
    // Load initial state
    const init = async () => {
        const snapshot = await ChromeStorageAdapter.load()
        if (snapshot) editor.loadSnapshot(snapshot)
    }
    init()
    
    // Persist on changes
    const unlisten = editor.store.listen(() => {
        const snapshot = editor.getSnapshot()
        ChromeStorageAdapter.save(snapshot)
    }, { scope: 'all', source: 'user' })
    
    return () => unlisten()
}, [editor])
```

## Key Files Reference

### Core Application
- `TldrawApp.tsx` - Main React component, orchestrates everything
- `main.tsx` - React entry point
- `manifest.ts` - Extension manifest (defines permissions, scripts)

### Extension Scripts
- `background.ts` - Service worker (DNR rules, message routing)
- `content.ts` - Content script (injected into all pages)
- `inject.js` - Main world script (access to page APIs)

### Utilities
- `DeviceMessageBridge.ts` - Message passing abstraction
- `DeviceEventMirror.ts` - Cross-device event synchronization
- `DeviceScreenshotter.ts` - Screenshot capture with tiling
- `ChromeStorageAdapter.ts` - Storage persistence wrapper

### TLDraw Integration
- `DeviceShapeUtil.tsx` - Custom shape for device iframes
- `AnnotationContainerShapeUtil.tsx` - Container for annotations
- `annotations/*` - Various annotation shape types
- `tools/*` - Custom tools for adding devices

## Data Structures

### Device Shape
```typescript
interface IDeviceShape {
    id: string
    type: 'device'
    x: number
    y: number
    props: {
        w: number
        h: number
        url: string
        name: string
        deviceType: 'mobile' | 'tablet' | 'desktop'
        userAgent: string
        pixelRatio: number
        clientHints?: {
            platform: string
            mobile: boolean
            brands?: Array<{brand: string, version: string}>
        }
    }
}
```

### Message Types

**Background Messages:**
- `UPDATE_UA_RULES` - Update DNR rules for devices
- `CLEAR_DATA` - Clear cache/cookies/storage
- `CHECK_IS_MANAGED` - Verify frame is in extension

**Content Script Messages:**
- `EVENT_SCROLL` / `REPLAY_SCROLL` - Scroll synchronization
- `EVENT_CLICK` / `REPLAY_CLICK` - Click synchronization
- `EVENT_INPUT` / `REPLAY_INPUT` - Input synchronization
- `EVENT_NAVIGATED` - URL change notification
- `CMD_NAV_BACK` / `CMD_NAV_FORWARD` - Navigation commands
- `GET_PAGE_DIMS` - Request page dimensions
- `NAVIGATE` - Navigate to URL

## Chrome APIs

### declarativeNetRequest

Used to modify headers per device:
- Set User-Agent based on device type
- Remove cookies for isolated sessions
- Set Client Hints headers

Rules are dynamically updated via `chrome.declarativeNetRequest.updateDynamicRules()`

### chrome.tabs

- `captureVisibleTab()` - Screenshot capture
- `sendMessage()` - Send messages to content scripts
- `getCurrent()` - Get current tab info

### chrome.storage

Uses `chrome.storage.local` for:
- TLDraw snapshot persistence
- Recent URLs
- User preferences

Storage key: `site-device-tldraw-persistence-v1`

## Common Issues

### Extension Context Invalidated
Content scripts may lose connection if extension reloads. Always wrap chrome API calls in try/catch.

### iframe Security
Devices render in sandboxed iframes with limited permissions. Use `sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"`

### Event Loop Prevention
The `isReplaying` flag prevents infinite event loops during synchronization. Always check before sending events.

### CORS and Frame Options
DNR rules strip `X-Frame-Options` and `Content-Security-Policy` headers to allow iframe embedding.

## Testing

### Manual Testing Checklist
- [ ] Device placement from toolbar
- [ ] URL entry and navigation
- [ ] Cross-device scroll sync
- [ ] Cross-device click sync
- [ ] Cross-device input sync
- [ ] Annotation creation
- [ ] Screenshot capture (all 4 modes)
- [ ] Device rotation
- [ ] Focus mode enter/exit
- [ ] State persistence after reload

### Debug Tools

Enable verbose logging:
```typescript
// In console
localStorage.debug = 'site-device:*'
```

Check DNR rules:
```javascript
// In background script console
chrome.declarativeNetRequest.getDynamicRules(console.log)
```

## Performance Considerations

1. **Debouncing**: UA rule updates debounced at 250ms
2. **RAF for Scroll**: Scroll events use requestAnimationFrame
3. **Passive Listeners**: Scroll listeners marked passive
4. **Lazy Loading**: TLDraw loaded on demand
5. **Memoization**: Component and callback memoization
6. **Cleanup**: All listeners properly cleaned up

## Build and Deploy

```bash
# Development
npm run dev

# Production build
npm run build

# Verify build
npm run lint
npx tsc --noEmit

# Load in Chrome
# 1. Build first
# 2. Open chrome://extensions
# 3. Enable Developer Mode
# 4. Load unpacked → select dist folder
```

## Code Style

- TypeScript strict mode enabled
- ESLint with type-aware rules
- React hooks rules enforced
- Explicit return types on public APIs
- JSDoc comments for utility classes

## Architecture Decisions

### Why TLDraw?
- Built-in infinite canvas
- Shape system matches device/annotation needs
- Built-in persistence and undo/redo
- Active development and community

### Why declarativeNetRequest?
- Network-level isolation (not just JS)
- Works across all requests (iframes, XHR, etc.)
- More reliable than JavaScript UA spoofing

### Why Tile-Based Screenshots?
- Chrome limits `captureVisibleTab` to viewport
- Tiling allows full-page capture
- More reliable than debugger API
- Works across all sites

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [TLDraw Documentation](https://tldraw.dev/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [declarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
