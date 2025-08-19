import { {{.TT{{^lastTT, {{/lastTT } from '../models';

export class TaskService {
  
  constructor(private {{dependencyNameTT: {{dependencyTypeTT) {T
  

  
  async findAll(): Promise<Task[]> {
    // BEGIN-AI findAll
    /* AI will generate the method implementation */
    async findAll(): Promise<Task[]> {
  try {
    // Assuming `TaskModel` is the ORM model for Task
    const tasks = await TaskModel.findAll();
    return tasks;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw new Error('Unable to fetch tasks');
  }
}
    // END-AI
  }
  

  async findById(): Promise<Task | null> {
    // BEGIN-AI findById
    /* AI will generate the method implementation */
    async findById(id: string): Promise<Task | null> {
  try {
    // Validate the ID
    if (!id) {
      throw new Error("Task ID is required");
    }

    // Fetch the Task by ID from the database
    const task = await this.taskRepository.findOne({ where: { id } });

    // Return the Task if found, otherwise return null
    return task || null;
  } catch (error) {
    // Log the error for debugging purposes
    console.error(`Error fetching task by ID: ${id}`, error);

    // Re-throw the error to be handled by the calling function
    throw new Error("Failed to fetch task by ID");
  }
}
    // END-AI
  }
  

  async create(): Promise<Task> {
    // BEGIN-AI create
    /* AI will generate the method implementation */
    async create(data: Partial<Task>): Promise<Task> {
  try {
    // Validate required fields
    if (!data.title || !data.description || !data.status || !data.priority || !data.projectId || !data.assignedTo || !data.dueDate) {
      throw new Error('Missing required fields');
    }

    // Generate unique ID for the new task
    const id = generateUniqueId();

    // Set timestamps
    const createdAt = new Date();
    const updatedAt = new Date();

    // Create new task object
    const newTask: Task = {
      id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      projectId: data.projectId,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate,
      createdAt,
      updatedAt
    };

    // Save the task to the database
    await database.save('tasks', newTask);

    return newTask;
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error('Failed to create task');
  }
}
    // END-AI
  }
  

  async update(): Promise<Task | null> {
    // BEGIN-AI update
    /* AI will generate the method implementation */
    async update(id: string, data: Partial<Task>): Promise<Task | null> {
  try {
    // Find the existing task by ID
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new Error(`Task with ID ${id} not found`);
    }

    // Update the task fields
    const updatedTaskData = {
      ...task,
      ...data,
      updatedAt: new Date(),
    };

    // Save the updated task
    const updatedTask = await this.taskRepository.update(id, updatedTaskData);

    return updatedTask;
  } catch (error) {
    console.error(`Error updating task with ID ${id}:`, error);
    throw new Error('Failed to update task');
  }
}
    // END-AI
  }
  

  async delete(): Promise<boolean> {
    // BEGIN-AI delete
    /* AI will generate the method implementation */
    async delete(id: string): Promise<boolean> {
  try {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    await this.taskRepository.delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting task with id ${id}:`, error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}
    // END-AI
  }
  
}

export default TaskService;