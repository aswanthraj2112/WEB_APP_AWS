# WEB_APP_AWS

Cloud-native video management platform deployed on AWS for CAB432 Assignment 2. The solution comprises a Dockerised React frontend, Express backend, and nginx reverse proxy that integrate with AWS managed services for storage, authentication, and configuration.

---

## Final AWS Configuration & Fix Report

- **Project**: CAB432 Assignment 2 — Cloud-Native Video Web App  
- **Student ID**: n11817143  
- **AWS Account**: `901444280953`  
- **Region**: `ap-southeast-2`

### 1. EC2

- **Instance ID**: `i-0aaedfc6a70038409`
- **Instance Role**: `CAB432-Instance-Role` (limited IAM)
- **Public IP**: `3.107.100.58`
- **Public DNS**: `ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com`
- **Status**: ✅ Running
- **Fix**: Backend services must bind only to security-group-approved ports (8080 or 5000). Do **not** bind Express to port 4000.

### 2. Route53

- **Hosted Zone**: `Z02680423BHWEVRU2JZDQ` (`cab432.com`)
- **Subdomain**: `n11817143-videoapp.cab432.com`
- **Record Type**: CNAME → `ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com`
- **DNS Sync**: ✅ Managed by `/usr/local/bin/check-and-fix-dns.sh`
- **Fix**: DNS mismatches resolved by switching to a CNAME that targets the EC2 public DNS. Auto-heal script with cron enforces the mapping hourly.

#### Manual Elastic IP + DNS update

When a static IP is required (for example, to terminate an SSL certificate or to remove the dependency on the instance public DNS name), follow the steps below. Ensure your AWS CLI profile `n11817143-a2` is configured with sufficient permissions.

1. **Allocate an Elastic IP in the VPC**

   ```bash
   aws ec2 allocate-address \
     --domain vpc \
     --region ap-southeast-2 \
     --profile n11817143-a2
   ```

   Capture the `AllocationId` and the new Elastic IP address from the output.

2. **Associate the Elastic IP with the EC2 instance**

   ```bash
   aws ec2 associate-address \
     --instance-id i-0aaedfc6a70038409 \
     --allocation-id <alloc-id> \
     --region ap-southeast-2 \
     --profile n11817143-a2
   ```

   Replace `<alloc-id>` with the `AllocationId` returned in step 1.

3. **Update Route53 with the new Elastic IP**

   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z02680423BHWEVRU2JZDQ \
     --profile n11817143-a2 \
     --change-batch '{
       "Changes": [{
         "Action": "UPSERT",
         "ResourceRecordSet": {
           "Name": "n11817143-videoapp.cab432.com",
           "Type": "A",
           "TTL": 60,
           "ResourceRecords": [{"Value": "<EIP>"}]
         }
       }]
     }'
   ```

   Replace `<EIP>` with the Elastic IP address allocated in step 1. DNS propagation typically completes within a few minutes, but allow up to an hour.

### 3. S3

- **Bucket**: `n11817143-a2`
- **Prefixes**:
  - `raw-videos/`
  - `transcoded-videos/`
  - `thumbnails/`
- **Status**: ✅ Verified with smoke tests (upload + presigned URL).

### 4. Security Group (`CAB432SG`)

Inbound rules (fixed by QUT, cannot be altered):

- ✅ 80 (HTTP, open)
- ✅ 443 (HTTPS, open)
- ✅ 8080 (open)
- ✅ 3000–3010 (open)
- ✅ 5000 (open)
- ✅ 5432 (open)
- ✅ 22 (restricted to QUT/private networks)

**Fixes & Guidance**:

- Frontend (React + nginx) → run on port 80.  
- Backend (Express) → bind to port 8080 (instead of 4000).  
- HTTPS (443) reserved for future TLS upgrade.  
- Only use the approved ports above.

### 5. DynamoDB

- **Table**: `VideosTable`
- **Key schema**:
  - Partition: `qut-username`
  - Sort: `id`
- **Index**: `OwnerIndex`
- **Status**: ✅ Put/Get smoke tested.

### 6. Cognito

- **User Pool ID**: retrieved from Parameter Store (`/n11817143/app/cognitoUserPoolId`)
- **App Client ID**: retrieved from Parameter Store (`/n11817143/app/cognitoClientId`)
- **Groups**: `users`, `admins`
- **Fix**: IAM policy prevents `cognito-idp:Describe*` calls—always read User Pool and Client IDs from Parameter Store.

### 7. Secrets Manager

- **Secret name**: `n11817143-a2-secret`
- **Payload**: `JWT_SECRET = cab432_A2_super_secret_key_11817143`
- **Status**: ✅ Accessible from the EC2 role.

### 8. Parameter Store

Namespaced under `/n11817143/app/`:

- `/cognitoClientId`
- `/cognitoUserPoolId`
- `/domainName`
- `/dynamoTable`
- `/dynamoOwnerIndex`
- `/maxUploadSizeMb` → `512`
- `/preSignedUrlTTL` → `600`
- `/s3Bucket` → `n11817143-a2`
- `/s3_raw_prefix` → `s3://n11817143-a2/raw/`
- `/s3_thumbnail_prefix` → `s3://n11817143-a2/thumbnails/`
- `/s3_transcoded_prefix` → `s3://n11817143-a2/transcoded/`
- **Status**: ✅ Verified retrievable.

### 9. ECR

- **Repository**: `901444280953.dkr.ecr.ap-southeast-2.amazonaws.com/n11817143-a2`
- **Status**: ✅ Image pulls tested.

### 10. Health & Automation

- Smoke tests for S3, DynamoDB, and presigned URLs: ✅
- DNS auto-heal script: `/usr/local/bin/check-and-fix-dns.sh` (cron, hourly). Logs at `/home/ubuntu/check-dns.log`.
- Frontend/Backend containers run behind nginx proxy on ports 80 and 8080.

### Final Deployment Mapping

- **Frontend (React)**: `http://n11817143-videoapp.cab432.com` served on port 80 via nginx.  
- **Backend (Express)**: `http://n11817143-videoapp.cab432.com/api` proxied to port 8080.  
- **AWS Services**:
  - S3 → video storage
  - DynamoDB → metadata
  - Cognito → authentication (identifiers from Parameter Store)
  - Secrets Manager → JWT secret
  - Parameter Store → configuration values

---

## General
- The application is a video management platform where authenticated users can upload, view, and manage videos.
- Backend: Node.js + Express, containerized with Docker.
- Frontend: React (Vite), with Cognito authentication and API integration.
- All persistent data must be externalized into AWS services (stateless app).
- Use AWS SDK v3.

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
- `VITE_API_URL=https://n11817143-videoapp.cab432.com/api` (optional in production; the frontend now falls back to `${window.location.origin}/api` when the variable is not provided)
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

Set AWS credentials in your environment so the API can fetch Parameter Store and Secrets Manager values. The service listens on `http://localhost:8080` (matching the production binding).

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

3. On the EC2 instance (`ec2-3-107-100-58.ap-southeast-2.compute.amazonaws.com`):

   ```bash
   docker-compose pull
   docker-compose up -d
   ```

The proxy container publishes port 80 and serves the React SPA while forwarding `/api/*` to the backend service on port 8080.

## Troubleshooting

### AWS SSO login validation error

If `aws sso login --profile n11817143-a2` fails with an error similar to:

```
1 validation error detected: Value 'ap-southeast-2_ABC123clientid' at 'clientId' failed to satisfy constraint: Member must satisfy regular expression pattern: [\w+]+
```

it means the SSO `clientId` being sent to AWS contains characters that do not match the allowed pattern. The AWS CLI automatically stores the correct client registration (an alphanumeric/underscore ID) under `~/.aws/sso/cache/`. Re-run `aws configure sso` and select the existing `n11817143-a2` profile so that the CLI refreshes the cached registration instead of reusing a manually edited value with hyphens. After refreshing the profile, retry `aws sso login`.

### Route53 host name is not used by the app

The frontend reads `VITE_API_URL` from `.env` (see `client/.env.example`) and uses that value for every API request. If the variable is not provided (for example when the site is deployed directly behind the reverse proxy), the code falls back to `${window.location.origin}/api`. At runtime it also fetches `/config` from the backend, which returns the Cognito Hosted UI domain that was loaded from Parameter Store (`/n11817143/app/domainName`). If either of these values points at the raw EC2 hostname instead of `https://n11817143-videoapp.cab432.com`, the browser will keep using the EC2 endpoint. Make sure:

1. The `.env` file in the frontend container/environment sets `VITE_API_URL=https://n11817143-videoapp.cab432.com/api`.
2. The Parameter Store key `/n11817143/app/domainName` is set to the same Route53 host.

With both settings in place, the SPA will call the API via the Route53 alias and Amplify will initialise Cognito using the custom domain reported by `/config`.

## Requirements

- Generate complete backend code (`server/`) and frontend code (`client/`).
- Include Dockerfiles for both.
- Include `docker-compose.yml`.
- Include `config.js` that loads all AWS Parameter Store + Secrets Manager values.
- Ensure role-based access control with Cognito groups (users, admins).
- Make the system production-ready for Assignment 2 marking.
