#!/bin/sh  

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting NestJS application..."
npm run start:dev
