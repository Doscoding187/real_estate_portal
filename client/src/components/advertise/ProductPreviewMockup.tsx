import React from 'react';

export function ProductPreviewMockup() {
  return (
    <div className="relative rounded-xl bg-slate-900 border border-slate-800 p-2 shadow-2xl overflow-hidden aspect-video max-w-4xl mx-auto">
      {/* Fake Browser Window Controls */}
      <div className="absolute top-0 left-0 w-full h-10 bg-slate-800/80 backdrop-blur flex items-center px-4 space-x-2 border-b border-slate-700">
        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
        <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        <div className="mx-auto w-1/3 h-5 bg-slate-700/50 rounded flex items-center justify-center">
          <div className="h-2 w-24 bg-slate-600 rounded"></div>
        </div>
      </div>
      
      {/* Fake Dashboard Content */}
      <div className="mt-10 bg-slate-950 rounded-b-lg p-6 h-[calc(100%-2.5rem)] flex flex-col gap-6">
        {/* Fake Header */}
        <div className="flex justify-between items-center">
          <div className="h-6 w-48 bg-slate-800 rounded"></div>
          <div className="h-8 w-8 bg-slate-800 rounded-full"></div>
        </div>
        
        {/* Fake Top Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-slate-800/50 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
            <div className="h-4 w-20 bg-slate-700 rounded"></div>
            <div className="h-8 w-16 bg-slate-600 rounded"></div>
          </div>
          <div className="h-24 bg-slate-800/50 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
            <div className="h-4 w-24 bg-slate-700 rounded"></div>
            <div className="h-8 w-20 bg-slate-600 rounded"></div>
          </div>
          <div className="h-24 bg-slate-800/50 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
            <div className="h-4 w-16 bg-slate-700 rounded"></div>
            <div className="h-8 w-12 bg-slate-600 rounded"></div>
          </div>
        </div>

        {/* Fake Main Chart Area */}
        <div className="flex-1 bg-slate-800/30 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
          <div className="h-4 w-32 bg-slate-700 rounded"></div>
          <div className="flex-1 flex items-end gap-2 px-2 pb-2 border-b border-l border-slate-700">
            {/* Fake Bars */}
            {[40, 70, 45, 90, 65, 80, 55, 100, 85, 60, 75, 50].map((h, i) => (
              <div 
                key={i}
                className="flex-1 bg-primary/40 rounded-t-sm"
                style={{ height: `${h}%` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
