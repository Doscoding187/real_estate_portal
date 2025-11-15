import React, { useState } from 'react';
import { ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';

interface TableColumn {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (
    value: any,
    record: Record<string, React.ReactNode>,
    index: number
  ) => React.ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  data: Record<string, React.ReactNode>[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  emptyMessage?: string;
  loading?: boolean;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  onSort,
  emptyMessage = 'No data available',
  loading = false,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (key: string) => {
    if (!onSort) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    onSort(key, direction);
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-slate-200 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded my-2"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">
            {emptyMessage}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            No data to display at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-slate-100' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.title}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50">
                {columns.map(column => {
                  const columnDef = columns.find(col => col.key === column.key);
                  return (
                    <td
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"
                    >
                      {columnDef?.render
                        ? columnDef.render(row[column.key], row, rowIndex)
                        : row[column.key]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
