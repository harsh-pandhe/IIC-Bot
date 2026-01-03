// components/SkeletonLoader.tsx
export const SkeletonLoader = () => {
    return (
        <div className="animate-pulse space-y-3">
            <div className="flex gap-3">
                <div className="w-8 h-8 bg-slate-700/50 rounded-full"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-700/50 rounded w-1/2"></div>
                </div>
            </div>
            <div className="flex gap-2 ml-11">
                <div className="h-6 bg-slate-700/30 rounded-lg w-20"></div>
                <div className="h-6 bg-slate-700/30 rounded-lg w-24"></div>
            </div>
        </div>
    );
};
