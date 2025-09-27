import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";
import { getConfig } from "../config.js";

let documentClient;

async function getClient() {
  if (!documentClient) {
    const config = await getConfig();
    const dynamo = new DynamoDBClient({ region: config.region });
    documentClient = DynamoDBDocumentClient.from(dynamo, { marshallOptions: { removeUndefinedValues: true } });
  }
  return documentClient;
}

export async function putVideo(video) {
  const client = await getClient();
  const config = await getConfig();
  await client.send(
    new PutCommand({
      TableName: config.dynamoTable,
      Item: video
    })
  );
  return video;
}

export async function updateVideo(videoId, updates) {
  const client = await getClient();
  const config = await getConfig();

  const expressionParts = [];
  const values = {};
  const names = {};
  Object.entries(updates).forEach(([key, value]) => {
    const attrName = `#${key}`;
    const attrValue = `:${key}`;
    names[attrName] = key;
    values[attrValue] = value;
    expressionParts.push(`${attrName} = ${attrValue}`);
  });

  const updateExpression = `SET ${expressionParts.join(", ")}`;

  await client.send(
    new UpdateCommand({
      TableName: config.dynamoTable,
      Key: { videoId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values
    })
  );
}

export async function getVideo(videoId) {
  const client = await getClient();
  const config = await getConfig();
  const response = await client.send(
    new GetCommand({
      TableName: config.dynamoTable,
      Key: { videoId }
    })
  );
  return response.Item;
}

export async function listVideosByOwner(ownerId) {
  const client = await getClient();
  const config = await getConfig();
  const response = await client.send(
    new QueryCommand({
      TableName: config.dynamoTable,
      IndexName: config.dynamoOwnerIndex,
      KeyConditionExpression: "ownerId = :ownerId",
      ExpressionAttributeValues: {
        ":ownerId": ownerId
      },
      ScanIndexForward: false
    })
  );
  return response.Items || [];
}

export async function listAllVideos(limit = 100) {
  const client = await getClient();
  const config = await getConfig();
  const response = await client.send(
    new ScanCommand({
      TableName: config.dynamoTable,
      Limit: limit
    })
  );
  return response.Items || [];
}

export async function deleteVideo(videoId) {
  const client = await getClient();
  const config = await getConfig();
  await client.send(
    new DeleteCommand({
      TableName: config.dynamoTable,
      Key: { videoId }
    })
  );
}
