/**
 * Preview Summary Component
 *
 * Displays a comprehensive summary of all entered information with edit buttons
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface SummarySection {
  /**
   * Section title
   */
  title: string;

  /**
   * Step number to navigate to when edit is clicked
   */
  stepNumber: number;

  /**
   * Icon component for the section
   */
  icon?: React.ReactNode;

  /**
   * Array of field items to display
   */
  items: SummaryItem[];

  /**
   * Whether this section is complete
   */
  isComplete?: boolean;

  /**
   * Warning message for incomplete optional fields
   */
  warning?: string;
}

export interface SummaryItem {
  /**
   * Field label
   */
  label: string;

  /**
   * Field value (can be string, number, or React node)
   */
  value: React.ReactNode;

  /**
   * Whether this field is empty/missing
   */
  isEmpty?: boolean;

  /**
   * Whether this is a required field
   */
  isRequired?: boolean;
}

export interface PreviewSummaryProps {
  /**
   * Array of sections to display
   */
  sections: SummarySection[];

  /**
   * Callback when edit button is clicked
   */
  onEdit: (stepNumber: number) => void;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Title for the summary
   */
  title?: string;

  /**
   * Description text
   */
  description?: string;
}

export const PreviewSummary: React.FC<PreviewSummaryProps> = ({
  sections,
  onEdit,
  className,
  title = 'Review Your Information',
  description = 'Please review all the information below before submitting. Click Edit to make changes to any section.',
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {section.icon && (
                      <div className="flex-shrink-0 text-blue-600">{section.icon}</div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      {section.isComplete !== undefined && (
                        <div className="flex items-center gap-2 mt-1">
                          {section.isComplete ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Incomplete
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(section.stepNumber)}
                    className="gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {/* Warning for incomplete section */}
                {section.warning && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">{section.warning}</p>
                  </div>
                )}

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className={cn('space-y-1', item.isEmpty && 'opacity-50')}>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-700">{item.label}</p>
                        {item.isRequired && item.isEmpty && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-900">
                        {item.isEmpty ? (
                          <span className="text-gray-400 italic">Not provided</span>
                        ) : (
                          item.value
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Completion Status</p>
              <p className="text-xs text-blue-700 mt-1">
                {sections.filter(s => s.isComplete).length} of {sections.length} sections complete
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">
                {Math.round((sections.filter(s => s.isComplete).length / sections.length) * 100)}%
              </p>
              <p className="text-xs text-blue-700">Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Helper function to format currency
 */
export const formatCurrency = (amount: number | string | undefined): string => {
  if (!amount) return 'Not specified';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Helper function to format date
 */
export const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'Not specified';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

/**
 * Helper function to format array as comma-separated list
 */
export const formatList = (items: string[] | undefined): string => {
  if (!items || items.length === 0) return 'None';
  return items.join(', ');
};
