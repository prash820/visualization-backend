// DetailPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DataForm from './DataForm';
import { useApi } from './useApi';
import { User, Project, Task, AppError } from './types';
import Loading from './Loading';

interface DetailPageProps {
  users: User[];
  projects: Project[];
  tasks: Task[];
}

const DetailPage: React.FC<DetailPageProps> = ({ users, projects, tasks }) => {
  const { type, id } = useParams<{ type: 'user' | 'project' | 'task'; id: string }>();
  const [item, setItem] = useState<User | Project | Task | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AppError | null>(null);
  const { getUserById, getProjectById, getTaskById, error: apiError } = useApi(users, projects, tasks);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let fetchedItem: User | Project | Task | null = null;
        if (type === 'user') {
          fetchedItem = await getUserById(id);
        } else if (type === 'project') {
          fetchedItem = await getProjectById(id);
        } else if (type === 'task') {
          fetchedItem = await getTaskById(id);
        }
        setItem(fetchedItem);
      } catch (err) {
        setError(err as AppError);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, id, getUserById, getProjectById, getTaskById]);

  const handleSubmit = (data: User | Project | Task) => {
    setItem(data);
  };

  if (loading) {
    return <Loading message="Loading details..." />;
  }

  if (error || apiError) {
    return <div className="error-message">Error: {(error || apiError)?.message}</div>;
  }

  if (!item) {
    return <div>No item found</div>;
  }

  return (
    <div className="detail-page">
      <h1>{type.charAt(0).toUpperCase() + type.slice(1)} Details</h1>
      <DataForm type={type} onSubmit={handleSubmit} />
      <div className="item-details">
        {type === 'user' && (
          <div>
            <p>Name: {(item as User).name}</p>
            <p>Email: {(item as User).email}</p>
          </div>
        )}
        {type === 'project' && (
          <div>
            <p>Name: {(item as Project).name}</p>
            <p>Description: {(item as Project).description}</p>
          </div>
        )}
        {type === 'task' && (
          <div>
            <p>Title: {(item as Task).title}</p>
            <p>Description: {(item as Task).description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailPage;

// CSS (Assuming CSS-in-JS or a CSS file is used)
// .detail-page {
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
// .item-details {
//   margin-top: 20px;
// }