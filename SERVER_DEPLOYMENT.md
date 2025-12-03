# Server Deployment Guide

This guide explains how to deploy the Stronghold Lobby backend server.

## Overview

The server is a Node.js/Express application with Socket.IO for real-time communication. It handles:
- Custom lobbies (non-Steam)
- Elo rating system
- Friend system
- Direct messaging
- Lobby invitations

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- A hosting service (see options below)

## Deployment Options

### Option 1: Deploy to Render.com (Recommended - Free Tier Available)

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: `stronghold-lobby-server`
     - **Root Directory**: `server`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node index.js`
     - **Plan**: Free (or paid for better performance)

3. **Environment Variables** (if needed):
   - No special environment variables required by default
   - The server runs on the port provided by `process.env.PORT` (Render sets this automatically)

4. **Update server code for production**:
   Edit `server/index.js` line 688-690 to use dynamic port:
   ```javascript
   const PORT = process.env.PORT || 3001
   server.listen(PORT, '0.0.0.0', () => {
       console.log(`SERVER RUNNING on port ${PORT}`)
   })
   ```

5. **Deploy**: Render will automatically deploy when you push to your repository

6. **Get your server URL**: After deployment, Render will provide a URL like:
   `https://stronghold-lobby-server.onrender.com`

7. **Update client to use production server**:
   Edit `src/context/UserContext.tsx` to use your production URL:
   ```typescript
   const SOCKET_URL = 'https://stronghold-lobby-server.onrender.com'
   ```

### Option 2: Deploy to Railway.app

1. **Create a Railway account** at [railway.app](https://railway.app)

2. **Deploy from GitHub**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect the Node.js app

3. **Configure Root Directory**:
   - In Settings → Root Directory, set to `server`

4. **Update port configuration** (same as Render)

5. **Get deployment URL** and update client

### Option 3: Deploy to Your Own VPS (DigitalOcean, AWS, etc.)

1. **SSH into your server**

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone your repository**:
   ```bash
   git clone https://github.com/GRhin/stronghold-lobby.git
   cd stronghold-lobby/server
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up PM2 for process management**:
   ```bash
   sudo npm install -g pm2
   pm2 start index.js --name stronghold-server
   pm2 save
   pm2 startup
   ```

6. **Configure firewall**:
   ```bash
   sudo ufw allow 3001
   ```

7. **Set up Nginx as reverse proxy** (optional but recommended):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Set up SSL with Let's Encrypt** (recommended):
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Required Code Changes for Production

### 1. Update server to use dynamic port

Edit `server/index.js` (around line 688):

```javascript
const PORT = process.env.PORT || 3001
server.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER RUNNING on port ${PORT}`)
})
```

### 2. Update CORS for production

Edit `server/index.js` (around line 14-17):

```javascript
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*", // Set to your client URL in production
        methods: ["GET", "POST"]
    }
})
```

### 3. Update client connection URL

Edit `src/context/UserContext.tsx`:

```typescript
// Replace localhost with your production server URL
const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001'
```

Then create a `.env` file in the root directory:
```
REACT_APP_SERVER_URL=https://your-server-url.com
```

## Data Persistence

The server stores user data in `users.json` file. For production:

1. **Backup regularly**: Set up automated backups of `users.json`
2. **Consider a database**: For better reliability, migrate to MongoDB or PostgreSQL for production

## Monitoring

### Logs
- **Railway/Render**: Check deployment logs in their dashboard
- **VPS with PM2**: Use `pm2 logs stronghold-server`

### Health Check
Create a simple health check endpoint in `server/index.js`:

```javascript
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})
```

## Testing the Deployment

1. **Check server is running**:
   ```bash
   curl https://your-server-url.com/health
   ```

2. **Test Socket.IO connection**:
   - Build and run your client application
   - Check browser console for connection messages
   - Look for "Connected to server" or similar messages

3. **Check server logs** for any errors

## Troubleshooting

### Connection Issues
- Verify CORS settings match your client URL
- Check firewall/security group rules
- Ensure WebSocket connections are allowed

### Port Issues
- Make sure the server binds to `0.0.0.0`, not just `localhost`
- Verify the PORT environment variable is set correctly

### Data Loss
- Regularly backup `users.json`
- Consider using a database for production

## Scaling Considerations

For production with many users:

1. **Use Redis for session storage**
2. **Enable Socket.IO adapter** for multiple server instances
3. **Use a proper database** (PostgreSQL/MongoDB)
4. **Add rate limiting** to prevent abuse
5. **Implement proper error logging** (e.g., Sentry)

## Security Checklist

- [ ] Enable HTTPS (SSL/TLS)
- [ ] Restrict CORS to your client domain only
- [ ] Add rate limiting
- [ ] Validate all incoming data
- [ ] Use environment variables for secrets
- [ ] Enable firewall rules
- [ ] Regular security updates (`npm audit fix`)
- [ ] Monitor for suspicious activity

## Cost Estimate

- **Render Free Tier**: $0/month (sleeps after 15min inactivity)
- **Render Starter**: $7/month (always on)
- **Railway**: ~$5-10/month based on usage
- **DigitalOcean Droplet**: $5-10/month
- **AWS EC2**: ~$5-15/month

## Quick Start (Render.com)

1. Push code to GitHub
2. Sign up at render.com
3. Create Web Service from your repo
4. Set root directory to `server`
5. Deploy
6. Update client with server URL
7. Rebuild and distribute client app

That's it! Your server is now deployed and accessible to your users.
