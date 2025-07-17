import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  notebookId: string;
  createdAt: string;
  updatedAt: string;
}

const createNote = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { userId, title, content, tags, notebookId } = JSON.parse(event.body || '{}');
    const note: Note = {
      id: uuidv4(),
      userId,
      title,
      content,
      tags,
      notebookId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        id: { S: note.id },
        userId: { S: note.userId },
        title: { S: note.title },
        content: { S: note.content },
        tags: { SS: note.tags },
        notebookId: { S: note.notebookId },
        createdAt: { S: note.createdAt },
        updatedAt: { S: note.updatedAt },
      },
    };

    await dynamoDbClient.send(new PutItemCommand(params));

    return {
      statusCode: 201,
      body: JSON.stringify(note),
    };
  } catch (error) {
    console.error("Error creating note:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not create note" }),
    };
  }
};

const getNote = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        id: { S: id },
      },
    };

    const result = await dynamoDbClient.send(new GetItemCommand(params));

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Note not found" }),
      };
    }

    const note: Note = {
      id: result.Item.id.S,
      userId: result.Item.userId.S,
      title: result.Item.title.S,
      content: result.Item.content.S,
      tags: result.Item.tags.SS,
      notebookId: result.Item.notebookId.S,
      createdAt: result.Item.createdAt.S,
      updatedAt: result.Item.updatedAt.S,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(note),
    };
  } catch (error) {
    console.error("Error retrieving note:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not retrieve note" }),
    };
  }
};

const updateNote = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};
    const { title, content, tags, notebookId } = JSON.parse(event.body || '{}');

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        id: { S: id },
      },
      UpdateExpression: "set title = :title, content = :content, tags = :tags, notebookId = :notebookId, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":title": { S: title },
        ":content": { S: content },
        ":tags": { SS: tags },
        ":notebookId": { S: notebookId },
        ":updatedAt": { S: new Date().toISOString() },
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDbClient.send(new UpdateItemCommand(params));

    const updatedNote: Note = {
      id: result.Attributes.id.S,
      userId: result.Attributes.userId.S,
      title: result.Attributes.title.S,
      content: result.Attributes.content.S,
      tags: result.Attributes.tags.SS,
      notebookId: result.Attributes.notebookId.S,
      createdAt: result.Attributes.createdAt.S,
      updatedAt: result.Attributes.updatedAt.S,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(updatedNote),
    };
  } catch (error) {
    console.error("Error updating note:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not update note" }),
    };
  }
};

const deleteNote = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { id } = event.pathParameters || {};

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        id: { S: id },
      },
    };

    await dynamoDbClient.send(new DeleteItemCommand(params));

    return {
      statusCode: 204,
      body: JSON.stringify({}),
    };
  } catch (error) {
    console.error("Error deleting note:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not delete note" }),
    };
  }
};

export { createNote, getNote, updateNote, deleteNote };