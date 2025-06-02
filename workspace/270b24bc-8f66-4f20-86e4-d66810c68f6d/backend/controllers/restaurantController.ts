import { Request, Response } from 'express';

export const getRestaurants = (req: Request, res: Response) => {
  // Mocked data
  const restaurants = [
    { id: 1, name: 'Restaurant A', location: 'Location A' },
    { id: 2, name: 'Restaurant B', location: 'Location B' }
  ];
  res.json(restaurants);
};