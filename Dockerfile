FROM node:18

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip

# Make python3 available as python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Copy app files
WORKDIR /app
COPY . .

# Install Node dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.cjs"]
