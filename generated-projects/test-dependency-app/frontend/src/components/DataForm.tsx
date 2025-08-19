// DataForm.tsx

import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import useApi from './useApi';

interface DataFormProps {
  endpoint: string;
  onSubmitSuccess: (data: any) => void;
}

interface FormData {
  [key: string]: string;
}

const DataForm: React.FC<DataFormProps> = ({ endpoint, onSubmitSuccess }) => {
  const [formData, setFormData] = useState<FormData>({});
  const { data, error, loading, fetchData } = useApi<any>();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prevData) => ({ ...prevData, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await fetchData(endpoint, { method: 'POST', data: formData });
      onSubmitSuccess(data);
    } catch (err) {
      console.error('Submission failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Data Form</h2>
      <Input
        type="text"
        placeholder="Field 1"
        value={formData['field1'] || ''}
        onChange={(value) => handleInputChange('field1', value)}
        disabled={loading}
        error={error}
      />
      <Input
        type="text"
        placeholder="Field 2"
        value={formData['field2'] || ''}
        onChange={(value) => handleInputChange('field2', value)}
        disabled={loading}
        error={error}
      />
      <Button
        label={loading ? 'Submitting...' : 'Submit'}
        onClick={handleSubmit}
        disabled={loading}
      />
      {error && <div style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{error}</div>}
    </form>
  );
};

export default DataForm;
