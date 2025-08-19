const API_URL = 'https://api.example.com';

export const calculate = async (expression: string) => {
  const response = await fetch(`${API_URL}/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expression }),
  });
  return response.json();
};