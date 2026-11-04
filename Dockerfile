# Use Node.js 22 with Alpine Linux as the base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Install the Ionic CLI globally
RUN npm install -g @ionic/cli

# Copy the package files into the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the remaining project files
COPY . .

# Document the port used by the application
EXPOSE 8101

# Start the Ionic development server
CMD ["ionic", "serve", "--host=0.0.0.0", "--port=8101", "--no-open"]