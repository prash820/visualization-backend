import axios from 'axios';

export const fetchUserPosts = async (userId) => {
  try {
    const response = await axios.get(`/api/posts/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return [];
  }
};

export const fetchAllPosts = async () => {
  try {
    const response = await axios.get('/api/posts');
    return response.data;
  } catch (error) {
    console.error('Error fetching all posts:', error);
    return [];
  }
};