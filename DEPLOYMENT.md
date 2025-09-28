# NexAgent Deployment Guide

## 🚀 Production Deployment

This guide covers deploying NexAgent to production environments.

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Environment variables configured
- Database (optional, for persistent storage)

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Workflow Engine
WORKFLOW_STORAGE_TYPE=localStorage
WORKFLOW_MAX_EXECUTION_TIME=300000
WORKFLOW_MAX_RETRY_COUNT=3

# OpenAI (for AI nodes)
OPENAI_API_KEY=your_openai_api_key

# Logging
LOG_LEVEL=warn
ENABLE_CONSOLE_LOGGING=false
```

### Build and Deploy

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build for Production**
   ```bash
   npm run build
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

### Deployment Platforms

#### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

#### AWS/GCP/Azure

1. Build the application
2. Upload to your cloud platform
3. Configure environment variables
4. Set up load balancing and SSL

### Performance Optimizations

- ✅ **Bundle Optimization**: Tree-shaking enabled
- ✅ **Image Optimization**: WebP/AVIF formats
- ✅ **Compression**: Gzip compression enabled
- ✅ **Caching**: HTTP caching headers configured
- ✅ **Error Boundaries**: Graceful error handling

### Security Considerations

- ✅ **Environment Variables**: Sensitive data in env vars
- ✅ **CORS**: Configured for production domains
- ✅ **Headers**: Security headers configured
- ✅ **Authentication**: Clerk integration for user management

### Monitoring

- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor performance metrics
- Set up uptime monitoring
- Configure log aggregation

### Scaling

- Use CDN for static assets
- Implement database storage for workflows
- Set up horizontal scaling
- Configure load balancing

## 🔧 Development vs Production

### Development
- Debug logs enabled
- Hot reloading
- Detailed error messages
- Local storage for workflows

### Production
- Debug logs disabled
- Optimized builds
- Error boundaries
- Persistent storage (optional)

## 📊 Health Checks

The application includes health check endpoints:

- `GET /api/health` - Basic health check
- `GET /api/workflows/health` - Workflow engine health

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors
   - Verify all imports are correct
   - Ensure environment variables are set

2. **Runtime Errors**
   - Check error boundaries
   - Verify API endpoints
   - Check console for errors

3. **Performance Issues**
   - Monitor bundle size
   - Check for memory leaks
   - Optimize images and assets

### Support

For deployment issues, check:
- Application logs
- Browser console
- Network requests
- Environment configuration
