import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ValueQualificationLayerProps {
  qualifications: string[];
  disqualifications: string[];
}

export function ValueQualificationLayer({
  qualifications,
  disqualifications,
}: ValueQualificationLayerProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto my-16">
      <div className="bg-emerald-50/50 rounded-2xl p-8 lg:p-10 border border-emerald-100 shadow-sm">
        <h3 className="text-2xl font-semibold text-emerald-950 mb-6 flex items-center">
          <CheckCircle2 className="w-7 h-7 mr-3 text-emerald-600" />
          Who should use this
        </h3>
        <ul className="space-y-4">
          {qualifications.map((q, i) => (
            <li key={i} className="flex items-start text-emerald-800 text-lg">
              <span className="text-emerald-500 mr-3 mt-1 font-bold">•</span>
              <span className="leading-relaxed">{q}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-rose-50/50 rounded-2xl p-8 lg:p-10 border border-rose-100 shadow-sm">
        <h3 className="text-2xl font-semibold text-rose-950 mb-6 flex items-center">
          <XCircle className="w-7 h-7 mr-3 text-rose-600" />
          Who this is NOT for
        </h3>
        <ul className="space-y-4">
          {disqualifications.map((q, i) => (
            <li key={i} className="flex items-start text-rose-800 text-lg">
              <span className="text-rose-500 mr-3 mt-1 font-bold">•</span>
              <span className="leading-relaxed">{q}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
