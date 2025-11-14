import React from 'react';
import Button from './Button';

interface TableColumn {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: Record<string, any>, index: number) => React.ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  data: Record<string, any>[];
  onSort?: (key: string) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  onSort,
  sortKey,
  sortOrder,
}) => {
  const handleSort = (key: string) => {
    if (onSort) {
      onSort(key);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                <div className="flex items-center">
                  <span>{column.title}</span>
                  {column.sortable && onSort && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="ml-2"
                      onClick={() => handleSort(column.key)}
                    >
                      {sortKey === column.key ? (
                        sortOrder === 'asc' ? '↑' : '↓'
                      ) : (
                        '↕'
                      )}
                    </Button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {column.render ? column.render(row[column.key], row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;