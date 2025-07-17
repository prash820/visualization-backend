import React from 'react';

interface GridProps {
  columns: number;
  gap?: string;
  children: React.ReactNode;
}

const Grid: React.FC<GridProps> = ({ columns, gap = '1rem', children }) => {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: gap,
  };

  return (
    <div style={gridStyle} role="grid" aria-label="Grid Layout">
      {children}
    </div>
  );
};

export default Grid;