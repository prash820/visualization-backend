export const fetchSneakers = async () => {
  const response = await fetch('API_ENDPOINT/sneakers');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return await response.json();
};