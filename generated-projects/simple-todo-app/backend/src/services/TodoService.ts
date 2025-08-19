// Complete service code
import { TodoRepository } from '../repositories/TodoRepository';
import { Todo } from '../models/Todo';

export class TodoService {
  private todoRepository = new TodoRepository();

  async createTodo(todo: Todo) {
    return this.todoRepository.save(todo);
  }

  async updateTodo(id: string, todo: Todo) {
    return this.todoRepository.update(id, todo);
  }

  async removeTodo(id: string) {
    return this.todoRepository.deleteById(id);
  }
}
