// DataList.tsx

import React, { useEffect } from 'react';
import Loading from './Loading';
import useApi from './useApi';

interface DataListProps {
  endpoint: string;
}

interface DataItem {
  id: string;
  name: string;
  [key: string]: any;
}

const DataList: React.FC<DataListProps> = ({ endpoint }) => {
  const { data, error, loading, fetchData } = useApi<DataItem[]>();

  useEffect(() => {
    fetchData(endpoint);
  }, [endpoint, fetchData]);

  if (loading) return <Loading message="Loading data..." size="medium" />;

  if (error) return <div style={{ color: 'red', textAlign: 'center' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Data List</h2>
      {data && data.length > 0 ? (
        <ul style={{ listStyleType: 'none', padding: '0' }}>
          {data.map((item) => (
            <li key={item.id} style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
              {item.name}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ textAlign: 'center' }}>No data available.</div>
      )}
    </div>
  );
};

export default DataList;
