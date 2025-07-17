import React, { useState, useEffect } from 'react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface ProfileProps {
  userId: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Profile: React.FC<ProfileProps> = ({ userId }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [formData, setFormData] = useState<{ name: string; email: string }>({ name: '', email: '' });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch profile data');
        const data: UserProfile = await response.json();
        setProfile(data);
        setFormData({ name: data.name, email: data.email });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [userId]);

  const updateProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const updatedProfile: UserProfile = await response.json();
      setProfile(updatedProfile);
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {editMode ? (
        <div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            aria-label="Name"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            aria-label="Email"
          />
          <button onClick={updateProfile}>Save</button>
          <button onClick={() => setEditMode(false)}>Cancel</button>
        </div>
      ) : (
        <div>
          <h1>{profile?.name}</h1>
          <p>{profile?.email}</p>
          <button onClick={() => setEditMode(true)}>Edit Profile</button>
        </div>
      )}
    </div>
  );
};

export default Profile;