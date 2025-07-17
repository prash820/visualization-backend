import express, { Request, Response } from 'express';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'NotesTable';

interface Note {
  id: string;
  title: string;
  content: string;
}

app.get('/notes', async (req: Request, res: Response) => {
  try {
    const command = new GetItemCommand({ TableName: TABLE_NAME });
    const data = await dynamoDbClient.send(command);
    res.json(data.Items || []);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Could not fetch notes' });
  }
});

app.post('/notes', async (req: Request, res: Response) => {
  const { title, content } = req.body;
  const note: Note = { id: uuidv4(), title, content };
  try {
    const command = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        id: { S: note.id },
        title: { S: note.title },
        content: { S: note.content }
      }
    });
    await dynamoDbClient.send(command);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Could not create note' });
  }
});

app.put('/notes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content } = req.body;
  try {
    const command = new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { id: { S: id } },
      UpdateExpression: 'set title = :title, content = :content',
      ExpressionAttributeValues: {
        ':title': { S: title },
        ':content': { S: content }
      }
    });
    await dynamoDbClient.send(command);
    res.json({ id, title, content });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Could not update note' });
  }
});

app.delete('/notes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const command = new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: { id: { S: id } }
    });
    await dynamoDbClient.send(command);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Could not delete note' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.send('OK');
});

const serverless = require('serverless-http');
exports.handler = serverless(app);