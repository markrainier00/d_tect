FROM node:18

RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY . .

# Install Python requirements manually (safe way)
RUN pip install --break-system-packages -r forecast/requirements.txt

# Install Node dependencies
RUN npm install

EXPOSE 3000

CMD ["npm", "server.cjs"]
