const API_URL = 'https://api.example.com';

export const calculate = async (expression: string) => {
  const response = await fetch(`${API_URL}/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expression }),
  });

  if (!response.ok) {
    throw new Error('Failed to calculate');
  }

  return response.json();
};