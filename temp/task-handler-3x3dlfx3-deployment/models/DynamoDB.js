```typescript
import { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.DYNAMODB_TABLE_NAME || "TaskTable";

/**
 * Interface for Task data
 */
interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
}

/**
 * Creates a new task in DynamoDB
 * @param task - Task data to store
 * @returns Promise resolving to the created task
 */
async function createTask(task: Omit<Task, "id">): Promise<Task> {
  const taskId = uuidv4();
  const newTask: Task = { id: taskId, ...task };

  const params = {
    TableName: tableName,
    Item: {
      id: { S: newTask.id },
      title: { S: newTask.title },
      description: { S: newTask.description || "" },
      completed: { BOOL: newTask.completed },
    },
  };

  try {
    await dynamoDbClient.send(new PutItemCommand(params));
    console.log(`Task created with ID: ${taskId}`);
    return newTask;
  } catch (error) {
    console.error("Error creating task:", error);
    throw new Error("Could not create task");
  }
}

/**
 * Retrieves a task by ID from DynamoDB
 * @param taskId - ID of the task to retrieve
 * @returns Promise resolving to the retrieved task
 */
async function getTaskById(taskId: string): Promise<Task | null> {
  const params = {
    TableName: tableName,
    Key: {
      id: { S: taskId },
    },
  };

  try {
    const result = await dynamoDbClient.send(new GetItemCommand(params));
    if (!result.Item) {
      console.log(`Task with ID: ${taskId} not found`);
      return null;
    }

    const task: Task = {
      id: result.Item.id.S!,
      title: result.Item.title.S!,
      description: result.Item.description.S!,
      completed: result.Item.completed.BOOL!,
    };
    return task;
  } catch (error) {
    console.error("Error retrieving task:", error);
    throw new Error("Could not retrieve task");
  }
}

/**
 * Retrieves all tasks from DynamoDB
 * @returns Promise resolving to an array of tasks
 */
async function getAllTasks(): Promise<Task[]> {
  const params = {
    TableName: tableName,
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    const tasks: Task[] = result.Items?.map(item => ({
      id: item.id.S!,
      title: item.title.S!,
      description: item.description.S!,
      completed: item.completed.BOOL!,
    })) || [];
    return tasks;
  } catch (error) {
    console.error("Error retrieving tasks:", error);
    throw new Error("Could not retrieve tasks");
  }
}

/**
 * Lambda handler for task management
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    let response;
    switch (event.httpMethod) {
      case "POST":
        const taskData = JSON.parse(event.body || "{}");
        const createdTask = await createTask(taskData);
        response = {
          statusCode: 201,
          body: JSON.stringify(createdTask),
        };
        break;
      case "GET":
        if (event.pathParameters && event.pathParameters.id) {
          const task = await getTaskById(event.pathParameters.id);
          response = {
            statusCode: task ? 200 : 404,
            body: JSON.stringify(task || { message: "Task not found" }),
          };
        } else {
          const tasks = await getAllTasks();
          response = {
            statusCode: 200,
            body: JSON.stringify(tasks),
          };
        }
        break;
      default:
        response = {
          statusCode: 405,
          body: JSON.stringify({ message: "Method not allowed" }),
        };
        break;
    }
    return response;
  } catch (error) {
    console.error("Error handling request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
```