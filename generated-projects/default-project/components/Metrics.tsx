import React, { useState, useEffect } from 'react';

interface Metric {
  id: number;
  name: string;
  value: number;
}

interface MetricsProps {
  title: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Metrics: React.FC<MetricsProps> = ({ title }) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/metrics`);
        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <div role="status" aria-label="Loading metrics...">Loading...</div>;
  }

  if (error) {
    return <div role="alert" aria-label="Error loading metrics">{error}</div>;
  }

  return (
    <div>
      <h2>{title}</h2>
      <ul>
        {metrics.map(metric => (
          <li key={metric.id}>
            <strong>{metric.name}:</strong> {metric.value}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Metrics;