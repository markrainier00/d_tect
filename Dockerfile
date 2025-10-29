# Use Node as the base image
FROM node:18

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip

# Set the working directory
WORKDIR /app

# Copy everything into the container
COPY . .

# Install Node dependencies
RUN npm ci

# Install Python dependencies (adjust path if needed)
RUN pip install -r forecast/requirements.txt

# Expose the app port
EXPOSE 3000

# Run your app
CMD ["npm", "server.cjs"]
