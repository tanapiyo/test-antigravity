import React from 'react';

interface BuildMenuProps {
    isBuildMode: boolean;
    onToggleBuildMode: () => void;
    selectedObject: 'desk' | 'chair' | 'plant' | null;
    onSelectObject: (type: 'desk' | 'chair' | 'plant' | null) => void;
}

const BuildMenu: React.FC<BuildMenuProps> = ({ isBuildMode, onToggleBuildMode, selectedObject, onSelectObject }) => {
    return (
        <div className="absolute top-6 right-6 pointer-events-auto">
            <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl ring-1 ring-white/5 flex flex-col items-center space-y-4">
                <button
                    onClick={onToggleBuildMode}
                    className={`p-3 rounded-xl transition-all duration-300 ${isBuildMode
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                    title="Toggle Build Mode"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </button>

                {isBuildMode && (
                    <div className="flex flex-col space-y-2 animate-in fade-in slide-in-from-top-4 duration-200">
                        <button
                            onClick={() => onSelectObject('desk')}
                            className={`p-3 rounded-xl transition-all ${selectedObject === 'desk'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            title="Desk"
                        >
                            🪑
                        </button>
                        <button
                            onClick={() => onSelectObject('chair')}
                            className={`p-3 rounded-xl transition-all ${selectedObject === 'chair'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            title="Chair"
                        >
                            🛋️
                        </button>
                        <button
                            onClick={() => onSelectObject('plant')}
                            className={`p-3 rounded-xl transition-all ${selectedObject === 'plant'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                            title="Plant"
                        >
                            🪴
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BuildMenu;
