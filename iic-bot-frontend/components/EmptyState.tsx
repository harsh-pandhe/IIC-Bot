// components/EmptyState.tsx
import React from 'react';

export const EmptyState = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-24 h-24 mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">
                No Messages Yet
            </h3>

            <p className="text-slate-400 mb-6 max-w-md">
                Start a conversation by asking a question about IIC policies, procedures, or team responsibilities.
            </p>

            <div className="flex gap-2 text-sm text-slate-500">
                <div className="px-3 py-1.5 rounded-lg bg-slate-800/30 border border-slate-700/30">
                    💡 Try: "What are the president's duties?"
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-800/30 border border-slate-700/30">
                    🎯 Or: "Event planning process"
                </div>
            </div>
        </div>
    );
};
