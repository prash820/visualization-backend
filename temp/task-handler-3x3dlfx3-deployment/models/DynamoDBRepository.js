```typescript
import { DynamoDBClient, PutItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

// DynamoDB Client Configuration
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const tableName = process.env.DYNAMODB_TABLE_NAME || 'Tasks';

// Task Interface
interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
}

// Save Task Function
export const saveTask = async (task: Task): Promise<void> => {
  try {
    const params = {
      TableName: tableName,
      Item: {
        id: { S: task.id || uuidv4() },
        title: { S: task.title },
        description: { S: task.description },
        status: { S: task.status }
      }
    };
    await dynamoDBClient.send(new PutItemCommand(params));
  } catch (error) {
    console.error('Error saving task:', error);
    throw new Error('Could not save task');
  }
};

// Update Task Record Function
export const updateTaskRecord = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  try {
    const updateExpressions = [];
    const expressionAttributeValues: { [key: string]: any } = {};

    if (updates.title) {
      updateExpressions.push('title = :title');
      expressionAttributeValues[':title'] = { S: updates.title };
    }
    if (updates.description) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = { S: updates.description };
    }
    if (updates.status) {
      updateExpressions.push('status = :status');
      expressionAttributeValues[':status'] = { S: updates.status };
    }

    const params = {
      TableName: tableName,
      Key: { id: { S: taskId } },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues
    };

    await dynamoDBClient.send(new UpdateItemCommand(params));
  } catch (error) {
    console.error('Error updating task:', error);
    throw new Error('Could not update task');
  }
};

// Delete Task Record Function
export const deleteTaskRecord = async (taskId: string): Promise<void> => {
  try {
    const params = {
      TableName: tableName,
      Key: { id: { S: taskId } }
    };
    await dynamoDBClient.send(new DeleteItemCommand(params));
  } catch (error) {
    console.error('Error deleting task:', error);
    throw new Error('Could not delete task');
  }
};

// Lambda Handler
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Example of handling a save task request
    if (event.httpMethod === 'POST' && event.path === '/tasks') {
      const task: Task = JSON.parse(event.body || '{}');
      await saveTask(task);
      return {
        statusCode: 201,
        body: JSON.stringify({ message: 'Task saved successfully' })
      };
    }

    // Example of handling an update task request
    if (event.httpMethod === 'PUT' && event.path.startsWith('/tasks/')) {
      const taskId = event.pathParameters?.id;
      const updates: Partial<Task> = JSON.parse(event.body || '{}');
      if (taskId) {
        await updateTaskRecord(taskId, updates);
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Task updated successfully' })
        };
      }
    }

    // Example of handling a delete task request
    if (event.httpMethod === 'DELETE' && event.path.startsWith('/tasks/')) {
      const taskId = event.pathParameters?.id;
      if (taskId) {
        await deleteTaskRecord(taskId);
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Task deleted successfully' })
        };
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid request' })
    };
  } catch (error) {
    console.error('Error handling request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
```