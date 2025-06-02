import React from 'react';

export const OrderSummary = ({ order }) => (
  <div>
    <h2>Order Summary</h2>
    {order.items.map((item, index) => (
      <div key={index}>
        <p>{item.name}: ${item.price}</p>
      </div>
    ))}
    <p>Total: ${order.items.reduce((acc, item) => acc + item.price, 0)}</p>
  </div>
);