import React, { useState, useEffect } from 'react';

interface TableProps {
  data: Array<{ [key: string]: any }>;
  columns: Array<{ header: string; accessor: string }>;
}

const Table: React.FC<TableProps> = ({ data, columns }) => {
  const [sortedData, setSortedData] = useState(data);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  useEffect(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    setSortedData(sortableItems);
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <table className="table" role="table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.accessor}
              onClick={() => requestSort(column.accessor)}
              className={sortConfig?.key === column.accessor ? sortConfig.direction : undefined}
              role="columnheader"
              aria-sort={sortConfig?.key === column.accessor ? sortConfig.direction : 'none'}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((item, index) => (
          <tr key={index} role="row">
            {columns.map((column) => (
              <td key={column.accessor} role="cell">
                {item[column.accessor]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;