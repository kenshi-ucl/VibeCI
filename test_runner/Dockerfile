FROM node:20-alpine

WORKDIR /app

# Install git for potential git operations
RUN apk add --no-cache git

# Copy test runner script
COPY run-tests.sh /app/run-tests.sh
RUN chmod +x /app/run-tests.sh

# Set environment variables
ENV CI=true
ENV NODE_ENV=test

ENTRYPOINT ["/app/run-tests.sh"]
