import { useEffect, useMemo, useState } from 'react';
import {
  MAX_SHORTLIST_OPTIONS,
  publicShortlistStorageKey,
  readSavedSelections,
  shortlistStorageKey,
  type ShortlistOption,
  type ShortlistSelection,
} from './distributionShortlistStorage';

export function useDistributionShortlist({
  marketMode,
  searchSummary,
  storageScope,
  currentOpportunities,
}: {
  marketMode: 'sale' | 'rent';
  searchSummary: string;
  storageScope: string;
  currentOpportunities: ShortlistOption[];
}) {
  const storageKey = shortlistStorageKey(storageScope, marketMode);
  const publicStorageKey = publicShortlistStorageKey(marketMode);
  const [selectedById, setSelectedById] = useState<Record<string, ShortlistSelection>>(
    () => readSavedSelections(storageKey),
  );
  const [publicSelectionCount, setPublicSelectionCount] = useState(() =>
    storageScope.startsWith('partner:')
      ? Object.keys(readSavedSelections(publicStorageKey)).length
      : 0,
  );
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    try {
      if (Object.keys(selectedById).length) {
        window.localStorage.setItem(storageKey, JSON.stringify(selectedById));
        window.sessionStorage.removeItem(storageKey);
      } else {
        window.localStorage.removeItem(storageKey);
        window.sessionStorage.removeItem(storageKey);
      }
    } catch {
      try {
        if (Object.keys(selectedById).length) {
          window.sessionStorage.setItem(storageKey, JSON.stringify(selectedById));
        } else {
          window.sessionStorage.removeItem(storageKey);
        }
      } catch {
        // Keep the shortlist usable when browser storage is unavailable.
      }
    }
  }, [selectedById, storageKey]);

  const currentOptionsById = useMemo(
    () => new Map(currentOpportunities.map(option => [String(option.id), option])),
    [currentOpportunities],
  );
  const selectedOptions = Object.entries(selectedById).flatMap(([id, selection]) => {
    const currentOption = currentOptionsById.get(id);
    if (!currentOption || currentOption.marketable === false) return [];
    return [{ id, option: currentOption, searchSummary: selection.searchSummary }];
  });
  const selectedIds = new Set(selectedOptions.map(selection => selection.id));
  const selectedSearchSummaries = [...new Set(
    selectedOptions.map(selection => selection.searchSummary).filter(Boolean),
  )];

  useEffect(() => {
    setSelectedById(current => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([id]) => {
          const option = currentOptionsById.get(id);
          return Boolean(option && option.marketable !== false);
        }),
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [currentOptionsById]);

  const toggleOption = (option: ShortlistOption) => {
    const id = String(option.id);
    setSelectedById(current => {
      if (current[id]) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      if (Object.keys(current).length >= MAX_SHORTLIST_OPTIONS) return current;
      return { ...current, [id]: { searchSummary } };
    });
  };

  const removeOption = (id: string) => {
    setSelectedById(current => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const importPublicShortlist = () => {
    const publicSelections = readSavedSelections(publicStorageKey);
    const next = Object.fromEntries(
      Object.entries(selectedById).filter(([id]) => {
        const option = currentOptionsById.get(id);
        return Boolean(option && option.marketable !== false);
      }),
    ) as Record<string, ShortlistSelection>;
    let importedCount = 0;

    for (const [id, selection] of Object.entries(publicSelections)) {
      if (next[id] || Object.keys(next).length >= MAX_SHORTLIST_OPTIONS) continue;
      const option = currentOptionsById.get(id);
      if (!option || option.marketable === false) continue;
      next[id] = selection;
      importedCount += 1;
    }

    setSelectedById(next);
    setPublicSelectionCount(Object.keys(publicSelections).length);
    setImportMessage(
      importedCount
        ? `Added ${importedCount} currently available option${importedCount === 1 ? '' : 's'} to your partner shortlist.`
        : 'No additional public options could be added. They may already be selected, unavailable to your account, or the five-option limit may be reached.',
    );
  };

  return {
    maxOptions: MAX_SHORTLIST_OPTIONS,
    selectedById,
    selectedOptions,
    selectedIds,
    selectedSearchSummaries,
    toggleOption,
    removeOption,
    publicSelectionCount,
    importMessage,
    importPublicShortlist,
  };
}
