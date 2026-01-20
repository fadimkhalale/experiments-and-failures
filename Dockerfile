# 1. Basis-Image wählen
FROM node:20-alpine

# 2. Arbeitsverzeichnis im Container festlegen
WORKDIR /usr/src/app

# 3. package.json und package-lock.json kopieren
COPY package*.json ./

# 4. Dependencies installieren
RUN apk add --no-cache python3 make g++ && \
    npm install --omit=dev && \
    apk del python3 make g++

# 5. Den Rest des App-Codes kopieren (inkl. public- und data-Ordner)
COPY server.js .
COPY config.json .
COPY hash-passwords.js .
COPY package.json .
COPY data/ ./data/
COPY public/ ./public/

# 6. Sicherstellen, dass die Ordner existieren
RUN mkdir -p /usr/src/app/public /usr/src/app/data/Dozenten /usr/src/app/data/Zuarbeit && \
    chmod -R 755 /usr/src/app/data /usr/src/app/public

# 7. Den Port freigeben
EXPOSE 3000

# 8. Startbefehl
CMD [ "npm", "start" ]