import React from 'react';

const SneakerCard = ({ sneaker }) => (
  <div className='sneaker-card'>
    <img src={sneaker.getImage()} alt={sneaker.name} />
    <h3>{sneaker.name}</h3>
    <p>${sneaker.price}</p>
    <p>Size: {sneaker.size}</p>
    <p>Color: {sneaker.color}</p>
  </div>
);

export default SneakerCard;