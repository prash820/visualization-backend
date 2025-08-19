// Complete controller code
import { APIGatewayProxyHandler } from 'aws-lambda';
import { TodoService } from '../services/TodoService';

const todoService = new TodoService();

export const addTodo: APIGatewayProxyHandler = async (event) => {
  const todo = JSON.parse(event.body);
  await todoService.createTodo(todo);
  return {
    statusCode: 201,
    body: JSON.stringify({ message: 'Todo added successfully' })
  };
};

export const editTodo: APIGatewayProxyHandler = async (event) => {
  const { id } = event.pathParameters;
  const todo = JSON.parse(event.body);
  await todoService.updateTodo(id, todo);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Todo updated successfully' })
  };
};

export const deleteTodo: APIGatewayProxyHandler = async (event) => {
  const { id } = event.pathParameters;
  await todoService.removeTodo(id);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Todo deleted successfully' })
  };
};
