import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ChartProps {
  data: number[];
  labels: string[];
  title: string;
}

const Chart: React.FC<ChartProps> = ({ data, labels, title }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const formattedData = {
      labels: labels,
      datasets: [
        {
          label: title,
          data: data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        },
      ],
    };
    setChartData(formattedData);
  }, [data, labels, title]);

  if (!chartData) {
    return <div>Loading...</div>;
  }

  return (
    <div role="img" aria-label="Chart">
      <Line data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: title } } }} />
    </div>
  );
};

export default Chart;