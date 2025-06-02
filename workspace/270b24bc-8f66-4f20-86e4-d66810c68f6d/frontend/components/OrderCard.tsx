import React from 'react';

interface OrderCardProps {
  name: string;
  price: number;
}

const OrderCard: React.FC<OrderCardProps> = ({ name, price }) => (
  <div>
    <h3>{name}</h3>
    <p>${price.toFixed(2)}</p>
  </div>
);

export default OrderCard;