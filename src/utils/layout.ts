import type { Device, CanvasState } from "../types";

const GAP = 50;
const HEADER_HEIGHT = 40;

export const arrangeDevices = (devices: Device[], type: 'horizontal' | 'vertical' | 'grid'): Device[] => {
    const updatedDevices = [...devices];

    // Reset positions
    let currentX = 0;
    let currentY = 0;
    let maxHeightInRow = 0;

    if (type === 'horizontal') {
        updatedDevices.forEach((device) => {
            device.x = currentX;
            device.y = 0; // Align tops
            currentX += device.width + GAP;
        });
    } else if (type === 'vertical') {
        updatedDevices.forEach((device) => {
            device.x = 0; // Align lefts
            device.y = currentY;
            currentY += device.height + HEADER_HEIGHT + GAP;
        });
    } else if (type === 'grid') {
        // Simple grid: Max width ~2000px, then wrap
        const MAX_ROW_WIDTH = 2500;

        updatedDevices.forEach((device) => {
            if (currentX + device.width > MAX_ROW_WIDTH && currentX > 0) {
                // Wrap to next row
                currentX = 0;
                currentY += maxHeightInRow + HEADER_HEIGHT + GAP;
                maxHeightInRow = 0;
            }

            device.x = currentX;
            device.y = currentY;

            currentX += device.width + GAP;
            maxHeightInRow = Math.max(maxHeightInRow, device.height);
        });
    }

    return updatedDevices;
};

export const getFitToViewTransform = (
    devices: Device[],
    containerWidth: number,
    containerHeight: number,
    padding = 50
): Pick<CanvasState, 'x' | 'y' | 'scale'> => {
    if (devices.length === 0) return { x: 0, y: 0, scale: 1 };

    // Calculate Bounding Box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    devices.forEach(d => {
        minX = Math.min(minX, d.x);
        minY = Math.min(minY, d.y);
        maxX = Math.max(maxX, d.x + d.width);
        maxY = Math.max(maxY, d.y + d.height + HEADER_HEIGHT);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Calculate required scale to fit
    const availableWidth = containerWidth - (padding * 2);
    const availableHeight = containerHeight - (padding * 2);

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const scale = Math.min(Math.min(scaleX, scaleY), 1); // Don't zoom in past 100%

    // Calculate center adjustment
    // Transform origin is 0,0.
    // We want the center of the scaled content to match the center of the container.
    // ScaledContentCenter = (minX + contentWidth/2) * scale, (minY + contentHeight/2) * scale
    // ContainerCenter = containerWidth/2, containerHeight/2

    // We want: translate + (Point * scale) = ScreenPoint
    // Target X position for left edge: (containerWidth - contentWidth * scale) / 2
    // But we also need to account for minX shifting.

    // Let's deduce:
    // We want the top-left of the bounding box (minX, minY) to end up at some screen coordinate (targetX, targetY).
    const targetX = (containerWidth - contentWidth * scale) / 2;
    const targetY = (containerHeight - contentHeight * scale) / 2;

    // translate + minX * scale = targetX
    // translate = targetX - minX * scale

    const x = targetX - (minX * scale);
    const y = targetY - (minY * scale);

    return { x, y, scale };
};
