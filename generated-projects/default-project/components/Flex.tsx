import React from 'react';

interface FlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  className?: string;
}

const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  wrap = 'nowrap',
  className = '',
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: direction,
        justifyContent: justifyContent,
        alignItems: alignItems,
        flexWrap: wrap,
      }}
      role="group"
      aria-label="flex container"
    >
      {children}
    </div>
  );
};

export default Flex;