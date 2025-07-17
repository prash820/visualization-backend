import React, { useState, useEffect } from 'react';
import { Chart } from 'chart.js';
import { GraphData } from '@/types/graph';

interface GraphProps {
  data: GraphData[];
  title: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Graph: React.FC<GraphProps> = ({ data, title }) => {
  const [chart, setChart] = useState<Chart | null>(null);

  useEffect(() => {
    if (chart) {
      chart.destroy();
    }

    const ctx = document.getElementById('graphCanvas') as HTMLCanvasElement;
    const newChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(item => item.label),
        datasets: [
          {
            label: title,
            data: data.map(item => item.value),
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
          },
        },
      },
    });

    setChart(newChart);

    return () => {
      newChart.destroy();
    };
  }, [data, title]);

  return (
    <div>
      <h2>{title}</h2>
      <canvas id="graphCanvas" aria-label="Graph displaying data"></canvas>
    </div>
  );
};

export default Graph;