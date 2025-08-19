import Todo, { ITodo } from '../models/todoModel';

export const getAllTodos = async (): Promise<ITodo[]> => {
  return Todo.find();
};

export const createTodo = async (todoData: { task: string }): Promise<ITodo> => {
  const todo = new Todo(todoData);
  return todo.save();
};

export const deleteTodoById = async (id: string): Promise<void> => {
  await Todo.findByIdAndDelete(id);
};