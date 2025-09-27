# WEB_APP_AWS

Build a full-stack Cloud-Native Video Web Application for deployment on AWS, with the following specifications:

## General
- The application is a video management platform where authenticated users can upload, view, and manage videos.
- Backend: Node.js + Express, containerized with Docker.
- Frontend: React (Vite), with Cognito authentication and API integration.
- All persistent data must be externalized into AWS services (stateless app).
- Use AWS SDK v3.

## AWS Cloud Configuration
- Region: ap-southeast-2
- Account ID: 901444280953
- EC2 Instance: i-0aaedf6a70038409, DNS ec2-16-176-178-164.ap-southeast-2.compute.amazonaws.com
- Route53 domain: n11817143-videoapp.cab432.com → EC2 DNS
- ECR repository: 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2
- S3 bucket: n11817143-a2
  - Prefixes:
    - raw-videos/
    - transcoded-videos/
    - thumbnails/
- DynamoDB:
  - Table: VideosTable
  - Index: OwnerIndex
- Cognito:
  - User Pool ID: from Parameter Store `/n11817143/app/cognitoUserPoolId`
  - Client ID: from Parameter Store `/n11817143/app/cognitoClientId`
  - Groups: users, admins
- Secrets Manager:
  - Secret name: n11817143-a2-secret
  - Key/Value: JWT_SECRET = cab432_A2_super_secret_key_11817143
- Parameter Store keys:
  - /n11817143/app/cognitoClientId
  - /n11817143/app/cognitoUserPoolId
  - /n11817143/app/domainName
  - /n11817143/app/dynamoTable
  - /n11817143/app/dynamoOwnerIndex
  - /n11817143/app/maxUploadSizeMb
  - /n11817143/app/preSignedUrlTTL
  - /n11817143/app/s3Bucket
  - /n11817143/app/s3_raw_prefix
  - /n11817143/app/s3_thumbnail_prefix
  - /n11817143/app/s3_transcoded_prefix

## Backend (server)
- Use Express with routes for:
  - `POST /videos` → Upload video metadata + request presigned S3 upload URL.
  - `GET /videos/:id` → Fetch video metadata from DynamoDB and signed S3 URL.
  - `GET /videos` → List user’s videos.
  - `DELETE /videos/:id` → Admin-only delete.
- Middleware:
  - JWT validation with Cognito tokens.
  - `requireAuth` for user endpoints.
  - `requireAdmin` for admin endpoints (check `cognito:groups`).
- Config:
  - On startup, fetch all values from Parameter Store + Secrets Manager (`config.js`).
- Store metadata in DynamoDB (videoId, ownerId, title, s3Key, status).
- Use S3 for raw uploads, thumbnails, transcoded files.
- Use ffmpeg for transcoding (triggered after upload).
- Cache signed URLs in ElastiCache (optional).
- Dockerfile for backend.

## Frontend (client)
- React + Vite.
- Cognito authentication (sign up, login, logout).
- After login, decode JWT (`cognito:groups`) with `jwt-decode`:
  - Show/hide Admin Panel if group includes `admins`.
- UI pages:
  - Upload page: select video → request presigned S3 URL → upload.
  - Video list: fetch metadata from API, show thumbnails + play via signed URL.
  - Admin dashboard: delete videos.
- `.env` for frontend:
  - VITE_API_URL=https://n11817143-videoapp.cab432.com/api
  - Cognito settings are fetched at runtime from the backend via `/config`.
- Dockerfile for frontend.

## Deployment
- Create a `docker-compose.yml` with:
  - `backend` service (Express API).
  - `frontend` service (React build served via nginx).
  - `proxy` service (nginx reverse proxy, maps frontend at `/` and backend at `/api`).
- Backend container loads config dynamically from Parameter Store + Secrets Manager.
- Push both images to ECR:
  - `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2-backend`
  - `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2-frontend`
- Deployment flow:
  1. `aws sso login --profile n11817143-a2`
  2. `docker build/tag/push` backend + frontend images.
  3. On EC2: `docker-compose up -d`.

## Project Structure

- `server/` – Express API that exposes `/videos` endpoints, reads configuration from AWS Systems Manager Parameter Store and Secrets Manager, and integrates with Cognito, DynamoDB, and S3.
- `client/` – Vite + React single-page app that authenticates with Cognito using Amplify, uploads directly to S3 using presigned URLs, and manages playback/deletion workflows.
- `proxy/` – nginx reverse proxy that exposes the React UI at `/` and forwards `/api` to the backend service.
- `docker-compose.yml` – Orchestrates the three containers and tags images for the provided Amazon ECR repositories.

## Local Development

### Backend

```bash
cd server
npm install
npm run dev
```

Set AWS credentials in your environment so the API can fetch Parameter Store and Secrets Manager values. The service listens on `http://localhost:4000`.

### Frontend

```bash
cd client
cp .env.example .env
# populate Cognito values from Parameter Store
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies API calls to the domain configured in `VITE_API_URL`.

## Docker & Deployment

1. Authenticate to AWS: `aws sso login --profile n11817143-a2`.
2. Build and push the images:

   ```bash
   docker build -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2-backend:latest ./server
   docker build -t 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2-frontend:latest ./client
   aws ecr get-login-password --region ap-southeast-2 --profile n11817143-a2 | \
     docker login --username AWS --password-stdin 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com
   docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2-backend:latest
   docker push 901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2-frontend:latest
   ```

3. On the EC2 instance (`ec2-16-176-178-164.ap-southeast-2.compute.amazonaws.com`):

   ```bash
   docker-compose pull
   docker-compose up -d
   ```

The proxy container publishes port 80 and serves the React SPA while forwarding `/api/*` to the backend service.

## Requirements

- Generate complete backend code (`server/`) and frontend code (`client/`).
- Include Dockerfiles for both.
- Include `docker-compose.yml`.
- Include `config.js` that loads all AWS Parameter Store + Secrets Manager values.
- Ensure role-based access control with Cognito groups (users, admins).
- Make the system production-ready for Assignment 2 marking.

