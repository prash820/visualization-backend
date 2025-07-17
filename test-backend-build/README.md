# test-backend-service Backend

A typescript backend service built with express.

## Features

- UserController
- AuthService
- FileUpload

## Quick Start

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /api` - API root

## Environment Variables

See `.env.example` for all available environment variables.

## Docker

```bash
# Build image
docker build -t test-backend-service .

# Run container
docker run -p 3001:3001 test-backend-service
```

## License

MIT