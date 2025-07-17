import React, { useState, useEffect } from 'react';

interface ListProps {
  items: string[];
}

const List: React.FC<ListProps> = ({ items }) => {
  const [listItems, setListItems] = useState<string[]>([]);

  useEffect(() => {
    setListItems(items);
  }, [items]);

  if (!listItems.length) {
    return <div role="alert">No items to display</div>;
  }

  return (
    <ul aria-label="Item list">
      {listItems.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
};

export default List;