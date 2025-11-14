# Docker Setup Guide

This project includes Docker configuration for easy deployment and development.

## Prerequisites

1. **Docker Desktop** must be installed and running
   - Download from: https://www.docker.com/products/docker-desktop
   - Make sure Docker Desktop is started before running any Docker commands

2. **Environment Variables**
   - Copy `.env.example` to `.env` and fill in your API keys and configuration
   - All environment variables listed in `env.mjs` must be set

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Start Docker Desktop** (if not already running)

2. **Set up environment variables**:
   ```powershell
   # Copy the example file
   Copy-Item .env.example .env
   # Edit .env with your actual values
   ```

3. **Build and run**:
   ```powershell
   # Using the provided script
   .\docker-run.ps1
   
   # Or manually
   docker-compose build
   docker-compose up -d
   ```

4. **Access the application**:
   - Open http://localhost:3000 in your browser

### Option 2: Using Docker directly

1. **Build the image**:
   ```powershell
   docker build -t ai-content-generator .
   ```

2. **Run the container**:
   ```powershell
   docker run -d -p 3000:3000 --env-file .env --name ai-content-generator ai-content-generator
   ```

## Useful Commands

### View logs
```powershell
docker-compose logs -f
```

### Stop the container
```powershell
docker-compose down
```

### Stop and remove volumes
```powershell
docker-compose down -v
```

### Rebuild after code changes
```powershell
docker-compose up -d --build
```

### Access container shell
```powershell
docker-compose exec app sh
```

## Troubleshooting

### Docker Desktop not running
- Error: `The system cannot find the file specified`
- Solution: Start Docker Desktop application

### Port already in use
- Error: `port is already allocated`
- Solution: Change the port in `docker-compose.yml` or stop the service using port 3000

### Build fails
- Make sure all dependencies in `package.json` are valid
- Check that `pnpm-lock.yaml` exists and is up to date
- Try: `docker-compose build --no-cache`

### Environment variables not working
- Ensure `.env` file exists in the project root
- Check that all required variables are set
- Restart the container after changing `.env`: `docker-compose restart`

## Production Deployment

For production, consider:
- Using a reverse proxy (nginx, traefik)
- Setting up proper SSL/TLS certificates
- Using Docker secrets for sensitive data
- Configuring resource limits in docker-compose.yml
- Setting up proper logging and monitoring

