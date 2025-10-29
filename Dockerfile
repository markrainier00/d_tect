FROM node:18

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY . .

# Install Python dependencies safely
RUN pip install --break-system-packages -r forecast/requirements.txt

# Then install Node dependencies
RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
