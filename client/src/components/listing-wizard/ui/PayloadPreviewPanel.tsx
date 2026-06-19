import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { buildListingSubmitPayloadFromWizardState } from '@/lib/workflows/listing/listingPayload';
import { validateListingWorkflowPayload } from '@/lib/workflows/listing/listingWorkflowValidation';
import { calculateSubmitReadinessDryRun } from '@/lib/workflows/listing/listingSubmitReadiness';
import type { ListingWorkflowData } from '@shared/listing-workflow-types';
import type { ListingFieldError } from '@shared/listing-workflow-types';
import type { ListingSubmitPayload } from '@/lib/workflows/listing/listingPayload';
import type { SubmitReadinessResult } from '@/lib/workflows/listing/listingSubmitReadiness';

type TabId = 'payload' | 'validation' | 'dryrun' | 'readiness';

interface PanelState {
  expanded: boolean;
  tab: TabId;
}

export function PayloadPreviewPanel() {
  const store = useListingWizardStore();
  const [{ expanded, tab }, setPanel] = useState<PanelState>({ expanded: false, tab: 'payload' });
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: ListingFieldError[];
  } | null>(null);

  const wizardData = useMemo((): ListingWorkflowData => {
    return {
      action: store.action,
      propertyType: store.propertyType,
      title: store.title,
      description: store.description,
      pricing: store.pricing,
      propertyDetails: store.propertyDetails,
      location: store.location,
      media: store.media,
      basicInfo: store.basicInfo,
      additionalInfo: store.additionalInfo,
      mainMediaId: store.mainMediaId,
    };
  }, [
    store.action,
    store.propertyType,
    store.title,
    store.description,
    store.pricing,
    store.propertyDetails,
    store.location,
    store.media,
    store.basicInfo,
    store.additionalInfo,
    store.mainMediaId,
  ]);

  const payload = useMemo(() => {
    try {
      const stateForPayload: Record<string, any> = {
        action: store.action,
        propertyType: store.propertyType,
        title: store.title,
        description: store.description,
        pricing: store.pricing,
        propertyDetails: store.propertyDetails,
        additionalInfo: store.additionalInfo,
        basicInfo: store.basicInfo,
        location: store.location,
        media: store.media,
        mainMediaId: store.mainMediaId,
        badges: store.badges,
      };
      return buildListingSubmitPayloadFromWizardState(stateForPayload as any);
    } catch {
      return null;
    }
  }, [
    store.action,
    store.propertyType,
    store.title,
    store.description,
    store.pricing,
    store.propertyDetails,
    store.additionalInfo,
    store.basicInfo,
    store.location,
    store.media,
    store.mainMediaId,
    store.badges,
  ]);

  useEffect(() => {
    let cancelled = false;
    setValidation(null);
    validateListingWorkflowPayload(wizardData).then((result) => {
      if (!cancelled) {
        setValidation(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [wizardData]);

  const [dryRunResult, setDryRunResult] = useState<{
    timestamp: string;
    valid: boolean;
    errors: ListingFieldError[];
    payload: ListingSubmitPayload | null;
  } | null>(null);
  const [dryRunning, setDryRunning] = useState(false);

  const runDryRun = useCallback(async () => {
    setDryRunning(true);
    setDryRunResult(null);
    try {
      const stateForPayload: Record<string, any> = {
        action: store.action,
        propertyType: store.propertyType,
        title: store.title,
        description: store.description,
        pricing: store.pricing,
        propertyDetails: store.propertyDetails,
        additionalInfo: store.additionalInfo,
        basicInfo: store.basicInfo,
        location: store.location,
        media: store.media,
        mainMediaId: store.mainMediaId,
        badges: store.badges,
      };
      const builtPayload = buildListingSubmitPayloadFromWizardState(stateForPayload as any);
      const validationResult = await validateListingWorkflowPayload(wizardData);
      setDryRunResult({
        timestamp: new Date().toISOString(),
        valid: validationResult.valid,
        errors: validationResult.errors,
        payload: builtPayload,
      });
    } finally {
      setDryRunning(false);
    }
  }, [store, wizardData]);

  const missingAction = !store.action;

  const togglePanel = () => {
    setPanel((prev) => ({ expanded: !prev.expanded, tab: prev.tab }));
  };

  const switchTab = (t: TabId) => {
    setPanel((prev) => ({ ...prev, tab: t }));
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-2 left-2 z-50">
      {expanded ? (
        <div className="bg-slate-900/95 text-white rounded-lg shadow-2xl w-[480px] max-h-[70vh] flex flex-col font-mono text-xs">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
            <span className="text-cyan-400 font-bold text-sm">V2 Payload Preview</span>
            <div className="flex gap-2">
              <span className="text-slate-400">
                {store.action ?? '?'} / {store.propertyType ?? '?'}
              </span>
              <button
                onClick={togglePanel}
                className="text-slate-400 hover:text-white transition-colors text-sm"
                aria-label="Close preview panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => switchTab('payload')}
              className={`flex-1 px-3 py-1.5 text-center transition-colors ${
                tab === 'payload'
                  ? 'bg-slate-800 text-cyan-300 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Payload
            </button>
            <button
              onClick={() => switchTab('validation')}
              className={`flex-1 px-3 py-1.5 text-center transition-colors ${
                tab === 'validation'
                  ? 'bg-slate-800 text-cyan-300 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Validation
            </button>
            <button
              onClick={() => switchTab('readiness')}
              className={`flex-1 px-3 py-1.5 text-center transition-colors ${
                tab === 'readiness'
                  ? 'bg-slate-800 text-cyan-300 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Readiness
            </button>
            <button
              onClick={() => switchTab('dryrun')}
              className={`flex-1 px-3 py-1.5 text-center transition-colors ${
                tab === 'dryrun'
                  ? 'bg-slate-800 text-cyan-300 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dry Run
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-3">
            {tab === 'payload' && (
              <div>
                {payload ? (
                  <pre className="whitespace-pre-wrap break-all text-slate-300 leading-relaxed">
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                ) : (
                  <div className="text-yellow-400">
                    Payload builder returned null (prerequisites may be missing).
                  </div>
                )}
              </div>
            )}

            {tab === 'validation' && (
              <div>
                {validation === null ? (
                  <div className="text-slate-400">Validating...</div>
                ) : validation.valid ? (
                  <div className="text-emerald-400 font-semibold">
                    All checks passed ✓
                  </div>
                ) : (
                  <div>
                    <div className="text-red-400 font-semibold mb-2">
                      {validation.errors.length} issue{validation.errors.length !== 1 ? 's' : ''}
                    </div>
                    <ul className="space-y-1">
                      {validation.errors.map((err, i) => (
                        <li key={i} className="text-red-300">
                          <span className="text-slate-500">[{err.step}]</span>{' '}
                          <span className="text-yellow-300">{err.field}</span>
                          : {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === 'readiness' && (
            <ReadinessTabContent wizardData={wizardData} />
          )}

          {tab === 'dryrun' && (
              <div className="space-y-3">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider text-center border border-yellow-600/40 bg-yellow-600/10 rounded px-2 py-1">
                  ⚠ No backend called — dry run only
                </div>

                {!dryRunResult && !dryRunning && (
                  <button
                    onClick={runDryRun}
                    className="w-full py-2 px-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-bold transition-colors"
                  >
                    Run Dry Submit
                  </button>
                )}

                {dryRunning && (
                  <div className="text-slate-400 text-center py-4">Running dry submit…</div>
                )}

                {dryRunResult && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-sm font-bold ${
                          dryRunResult.valid ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {dryRunResult.valid ? '✓ PASS' : '✗ FAIL'}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(dryRunResult.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] mb-2">
                      <div className="bg-slate-800 rounded px-2 py-1">
                        <span className="text-slate-400">Errors</span>{' '}
                        <span className={dryRunResult.errors.length > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {dryRunResult.errors.length}
                        </span>
                      </div>
                      <div className="bg-slate-800 rounded px-2 py-1">
                        <span className="text-slate-400">Payload</span>{' '}
                        <span className="text-slate-200">
                          {dryRunResult.payload
                            ? new Blob([JSON.stringify(dryRunResult.payload)]).size
                            : 0}{' '}
                          bytes
                        </span>
                      </div>
                    </div>

                    {dryRunResult.errors.length > 0 && (
                      <div className="mb-2">
                        <div className="text-red-400 text-[10px] font-semibold mb-1">Errors</div>
                        <ul className="space-y-0.5">
                          {dryRunResult.errors.map((err, i) => (
                            <li key={i} className="text-red-300 text-[10px]">
                              [{err.step}] {err.field}: {err.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {dryRunResult.payload && (
                      <div>
                        <div className="text-slate-400 text-[10px] font-semibold mb-1">
                          Payload Summary
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                          <div className="text-slate-500">action</div>
                          <div className="text-slate-200">{dryRunResult.payload.action}</div>
                          <div className="text-slate-500">propertyType</div>
                          <div className="text-slate-200">{dryRunResult.payload.propertyType}</div>
                          <div className="text-slate-500">title</div>
                          <div className="text-slate-200 truncate">{dryRunResult.payload.title}</div>
                          <div className="text-slate-500">mediaIds</div>
                          <div className="text-slate-200">{dryRunResult.payload.mediaIds.length}</div>
                          <div className="text-slate-500">mainMediaId</div>
                          <div className="text-slate-200">{dryRunResult.payload.mainMediaId ?? '—'}</div>
                          <div className="text-slate-500">propertyDetails</div>
                          <div className="text-slate-200">
                            {Object.keys(dryRunResult.payload.propertyDetails).length} keys
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={runDryRun}
                      className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                    >
                      Re-run
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer status */}
          <div className="px-3 py-1.5 border-t border-slate-700 text-slate-500 flex justify-between">
            <span>
              Action: {missingAction ? <span className="text-red-400">not set</span> : store.action}
            </span>
            <span>
              Payload size: {payload ? new Blob([JSON.stringify(payload)]).size : 0} bytes
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={togglePanel}
          className="bg-slate-900/80 hover:bg-slate-900 text-white rounded px-2.5 py-1 text-[10px] font-mono font-bold opacity-60 hover:opacity-100 transition-all tracking-wider uppercase shadow-lg"
          aria-label="Open payload preview panel"
        >
          Payload
        </button>
      )}
    </div>
  );
}

function ReadinessTabContent({ wizardData }: { wizardData: ListingWorkflowData }) {
  const [result, setResult] = useState<SubmitReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await calculateSubmitReadinessDryRun(wizardData);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }, [wizardData]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div className="space-y-3">
      <div className="text-slate-400 text-[10px] uppercase tracking-wider text-center border border-yellow-600/40 bg-yellow-600/10 rounded px-2 py-1">
        ⚠ No backend called — dry run only
      </div>

      {loading && (
        <div className="text-slate-400 text-center py-4">Running readiness check…</div>
      )}

      {result && (
        <div>
          {/* READY / BLOCKED badge */}
          <div
            className={`text-sm font-bold mb-2 px-2 py-1 rounded text-center ${
              result.ready
                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                : 'bg-red-900/40 text-red-400 border border-red-700/50'
            }`}
          >
            {result.ready ? '✓ READY — can submit' : '✗ BLOCKED — resolve issues below'}
          </div>

          {/* Blocking reasons */}
          {result.blockingReasons.length > 0 && (
            <div className="mb-2">
              <div className="text-red-400 text-[10px] font-semibold mb-1">Blocking Reasons</div>
              <ul className="space-y-0.5">
                {result.blockingReasons.map((reason, i) => (
                  <li key={i} className="text-red-300 text-[10px]">
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Scores grid */}
          <div className="grid grid-cols-2 gap-1 text-[10px] mb-2">
            <div className="bg-slate-800 rounded px-2 py-1">
              <span className="text-slate-400">Readiness</span>{' '}
              <span
                className={
                  result.readiness.score >= 80
                    ? 'text-emerald-400'
                    : result.readiness.score >= 50
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }
              >
                {result.readiness.score}%
              </span>
            </div>
            <div className="bg-slate-800 rounded px-2 py-1">
              <span className="text-slate-400">Quality</span>{' '}
              <span
                className={
                  result.quality.tier === 'featured'
                    ? 'text-emerald-400'
                    : result.quality.tier === 'optimized'
                      ? 'text-blue-400'
                      : result.quality.tier === 'basic'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                }
              >
                {result.quality.score}% ({result.quality.tier})
              </span>
            </div>
            <div className="bg-slate-800 rounded px-2 py-1">
              <span className="text-slate-400">Validation</span>{' '}
              <span
                className={
                  result.validation.valid ? 'text-emerald-400' : 'text-red-400'
                }
              >
                {result.validation.valid ? '0 errors' : `${result.validation.errorCount} error(s)`}
              </span>
            </div>
            <div className="bg-slate-800 rounded px-2 py-1">
              <span className="text-slate-400">Payload</span>{' '}
              <span className="text-slate-200">{result.payload.sizeBytes} bytes</span>
            </div>
          </div>

          {/* Payload summary */}
          {result.payload.built && (
            <div className="mb-2">
              <div className="text-slate-400 text-[10px] font-semibold mb-1">Payload Summary</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                <div className="text-slate-500">action</div>
                <div className="text-slate-200">{result.payload.action ?? '—'}</div>
                <div className="text-slate-500">propertyType</div>
                <div className="text-slate-200">{result.payload.propertyType ?? '—'}</div>
                <div className="text-slate-500">title</div>
                <div className="text-slate-200 truncate">{result.payload.title ?? '—'}</div>
                <div className="text-slate-500">media</div>
                <div className="text-slate-200">{result.payload.mediaCount} file(s)</div>
                <div className="text-slate-500">mainMedia</div>
                <div className="text-slate-200">
                  {result.payload.mainMediaPresent ? '✓ set' : '✗ missing'}
                </div>
                <div className="text-slate-500">propertyDetails</div>
                <div className="text-slate-200">{result.payload.propertyDetailsKeys} keys</div>
              </div>
            </div>
          )}

          {/* Readiness missing sections */}
          {Object.values(result.readiness.missing).some((v) => v.length > 0) && (
            <div className="mb-2">
              <div className="text-yellow-400 text-[10px] font-semibold mb-1">Readiness Gaps</div>
              {Object.entries(result.readiness.missing)
                .filter(([_, items]) => items.length > 0)
                .map(([section, items]) => (
                  <div key={section} className="mb-1">
                    <div className="text-slate-500 text-[10px] capitalize">{section}</div>
                    <ul className="space-y-0.5">
                      {items.map((item, i) => (
                        <li key={i} className="text-yellow-300 text-[10px] pl-2">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}

          {/* Quality tips */}
          {result.quality.tips.length > 0 && (
            <div className="mb-2">
              <div className="text-blue-400 text-[10px] font-semibold mb-1">Quality Tips</div>
              <ul className="space-y-0.5">
                {result.quality.tips.map((tip, i) => (
                  <li key={i} className="text-blue-300 text-[10px]">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Re-run */}
          <button
            onClick={run}
            className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
          >
            Re-run
          </button>
        </div>
      )}
    </div>
  );
}
