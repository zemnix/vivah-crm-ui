FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# Build the Vite project
RUN npm run build

# Install 'serve' to serve the static files
RUN npm install -g serve

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Start static server
CMD ["serve", "-s", "dist", "-l", "8080"]

# --- Deployment commands (for reference) ---

# Build the image and push to Google Container Registry (GCR)
# gcloud builds submit --tag gcr.io/quixotic-strand-476615-s0/vivah-creations-crm-ui

# Deploy to Cloud Run
# gcloud run deploy vivah-creations-crm-ui --image gcr.io/quixotic-strand-476615-s0/vivah-creations-crm-ui --platform managed --region asia-southeast1 --allow-unauthenticated