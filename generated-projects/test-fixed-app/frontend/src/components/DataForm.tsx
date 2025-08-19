// DataForm.tsx

import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import { useApi } from './useApi';

interface DataFormProps {}

const DataForm: React.FC<DataFormProps> = () => {
  const { updateAppData, loading, error } = useApi();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async () => {
    if (!name || !description) {
      setFormError('Name and description are required');
      return;
    }
    setFormError('');
    try {
      await updateAppData({
        analysis: {
          appSummary: {
            name,
            description
          }
        }
      });
    } catch (err) {
      setFormError('Update failed');
    }
  };

  return (
    <div className="data-form">
      <h2>Update App Data</h2>
      <Input
        type="text"
        placeholder="Name"
        value={name}
        onChange={setName}
        error={formError}
      />
      <Input
        type="text"
        placeholder="Description"
        value={description}
        onChange={setDescription}
        error={formError}
      />
      {formError && <div className="error-message">{formError}</div>}
      {error && <div className="error-message">{error}</div>}
      <Button label="Submit" onClick={handleSubmit} disabled={loading} />
    </div>
  );
};

export default DataForm;

// DataForm.css

.data-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 10px;
}