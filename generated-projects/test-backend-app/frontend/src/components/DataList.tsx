// DataList.tsx

import React, { useState, useEffect } from 'react';
import Loading from './Loading';
import { useApi } from './useApi';
import { User, Project, Task, AppError } from './types';

interface DataListProps {
  type: 'users' | 'projects' | 'tasks';
  data: User[] | Project[] | Task[];
}

const DataList: React.FC<DataListProps> = ({ type, data }) => {
  const [items, setItems] = useState<User[] | Project[] | Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AppError | null>(null);
  const { error: apiError } = useApi([], [], []);

  useEffect(() => {
    setLoading(true);
    try {
      setItems(data);
    } catch (err) {
      setError(err as AppError);
    } finally {
      setLoading(false);
    }
  }, [data]);

  if (loading) {
    return <Loading message="Loading data..." />;
  }

  if (error || apiError) {
    return <div className="error-message">Error: {(error || apiError)?.message}</div>;
  }

  return (
    <div className="data-list">
      <h1>{type.charAt(0).toUpperCase() + type.slice(1)} List</h1>
      <ul>
        {items.map((item) => (
          <li key={(item as User | Project | Task).id}>
            {type === 'users' && (item as User).name}
            {type === 'projects' && (item as Project).name}
            {type === 'tasks' && (item as Task).title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DataList;

// CSS (Assuming CSS-in-JS or a CSS file is used)
// .data-list {
//   max-width: 600px;
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