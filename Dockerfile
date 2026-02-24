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

# Build the image and push to Google Container Registry (GCR)
# gcloud builds submit --tag gcr.io/quixotic-strand-476615-s0/vivah-creations-crm-ui
# gcloud builds submit --tag gcr.io/quixotic-strand-476615-s0/swagat-events-ui


# Deploy to Cloud Run
# gcloud run deploy vivah-creations-crm-ui --image gcr.io/quixotic-strand-476615-s0/vivah-creations-crm-ui --platform managed --region asia-southeast1 --allow-unauthenticated
# gcloud run deploy swagat-events-ui --image gcr.io/quixotic-strand-476615-s0/swagat-events-ui --platform managed --region asia-southeast1 --allow-unauthenticated

