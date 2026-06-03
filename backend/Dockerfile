# *********************************************************
# Author:                Philip Awazie Donvip
# Year Created:          2026
# Description:           Production Docker image definition for the Node.js backend API.
# Modified By:           Philip Awazie Donvip
# Modified Date:         2026-05-31
# Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
# *********************************************************

# ========================================================
# Runtime image, dependencies, and startup command
# ========================================================

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5001

CMD ["npm", "run", "start"]
