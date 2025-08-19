// DataForm.tsx

import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import { useApi } from './useApi';
import { User, Project, Task, AppError } from './types';

interface DataFormProps {
  type: 'user' | 'project' | 'task';
  onSubmit: (data: User | Project | Task) => void;
}

const DataForm: React.FC<DataFormProps> = ({ type, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<User & Project & Task>>({});
  const [error, setError] = useState<AppError | null>(null);
  const { addUser, addProject, addTask } = useApi([], [], []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (type === 'user') {
        await addUser(formData as User);
      } else if (type === 'project') {
        await addProject(formData as Project);
      } else if (type === 'task') {
        await addTask(formData as Task);
      }
      onSubmit(formData as User | Project | Task);
    } catch (err) {
      setError(err as AppError);
    }
  };

  return (
    <div className="data-form">
      <h1>{type.charAt(0).toUpperCase() + type.slice(1)} Form</h1>
      <Input
        label="ID"
        value={formData.id || ''}
        onChange={(value) => handleChange('id', value)}
        placeholder="Enter ID"
        required
      />
      <Input
        label="Name"
        value={formData.name || ''}
        onChange={(value) => handleChange('name', value)}
        placeholder="Enter Name"
        required
      />
      {type === 'user' && (
        <Input
          label="Email"
          value={formData.email || ''}
          onChange={(value) => handleChange('email', value)}
          placeholder="Enter Email"
          required
        />
      )}
      {type === 'project' && (
        <Input
          label="Description"
          value={formData.description || ''}
          onChange={(value) => handleChange('description', value)}
          placeholder="Enter Description"
          required
        />
      )}
      {type === 'task' && (
        <Input
          label="Title"
          value={formData.title || ''}
          onChange={(value) => handleChange('title', value)}
          placeholder="Enter Title"
          required
        />
      )}
      <Button label="Submit" onClick={handleSubmit} disabled={!formData.id || !formData.name} />
      {error && <div className="error-message">Error: {error.message}</div>}
    </div>
  );
};

export default DataForm;

// CSS (Assuming CSS-in-JS or a CSS file is used)
// .data-form {
//   max-width: 400px;
//   margin: 0 auto;
//   padding: 20px;
//   border: 1px solid #ccc;
//   border-radius: 4px;
//   background-color: #f9f9f9;
// }
// .error-message {
//   color: red;
//   margin-top: 10px;
// }