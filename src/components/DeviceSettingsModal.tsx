import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DeviceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    deviceProps: any;
    onSave: (newProps: any) => void;
}

export const DeviceSettingsModal = ({ isOpen, onClose, deviceProps, onSave }: DeviceSettingsModalProps) => {
    const [formData, setFormData] = useState(deviceProps);

    useEffect(() => {
        setFormData(deviceProps);
    }, [deviceProps]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: name === 'w' || name === 'h' || name === 'pixelRatio' ? Number(value) : value
        }));
    };

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-96 max-w-full m-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">Device Settings</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md text-sm text-zinc-900"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Width</label>
                            <input
                                type="number"
                                name="w"
                                value={formData.w || 0}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md text-sm text-zinc-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Height</label>
                            <input
                                type="number"
                                name="h"
                                value={formData.h || 0}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md text-sm text-zinc-900"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Device Type</label>
                        <select
                            name="deviceType"
                            value={formData.deviceType || 'mobile'}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md text-sm text-zinc-900"
                        >
                            <option value="mobile">Mobile</option>
                            <option value="tablet">Tablet</option>
                            <option value="desktop">Desktop</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">User Agent</label>
                        <input
                            type="text"
                            name="userAgent"
                            value={formData.userAgent || ''}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md text-sm text-zinc-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Pixel Ratio</label>
                        <input
                            type="number"
                            name="pixelRatio"
                            value={formData.pixelRatio || 1}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md text-sm text-zinc-900"
                        />
                    </div>
                </div>
                <div className="p-4 border-t bg-zinc-50 flex justify-end gap-2 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
                </div>
            </div>
        </div>
    );
};
