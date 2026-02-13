import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
    name: 'SiteDevice',
    description: 'View websites at different sizes simultaneously',
    version: '1.0.5',
    manifest_version: 3,
    permissions: [
        'declarativeNetRequest',
        'declarativeNetRequestWithHostAccess',
        'storage',
        'tabs',
        'activeTab',
        'browsingData',
        'webNavigation',
        'scripting',
        'debugger'
    ],
    host_permissions: ['<all_urls>'],
    action: {
        // default_popup: 'src/popup.html',
    },
    options_ui: {
        page: 'index.html',
        open_in_tab: true,
    },
    background: {
        service_worker: 'src/background.ts',
        type: 'module',
    },
    content_scripts: [
        {
            matches: ['<all_urls>'],
            js: ['src/content.ts'],
            run_at: 'document_start',
            all_frames: true,
        },
    ],
    web_accessible_resources: [
        {
            resources: ['src/inject.js'],
            matches: ['<all_urls>'],
        },
        {
            resources: ['*.png', '*.svg'],
            matches: ['<all_urls>']
        }
    ]
})
