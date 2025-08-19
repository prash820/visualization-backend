import React, { useState, useEffect } from 'react';

interface TaskComponentProps {
  data: Task[];
  onCreate?: (data: Partial<Task>) => void;
  onUpdate?: (id: string, data: Partial<Task>) => void;
  onDelete?: (id: string) => void;
}

export const TaskComponent: React.FC<TaskComponentProps> = (props) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);


  const handleCreate = async (data: Partial<Task>) => {
    try {
      setLoading(true);
      setError(null);
      if (props.onCreate) {
        await props.onCreate(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  };
  const handleUpdate = async (id: string, data: Partial<Task>) => {
    try {
      setLoading(true);
      setError(null);
      if (props.onUpdate) {
        await props.onUpdate(id, data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      if (props.onDelete) {
        await props.onDelete(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (

      <div className="taskcomponent-container">
        <h2>Task Management</h2>
        
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">Error: {error}</div>}
        
        <div className="controls">
          <button 
            onClick={() => handleCreate({} as any)} 
            disabled={loading}
            className="create-btn"
          >
            Create New Task
          </button>
        </div>
        
        <div className="list">
          {props.data?.map((item: any) => (
            <div key={item.id} className="item">
              <h3>{item.name || item.title || item.id}</h3>
              <div className="actions">
                <button 
                  onClick={() => handleUpdate(item.id, item)}
                  disabled={loading}
                  className="edit-btn"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  disabled={loading}
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
  );
};

export default TaskComponent;