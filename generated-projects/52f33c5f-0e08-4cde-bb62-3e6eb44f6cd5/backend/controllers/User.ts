import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

interface User {
  userId: string;
  email: string;
  name: string;
}

const dynamoDbClient = new DynamoDBClient({ region: "us-east-1" });
const tableName = process.env.DYNAMODB_TABLE_NAME || "UsersTable";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    switch (event.httpMethod) {
      case "GET":
        return await getUser(event);
      case "POST":
        return await createUser(event);
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ message: "Method Not Allowed" }),
        };
    }
  } catch (error) {
    console.error("Error processing request", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

const getUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: Missing userId" }),
    };
  }

  const params = {
    TableName: tableName,
    Key: {
      userId: { S: userId },
    },
  };

  try {
    const data = await dynamoDbClient.send(new GetItemCommand(params));
    if (!data.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    const user: User = {
      userId: data.Item.userId.S!,
      email: data.Item.email.S!,
      name: data.Item.name.S!,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(user),
    };
  } catch (error) {
    console.error("Error fetching user", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

const createUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { email, name } = JSON.parse(event.body || "{}");

  if (!email || !name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: Missing email or name" }),
    };
  }

  const userId = uuidv4();
  const params = {
    TableName: tableName,
    Item: {
      userId: { S: userId },
      email: { S: email },
      name: { S: name },
    },
  };

  try {
    await dynamoDbClient.send(new PutItemCommand(params));
    return {
      statusCode: 201,
      body: JSON.stringify({ userId, email, name }),
    };
  } catch (error) {
    console.error("Error creating user", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};