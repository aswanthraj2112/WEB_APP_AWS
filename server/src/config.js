import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "ap-southeast-2";
const SECRET_ID = process.env.APP_SECRET_NAME || "n11817143-a2-secret";

const PARAMETER_NAMES = [
  "/n11817143/app/cognitoClientId",
  "/n11817143/app/cognitoUserPoolId",
  "/n11817143/app/domainName",
  "/n11817143/app/dynamoTable",
  "/n11817143/app/dynamoOwnerIndex",
  "/n11817143/app/maxUploadSizeMb",
  "/n11817143/app/preSignedUrlTTL",
  "/n11817143/app/s3Bucket",
  "/n11817143/app/s3_raw_prefix",
  "/n11817143/app/s3_thumbnail_prefix",
  "/n11817143/app/s3_transcoded_prefix"
];

let cachedConfig = null;

const PARAMETER_BATCH_SIZE = 10;

async function fetchParameters() {
  const ssm = new SSMClient({ region: REGION });

  const values = {};
  const invalidParameters = new Set();

  for (let i = 0; i < PARAMETER_NAMES.length; i += PARAMETER_BATCH_SIZE) {
    const batch = PARAMETER_NAMES.slice(i, i + PARAMETER_BATCH_SIZE);
    const response = await ssm.send(
      new GetParametersCommand({ Names: batch, WithDecryption: true })
    );

    (response.Parameters || []).forEach((param) => {
      values[param.Name] = param.Value;
    });

    (response.InvalidParameters || []).forEach((name) => invalidParameters.add(name));
  }

  const missing = PARAMETER_NAMES.filter(
    (name) => !values[name] || invalidParameters.has(name)
  );
  if (missing.length) {
    throw new Error(`Missing SSM parameters: ${missing.join(", ")}`);
  }

  return {
    cognitoClientId: values["/n11817143/app/cognitoClientId"],
    cognitoUserPoolId: values["/n11817143/app/cognitoUserPoolId"],
    domainName: values["/n11817143/app/domainName"],
    dynamoTable: values["/n11817143/app/dynamoTable"],
    dynamoOwnerIndex: values["/n11817143/app/dynamoOwnerIndex"],
    maxUploadSizeMb: parseInt(values["/n11817143/app/maxUploadSizeMb"], 10) || 500,
    preSignedUrlTTL: parseInt(values["/n11817143/app/preSignedUrlTTL"], 10) || 900,
    s3Bucket: values["/n11817143/app/s3Bucket"],
    s3RawPrefix: values["/n11817143/app/s3_raw_prefix"],
    s3ThumbnailPrefix: values["/n11817143/app/s3_thumbnail_prefix"],
    s3TranscodedPrefix: values["/n11817143/app/s3_transcoded_prefix"]
  };
}

async function fetchSecrets() {
  const secretsManager = new SecretsManagerClient({ region: REGION });
  const secretValue = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: SECRET_ID })
  );

  if (!secretValue.SecretString) {
    throw new Error("Secret value missing");
  }

  const parsed = JSON.parse(secretValue.SecretString);
  return {
    jwtSecret: parsed.JWT_SECRET
  };
}

export async function loadConfig() {
  const [parameters, secrets] = await Promise.all([
    fetchParameters(),
    fetchSecrets()
  ]);

  cachedConfig = {
    region: REGION,
    ...parameters,
    ...secrets
  };

  return cachedConfig;
}

export async function getConfig() {
  if (!cachedConfig) {
    await loadConfig();
  }
  return cachedConfig;
}

export function setConfig(config) {
  cachedConfig = config;
}
