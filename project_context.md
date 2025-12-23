# Project Context: SiteDevice

## 1. Project Overview
**SiteDevice** is a Chrome Extension designed for advanced responsive design testing. It allows developers and designers to view a single website across multiple synchronized device frames (Mobile, Tablet, Desktop) on an infinite canvas. Key features include event mirroring (clicks/scrolls sync across devices), network-level isolation (per-device cookies/UA), advanced full-page screenshots, and an annotation overlay system.

## 2. Tech Stack
*   **Core**: React 19, TypeScript
*   **Build Tool**: Vite, CRXJS (Vite Plugin for Chrome Extensions)
*   **Styling**: Tailwind CSS, `clsx`, `tailwind-merge`
*   **Icons**: Lucide React
*   **Chrome APIs**: Manifest V3, `declarativeNetRequest` (Header spoofing), `storage`, `tabs`, `scripting`, `debugger` (optional/legacy support).

## 3. Project Structure
*   **/src**: Main source directory.
    *   **App.tsx**: The core dashboard logic. Manages the infinite canvas state, device list, and global event orchestration.
    *   **main.tsx**: Entry point for the Dashboard tab.
    *   **background.ts**: Service Worker. Handles specific extension events (lifecycle, context menu, DNR rules, message routing between frames).
    *   **content.ts**: The script injected into every frame. Responsible for:
        *   Mirroring events (scroll, click, input)
        *   Reporting page dimensions for screenshots (`GET_PAGE_DIMS`)
        *   Handling scroll/navigation commands from the App.
    *   **manifest.ts**: The programmatic definition of `manifest.json`.
*   **/src/components**: React UI components.
    *   **DeviceFrame.tsx**: The wrapper for the simulated device `iframe`. Handles scaling, rotation, and header Chrome.
    *   **AnnotationLayer.tsx**: SVG overlay for drawing arrows, text, and shapes.
    *   **Toolbar.tsx` / `AnnotationToolbar.tsx**: UI controls.
*   **/src/types**: TypeScript interfaces (Device definitions, Annotation types, Canvas state).
*   **/src/utils**: Helper utilities for math (geometry) and colors.

## 4. Key Conventions
*   **Communication**: Simple Message Passing. `App.tsx` sends commands (e.g., `REPLAY_SCROLL`) to `background.ts`, which broadcasts them to `content.ts` in target frames.
*   **Screenshots**: We use an **"Expand-and-Pan" strategy**. Instead of using the `debugger` API, we:
    1.  Temporarily resize the `DeviceFrame` to the full height of the page content.
    2.  Use `chrome.tabs.captureVisibleTab` to take photos of the canvas.
    3.  Pan the canvas to reveal different chunks.
    4.  Stitch the images together.
    *   *Note*: This requires a "Double-Measure" step (measure -> expand -> wait -> re-measure) to account for layout shifts caused by the resize.
*   **Annotations**: Annotations are vectors rendered in an SVG layer *above* the HTML iframes. Special care is taken with `pointer-events` to ensure users can interact with the app when not drawing.
*   **Isolation**: We use `declarativeNetRequest` to strip Cookies and modify `User-Agent` headers for specific device requests to ensure accurate mobile emulation.

## 5. Current Status
*   **Completed**:
    *   Core Canvas & Device Emulation.
    *   Event Synchronization.
    *   Annotation System (Draw, Text, Arrows, Resize, Multi-select).
    *   Robust Full-Page Screenshots (Fixes applied for "Target Not Found", Vertical Offsets, Repeating Toolbars, and Partial Captures).
    *   Extension Launch Optimization (Direct click-to-open).
*   **In Progress**: Maintenance and polish of existing features.
