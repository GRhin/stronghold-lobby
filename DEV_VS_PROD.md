# Development vs Production Configuration

## How It Works

The app now automatically detects whether you're running in development or production mode and connects to the appropriate server:

### Development Mode (`npm run dev`)
- **Server URL**: `http://localhost:3001`
- **When**: Running with `npm run dev`
- **Purpose**: Connect to your local server for testing

### Production Mode (Built App)
- **Server URL**: `https://stronghold-lobby.onrender.com`
- **When**: Running the built/packaged application
- **Purpose**: Connect to the deployed Render server

## How to Use

### For Development
1. Start your local server: `npm run server` (or included in `npm run dev`)
2. Start the app: `npm run dev`
3. App will automatically connect to `localhost:3001`

### For Production
1. Build the app: `npm run build`
2. Install and run the built app
3. App will automatically connect to Render server

## Auto-Deploy on Render

When you push changes to GitHub:
- **Server code** (`server/` directory): Automatically deploys to Render (if auto-deploy is enabled)
- **Desktop app**: You need to rebuild and redistribute to users

## Configuration Location

The server URL logic is in [`src/socket.ts`](file:///c:/Users/Jared/Documents/coding/stronghold-lobby/src/socket.ts):

```typescript
const isDevelopment = import.meta.env.DEV
const SERVER_URL = isDevelopment 
    ? 'http://localhost:3001' 
    : 'https://stronghold-lobby.onrender.com'
```

## Console Output

You'll see in the browser console which mode you're in:
- Development: `Connecting to server: http://localhost:3001 (Development mode)`
- Production: `Connecting to server: https://stronghold-lobby.onrender.com (Production mode)`
