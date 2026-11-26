import React, { useState } from 'react';
import {
  GROWTH_METRICS,
  formatWeekLabel,
  weekOverWeek,
  type GrowthMetric,
  type WeeklyPoint,
} from './inboxModel';

/** One axis, one series at a time, fixed colour per metric, honest zeros. */
const GrowthChart: React.FC<{ points: WeeklyPoint[] }> = ({ points }) => {
  const [metric, setMetric] = useState<GrowthMetric>('signups');
  const [hover, setHover] = useState<number>(-1);
  const [asTable, setAsTable] = useState(false);
  const def = GROWTH_METRICS.find(m => m.id === metric)!;
  const values = points.map(p => p[metric]);
  const max = Math.max(1, ...values);
  const latest = values[values.length - 1] ?? 0;
  const change = weekOverWeek(values);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Chart metric (legend)">
        {GROWTH_METRICS.map(m => (
          <button
            key={m.id}
            type="button"
            aria-pressed={m.id === metric}
            onClick={() => setMetric(m.id)}
            className={`inline-flex items-center gap-2 min-h-[32px] px-2.5 rounded-md border text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              m.id === metric
                ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-sm"
              style={{ background: m.color }}
            />
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex items-baseline gap-2 mt-4 mb-2">
        <span className="text-2xl font-bold text-slate-900">{latest}</span>
        <span className="text-xs text-slate-600">this week</span>
        {change ? <span className="text-xs font-semibold text-slate-700">{change}</span> : null}
      </div>
      <div
        role="group"
        aria-label={`${def.label} per week for the last ${points.length} weeks, latest ${latest}`}
        className="flex items-end gap-2 h-36 px-1 border-b border-slate-300"
      >
        {points.map((p, i) => (
          <div
            key={p.weekStart}
            tabIndex={0}
            role="img"
            aria-label={`Week of ${formatWeekLabel(p.weekStart)}: ${p[metric]} ${def.noun}`}
            className="relative flex-1 h-full flex flex-col justify-end items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(-1)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(-1)}
          >
            {hover === i ? (
              <span className="absolute bottom-full mb-1 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white">
                {formatWeekLabel(p.weekStart)}: {p[metric]} {def.noun}
              </span>
            ) : null}
            <div
              style={{
                height: `${Math.round((p[metric] / max) * 100)}%`,
                background: def.color,
                opacity: hover === -1 || hover === i ? 1 : 0.35,
              }}
              className="w-3/4 max-w-[36px] rounded-t"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-1 pt-1">
        {points.map(p => (
          <div key={p.weekStart} className="flex-1 text-center text-[11px] text-slate-600">
            {formatWeekLabel(p.weekStart)}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setAsTable(v => !v)}
        className="mt-2 text-xs text-blue-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        {asTable ? 'Hide table' : 'Show as table'}
      </button>
      {asTable ? (
        <table className="w-full text-xs mt-2">
          <thead>
            <tr>
              <th scope="col" className="text-left p-1.5 border-b border-slate-200">
                Week starting
              </th>
              <th scope="col" className="text-right p-1.5 border-b border-slate-200">
                {def.label}
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map(p => (
              <tr key={p.weekStart}>
                <td className="p-1.5 border-b border-slate-100">{formatWeekLabel(p.weekStart)}</td>
                <td className="p-1.5 text-right border-b border-slate-100">{p[metric]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
};

export default GrowthChart;
