import React, { useState, useEffect } from 'react';
import { CloudFront } from './CloudFront';

const S3: React.FC = () => {
  const [assetsLoaded, setAssetsLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Simulate asset loading
    const loadAssets = async () => {
      try {
        // Simulate loading delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setAssetsLoaded(true);
      } catch (error) {
        console.error('Error loading assets:', error);
      }
    };

    loadAssets();
  }, []);

  return (
    <div className="s3-container">
      <h1>S3 Asset Hosting</h1>
      {assetsLoaded ? (
        <CloudFront />
      ) : (
        <div className="loading" aria-live="polite">
          Loading assets...
        </div>
      )}
    </div>
  );
};

export default S3;