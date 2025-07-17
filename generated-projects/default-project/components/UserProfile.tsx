import React, { useState, useEffect } from 'react';
import { UserType } from '@/types/user';
import { ApiService } from '@/services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface UserProfileProps {
  userId: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await ApiService.get<UserType>(`${API_BASE_URL}/users/${userId}`);
        setUser(response.data);
      } catch (err) {
        setError('Failed to fetch user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user) {
      setUser({ ...user, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      try {
        await ApiService.put(`${API_BASE_URL}/users/${userId}`, user);
        alert('Profile updated successfully');
      } catch (err) {
        setError('Failed to update profile');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div role="alert">{error}</div>;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={user?.name || ''}
          onChange={handleInputChange}
          aria-label="Name"
        />
      </div>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={user?.email || ''}
          onChange={handleInputChange}
          aria-label="Email"
        />
      </div>
      <button type="submit">Save</button>
    </form>
  );
};

export default UserProfile;