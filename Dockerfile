FROM node:18-bullseye

# Install Python 3.9, venv, pip, and distutils
RUN apt-get update && apt-get install -y \
    python3 python3-venv python3-distutils python3-pip \
    && ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy Node and Python files
COPY . .

# Install Node dependencies
RUN npm install

# Create Python virtual environment and install dependencies
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r forecast/requirements.txt

# Make venv binaries available in PATH
ENV PATH="/opt/venv/bin:$PATH"

# Expose port
EXPOSE 3000

# Start Node server
CMD ["node", "server.cjs"]
