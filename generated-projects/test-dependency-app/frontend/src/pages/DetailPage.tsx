// DetailPage.tsx

import React, { useState, useEffect } from 'react';
import DataForm from './DataForm';
import DataList from './DataList';
import useApi from './useApi';
import { useParams } from 'react-router-dom';

interface DetailPageProps {}

interface DataItem {
  id: string;
  name: string;
  [key: string]: any;
}

const DetailPage: React.FC<DetailPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const [itemData, setItemData] = useState<DataItem | null>(null);
  const { data, error, loading, fetchData } = useApi<DataItem>();

  useEffect(() => {
    if (id) {
      fetchData(`/api/data/${id}`);
    }
  }, [id, fetchData]);

  useEffect(() => {
    if (data) {
      setItemData(data);
    }
  }, [data]);

  const handleDataSubmitSuccess = (submittedData: any) => {
    console.log('Data submitted successfully:', submittedData);
    setItemData(submittedData);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Detail Page</h1>
      {itemData ? (
        <div>
          <h2>{itemData.name}</h2>
          <DataForm endpoint={`/api/data/${id}`} onSubmitSuccess={handleDataSubmitSuccess} />
          <DataList endpoint="/api/data" />
        </div>
      ) : (
        <div>No data available for this item.</div>
      )}
    </div>
  );
};

export default DetailPage;
