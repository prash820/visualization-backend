import React from 'react';
import UserProfile from '../components/UserProfile';

const Profile = ({ userId }) => {
  return (
    <div>
      <h1>User Profile</h1>
      <UserProfile userId={userId} />
    </div>
  );
};

export default Profile;