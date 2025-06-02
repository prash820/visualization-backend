import React from 'react';

const MenuItem = ({ item }) => (
  <div>
    <h3>{item.name}</h3>
    <p>${item.price.toFixed(2)}</p>
  </div>
);

export default MenuItem;