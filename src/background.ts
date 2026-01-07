console.log('SiteDevice background script running');

// Setup DeclarativeNetRequest rules to strip X-Frame-Options
chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: [
            {
                "id": 1,
                "priority": 1,
                "action": {
                    "type": "modifyHeaders",
                    "responseHeaders": [
                        { "header": "x-frame-options", "operation": "remove" },
                        { "header": "content-security-policy", "operation": "remove" } // Use with caution; might refine to frame-ancestors only
                    ]
                },
                "condition": {
                    "urlFilter": "|http*",
                    "resourceTypes": ["sub_frame"]
                }
            }
        ]
    });
});
// Open index.html in a new tab when the action icon is clicked
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: 'index.html' });
});



chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!sender.tab) return;

    if (msg.type === 'CHECK_IS_MANAGED') {
        const topUrl = sender.tab.url || '';
        // If the top-level tab URL is our extension dashboard, then this frame is managed
        const isManaged = topUrl.startsWith(chrome.runtime.getURL(''));
        sendResponse({ isManaged });
        return;
    }

    if (msg.type.startsWith('EVENT_') || msg.type.startsWith('CMD_NAV_')) {
        // Broadcast to all frames in the SAME tab, except the sender frame
        let replayType = msg.type;
        if (msg.type.startsWith('EVENT_')) {
            replayType = msg.type.replace('EVENT_', 'REPLAY_');
        }

        // 1. Broadcast to extension pages (The Tldraw App)
        chrome.runtime.sendMessage({
            type: replayType,
            payload: msg.payload
        }).catch(() => { });

        // 2. Broadcast to peer frames (Other devices)
        chrome.webNavigation.getAllFrames({ tabId: sender.tab.id! }, (frames) => {
            frames?.forEach(frame => {
                // Skip the sender frame
                if (frame.frameId === sender.frameId) return;

                // Send message to this frame
                chrome.tabs.sendMessage(sender.tab!.id!, {
                    type: replayType,
                    payload: msg.payload
                }, { frameId: frame.frameId });
            });
        });
    } else if (msg.type === 'UPDATE_UA_RULES') {
        const devices = msg.devices;

        // 1. Calculate new rules
        const newRules: chrome.declarativeNetRequest.Rule[] = devices.map((device: any, index: number) => {
            return {
                id: 1000 + index,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        {
                            header: "User-Agent",
                            operation: "set",
                            value: device.userAgent
                        },
                        // If isolation is enabled, strip cookies at the network level
                        ...(device.isolation ? [{
                            header: "Cookie",
                            operation: "remove" as chrome.declarativeNetRequest.HeaderOperation
                        }] : []),
                        // Client Hints
                        {
                            header: "Sec-CH-UA-Mobile",
                            operation: "set",
                            value: (device.userAgent.includes('Mobile') || device.userAgent.includes('Android')) ? "?1" : "?0"
                        },
                        {
                            header: "Sec-CH-UA-Platform",
                            operation: "set",
                            value: (function () {
                                if (device.userAgent.includes('Android')) return '"Android"';
                                if (device.userAgent.includes('iPhone') || device.userAgent.includes('iPad')) return '"iOS"';
                                if (device.userAgent.includes('Mac')) return '"macOS"';
                                return '"Windows"';
                            })()
                        },
                        {
                            header: "Sec-CH-UA",
                            operation: "set",
                            // Minimal brand list to satisfy basic checks
                            value: (device.userAgent.includes('Android') || device.userAgent.includes('Mobile'))
                                ? '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"'
                                : '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"'
                        }
                    ]
                },
                condition: {
                    // Encode the ID to match the URL encoding (e.g. shape:123 -> shape%3A123)
                    urlFilter: `*__sd_id=${encodeURIComponent(device.id)}*`,
                    resourceTypes: [
                        "main_frame",
                        "sub_frame",
                        "xmlhttprequest"
                    ]
                }
            };
        });

        // 2. Fetch existing rules to enable robust cleanup (handling SW restarts)
        chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
            // Identify rules that belong to devices (IDs >= 1000)
            const removeRuleIds = existingRules
                .filter(r => r.id >= 1000)
                .map(r => r.id);

            // 3. Update Dynamic Rules
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: removeRuleIds,
                addRules: newRules
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("DNR Error:", chrome.runtime.lastError);
                } else {
                    console.log(`Updated UA Rules: Removed ${removeRuleIds.length}, Added ${newRules.length}`);
                }
            });
        });
    } else if (msg.type === 'CLEAR_DATA') {
        const { dataType, url } = msg;

        try {
            const origin = new URL(url).origin;
            let dataToRemove = {};

            if (dataType === 'cache') {
                // Note: Standard HTTP Cache cannot be cleared by origin. 
                // We clear Cache Storage (Service Worker cache) and Service Workers.
                dataToRemove = {
                    "cacheStorage": true,
                    "serviceWorkers": true
                };
            } else if (dataType === 'storage') {
                dataToRemove = {
                    "localStorage": true,
                    "indexedDB": true,
                    "fileSystems": true,
                    "webSQL": true
                };
            } else if (dataType === 'cookies') {
                dataToRemove = { "cookies": true };
            }

            chrome.browsingData.remove({
                "origins": [origin]
            }, dataToRemove, () => {
                const err = chrome.runtime.lastError;
                if (err) console.error("Clear Data Error:", err);
                sendResponse({ success: !err, error: err?.message });
            });

            return true; // Keep channel open
        } catch (e: any) {
            console.error("Invalid URL:", url);
            sendResponse({ success: false, error: e.message });
        }
    }
});
