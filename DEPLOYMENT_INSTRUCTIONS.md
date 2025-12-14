# Deployment Instructions for Web Interface

## Problem
The web interface requires WebSocket connections which are **NOT supported** on:
- Netlify (serverless)
- Vercel (serverless)

## Solution
You need to deploy the backend server separately to a platform that supports WebSockets.

## Recommended: Deploy Backend to Railway.app

### Step 1: Prepare Backend for Deployment

1. Navigate to your backend directory:
```bash
cd "/home/imantha/Desktop/Attendance/mobile attendence/teacher_attendance/backend"
```

2. Make sure you have a `package.json` with a start script (already present)

3. Create a `.env` file for Railway with your MongoDB connection string and other env variables

### Step 2: Deploy to Railway

1. **Sign up for Railway**: Go to https://railway.app and sign up (free account available)

2. **Install Railway CLI** (optional but recommended):
```bash
npm install -g @railway/cli
```

3. **Deploy using Railway Dashboard** (easier):
   - Click "New Project" → "Deploy from GitHub repo"
   - Connect your GitHub account
   - Select your `teacher` repository
   - Railway will auto-detect the Node.js app
   - Set the root directory to: `mobile attendence/teacher_attendance/backend`
   - Add environment variables:
     - `MONGODB_URI` - Your MongoDB connection string
     - `EMAIL_USER` - Your Gmail address
     - `EMAIL_PASS` - Your Gmail app password
     - `JWT_SECRET` - Your JWT secret key
     - `PORT` - 3004 (or Railway will assign automatically)

4. **Get your Railway URL**:
   - After deployment, Railway will give you a URL like: `https://your-app.railway.app`
   - Copy this URL

### Step 3: Update Web Interface Environment Variables

Update your Netlify environment variables with the Railway backend URL:

1. Go to your Netlify dashboard
2. Site settings → Environment variables
3. Update these variables:
   - `NEXT_PUBLIC_API_URL` = `https://your-app.railway.app`
   - `NEXT_PUBLIC_WS_URL` = `https://your-app.railway.app`

### Step 4: Redeploy Netlify Site

After updating the environment variables, trigger a new deployment on Netlify.

## Alternative: Deploy Backend to Render.com

Render.com is another free alternative:

1. Go to https://render.com and sign up
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Set build command: `cd "mobile attendence/teacher_attendance/backend" && npm install`
5. Set start command: `node server.js`
6. Add environment variables (same as above)
7. Deploy and get your Render URL
8. Update Netlify environment variables with the Render URL

## Alternative: Deploy Backend to Your Own VPS

If you have a VPS server:

```bash
# SSH to your server
ssh user@your-server.com

# Clone repository
git clone https://github.com/Umesh080797668/teacher.git
cd teacher/mobile\ attendence/teacher_attendance/backend

# Install dependencies
npm install

# Install PM2 for process management
npm install -g pm2

# Set up environment variables
nano .env
# Add all your environment variables

# Start with PM2
pm2 start server.js --name teacher-backend
pm2 save
pm2 startup
```

## Important Notes

1. **MongoDB Connection**: Make sure your MongoDB allows connections from the deployment platform's IP addresses
2. **CORS**: The backend already has CORS configured to allow all origins
3. **WebSocket Support**: Railway, Render, and VPS all support WebSocket connections
4. **Free Tiers**: Both Railway and Render offer free tiers suitable for development/testing

## Testing

After deployment, test the WebSocket connection:
1. Open browser console on your Netlify site
2. You should see "WebSocket connected" in the console
3. QR code should generate without errors
