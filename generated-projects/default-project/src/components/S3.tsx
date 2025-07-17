import React, { useState, useEffect } from 'react';
import { CloudFront } from '../services/CloudFront';

interface S3Props {
  title: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const S3: React.FC<S3Props> = ({ title }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/assets`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div role="alert">Error: {error}</div>;
  }

  return (
    <div>
      <h1>{title}</h1>
      <CloudFront title="CloudFront Distribution" />
      <div>
        {data && data.map((item: any, index: number) => (
          <div key={index}>{item.name}</div>
        ))}
      </div>
    </div>
  );
};

export default S3;