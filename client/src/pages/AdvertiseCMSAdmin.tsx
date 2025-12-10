/**
 * Advertise CMS Admin Panel
 * 
 * Simple admin interface for managing Advertise With Us page content.
 * This is a basic implementation that can be extended with more features.
 */

import React, { useState } from 'react';
import { useAdvertiseCMS } from '@/hooks/useAdvertiseCMS';
import { validatePageContent, getValidationSummary } from '@/services/cms/contentValidator';
import { AlertCircle, CheckCircle, RefreshCw, Save } from 'lucide-react';

export function AdvertiseCMSAdmin() {
  const { content, isLoading, error, refetch, updateContent, lastModified } = useAdvertiseCMS();
  const [editedContent, setEditedContent] = useState<string>('');
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize edited content when content loads
  React.useEffect(() => {
    if (content && !editedContent) {
      setEditedContent(JSON.stringify(content, null, 2));
    }
  }, [content, editedContent]);

  const handleValidate = () => {
    try {
      const parsed = JSON.parse(editedContent);
      const result = validatePageContent(parsed);
      const summary = getValidationSummary(result);
      setValidationMessage(summary);
    } catch (err) {
      setValidationMessage(`JSON Parse Error: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setValidationMessage('');

      const parsed = JSON.parse(editedContent);
      
      // Validate before saving
      const result = validatePageContent(parsed);
      if (!result.isValid) {
        const summary = getValidationSummary(result);
        setValidationMessage(summary);
        return;
      }

      await updateContent(parsed);
      setSaveSuccess(true);
      setValidationMessage('✓ Content saved successfully!');
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setValidationMessage(`Error: ${err instanceof Error ? err.message : 'Failed to save'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    await refetch();
    if (content) {
      setEditedContent(JSON.stringify(content, null, 2));
      setValidationMessage('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading CMS content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Error Loading Content</h2>
          <p className="text-gray-600 text-center">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Advertise CMS Admin</h1>
              {lastModified && (
                <p className="text-sm text-gray-500 mt-1">
                  Last modified: {new Date(lastModified).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={handleValidate}
                className="inline-flex items-center px-4 py-2 border border-primary rounded-lg text-sm font-medium text-primary bg-white hover:bg-primary/5 transition-colors"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Validate
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Content Editor</h2>
              <p className="text-sm text-gray-600 mt-1">
                Edit the JSON content below. Use Validate to check for errors before saving.
              </p>
            </div>
            <div className="p-4">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-[600px] font-mono text-sm p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Validation & Preview */}
          <div className="space-y-6">
            {/* Validation Results */}
            {validationMessage && (
              <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
                validationMessage.includes('✓') ? 'border-green-200' : 'border-red-200'
              }`}>
                <div className={`px-4 py-3 border-b ${
                  validationMessage.includes('✓') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    {validationMessage.includes('✓') ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-900">Validation Passed</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-900">Validation Issues</span>
                      </>
                    )}
                  </h2>
                </div>
                <div className="p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono text-gray-700">
                    {validationMessage}
                  </pre>
                </div>
              </div>
            )}

            {/* Quick Reference */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Validation Rules</h2>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Headlines</h3>
                  <p className="text-sm text-gray-600">50-70 characters</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Subheadlines</h3>
                  <p className="text-sm text-gray-600">100-150 characters</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Feature Descriptions</h3>
                  <p className="text-sm text-gray-600">80-120 characters</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">FAQ Answers</h3>
                  <p className="text-sm text-gray-600">150-300 characters</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h3 className="font-medium text-blue-900 mb-2">💡 Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Always validate before saving</li>
                <li>• Content is stored in browser localStorage</li>
                <li>• Refresh to reload from storage</li>
                <li>• Check validation warnings for optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdvertiseCMSAdmin;
