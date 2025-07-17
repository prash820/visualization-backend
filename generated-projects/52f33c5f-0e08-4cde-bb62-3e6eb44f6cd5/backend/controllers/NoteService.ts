import express, { Request, Response } from 'express';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'NotesTable';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'notes-app-bucket';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

app.post('/notes', async (req: Request, res: Response) => {
  const { title, content } = req.body;
  const note: Note = {
    id: uuidv4(),
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: note
    }).promise();
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
    const result = await dynamoDB.update({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'set title = :title, content = :content, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':title': title,
        ':content': content,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();

    res.json(result.Attributes);
  } catch (error) {
    console.error('Error editing note:', error);
    res.status(500).json({ error: 'Could not edit note' });
  }
});

app.delete('/notes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await dynamoDB.delete({
      TableName: TABLE_NAME,
      Key: { id }
    }).promise();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Could not delete note' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

const serverless = require('serverless-http');
exports.handler = serverless(app);