FROM node:18

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Make python3 available as python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy Node and Python files
COPY . .

# Install Node dependencies
RUN npm install

# Install Python dependencies in virtual environment
RUN python -m pip install --upgrade pip \
    && python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r forecast/requirements.txt

# Make venv binaries available in PATH
ENV PATH="/opt/venv/bin:$PATH"

# Expose port
EXPOSE 3000

# Start Node server
CMD ["node", "server.cjs"]
