import React, { useState, useEffect } from 'react';
import { UserType } from '@/types/user';
import { ApiService } from '@/services/api';

interface ProfileProps {
  userId: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Profile: React.FC<ProfileProps> = ({ userId }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<UserType>>({});

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await ApiService.get<UserType>(`${API_BASE_URL}/users/${userId}`);
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUser();
  }, [userId]);

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(user || {});
  };

  const handleSave = async () => {
    try {
      const response = await ApiService.put<UserType>(`${API_BASE_URL}/users/${userId}`, formData);
      setUser(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="profile">
      {isEditing ? (
        <div>
          <input
            type="text"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            aria-label="Name"
          />
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            aria-label="Email"
          />
          <button onClick={handleSave}>Save</button>
        </div>
      ) : (
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <button onClick={handleEdit}>Edit</button>
        </div>
      )}
    </div>
  );
};

export default Profile;