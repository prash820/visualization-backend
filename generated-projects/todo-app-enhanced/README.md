# Generated Application - Monorepo Structure

This is a full-stack application generated with a monorepo structure using npm workspaces.

## Project Structure

```
project-root/
├── package.json          # Root package.json with workspaces
├── frontend/            # React frontend application
│   ├── package.json     # Frontend dependencies
│   ├── src/            # Frontend source code
│   └── public/         # Static assets
├── backend/            # Node.js backend application
│   ├── package.json    # Backend dependencies
│   └── src/           # Backend source code
└── shared/            # Shared code and types
    ├── package.json   # Shared dependencies
    └── index.ts      # Shared exports
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher for workspaces support)

### Installation

Install all dependencies for the entire monorepo:

```bash
npm install
```

This will install dependencies for all workspaces (frontend, backend, shared) in a single command.

### Development

Start both frontend and backend in development mode:

```bash
npm run dev
```

Or start them individually:

```bash
# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend
```

### Building

Build all applications:

```bash
npm run build
```

Or build individually:

```bash
# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend
```

### Testing

Run tests for all workspaces:

```bash
npm run test
```

### Linting

Run linting for all workspaces:

```bash
npm run lint
```

### Cleaning

Clean build artifacts for all workspaces:

```bash
npm run clean
```

## Workspace Scripts

### Root Scripts
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build all workspaces
- `npm run test` - Test all workspaces
- `npm run lint` - Lint all workspaces
- `npm run clean` - Clean all workspaces

### Frontend Scripts
- `npm run start` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run eject` - Eject from Create React App

### Backend Scripts
- `npm run dev` - Start development server with nodemon
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server
- `npm run test` - Run tests

## Benefits of Monorepo Structure

1. **Single Installation**: Run `npm install` once to install all dependencies
2. **Shared Dependencies**: Common dependencies are hoisted to the root
3. **Unified Scripts**: Run commands across all workspaces
4. **Code Sharing**: Easy to share types and utilities between frontend and backend
5. **Consistent Tooling**: Same linting, testing, and build tools across all workspaces

## Development Workflow

1. Install dependencies: `npm install`
2. Start development: `npm run dev`
3. Make changes in frontend/src or backend/src
4. Build for production: `npm run build`
5. Deploy as needed

## Generated Files

This application was automatically generated with:
- Frontend components and pages
- Backend controllers and services
- Shared types and utilities
- Complete monorepo configuration
- AI-generated missing components

For more details, see the `task-plan.json` and `documentation.json` files.
