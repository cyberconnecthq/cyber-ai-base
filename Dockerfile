FROM alpine:3.19

ENV NODE_VERSION 23.3.0

# Install pnpm globally
RUN npm install -g pnpm@9.4.0

# Set the working directory
WORKDIR /app

# Add configuration files and install dependencies
ADD pnpm-workspace.yaml /app/pnpm-workspace.yaml
ADD package.json /app/package.json
ADD .npmrc /app/.npmrc
ADD tsconfig.json /app/tsconfig.json
ADD pnpm-lock.yaml /app/pnpm-lock.yaml
ADD packages /app/packages
RUN pnpm i
RUN pnpm build
COPY . .

# Add the documentation
# ADD docs /app/docs
# RUN pnpm i

# Add the rest of the application code

# Add the environment variables
ADD scripts /app/scripts
# ADD .env /app/.env

# Command to run the container
# CMD ["tail", "-f", "/dev/null"]
CMD ["pnpm", "start"]
