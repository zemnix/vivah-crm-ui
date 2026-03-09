FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Enable pnpm via Corepack
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy app source
COPY . .

# Build the Vite project
RUN pnpm run build

# Install 'serve' to serve the static files
RUN pnpm add -g serve

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Start static server
CMD ["serve", "-s", "dist", "-l", "8080"]

# --- Deployment commands (for reference) ---

# gcloud builds submit --tag asia-south1-docker.pkg.dev/project-5a4519c0-86b5-41d1-92a/vivah-repo/vivah-creations-crm-ui

# gcloud run deploy vivah-creations-crm-ui --image asia-south1-docker.pkg.dev/project-5a4519c0-86b5-41d1-92a/vivah-repo/vivah-creations-crm-ui --platform managed --region asia-south1 --allow-unauthenticated