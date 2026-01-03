// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

interface Shortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    callback: () => void;
}

export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const shortcut = shortcuts.find(s =>
                s.key.toLowerCase() === event.key.toLowerCase() &&
                (s.ctrlKey === undefined || s.ctrlKey === event.ctrlKey) &&
                (s.shiftKey === undefined || s.shiftKey === event.shiftKey) &&
                (s.altKey === undefined || s.altKey === event.altKey)
            );

            if (shortcut) {
                event.preventDefault();
                shortcut.callback();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
};
