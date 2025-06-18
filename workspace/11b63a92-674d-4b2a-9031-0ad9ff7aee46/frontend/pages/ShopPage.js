import React, { useState, useEffect } from 'react';
import SneakerCard from '../components/SneakerCard';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ShopPage = () => {
  const [sneakers, setSneakers] = useState([]);

  useEffect(() => {
    // Fetch sneakers from API
  }, []);

  return (
    <div>
      <Navbar />
      <main>
        {sneakers.map(sneaker => <SneakerCard key={sneaker.id} sneaker={sneaker} />)}
      </main>
      <Footer />
    </div>
  );
};

export default ShopPage;