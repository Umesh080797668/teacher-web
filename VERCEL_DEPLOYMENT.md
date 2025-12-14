# Deploy to Vercel - Complete Guide

## Overview
This guide shows you how to deploy BOTH the backend and web interface to Vercel for FREE (no Railway/Render needed).

## ✅ What I Changed

### Backend Changes:
- ✅ Added HTTP endpoint: `/api/web-session/generate-qr` - Generates QR codes without WebSockets
- ✅ Added polling endpoint: `/api/web-session/check-auth/:sessionId` - Check if QR was scanned
- ✅ Already Vercel-ready with `module.exports = app`

### Frontend Changes:
- ✅ Created `webSessionPolling.ts` - HTTP polling instead of WebSockets
- ✅ Updated login page to use HTTP polling (polls every 2 seconds)
- ✅ No more WebSocket connection errors!

## 🚀 Step 1: Deploy Backend to Vercel

### Option A: Using Vercel Dashboard (Easiest)

1. **Go to** https://vercel.com and sign in with GitHub
2. **Click "Add New..." → Project**
3. **Import** your `teacher` repository
4. **Configure:**
   - Framework Preset: **Other**
   - Root Directory: `mobile attendence/teacher_attendance/backend`
   - Build Command: (leave empty or `npm install`)
   - Output Directory: (leave empty)
   - Install Command: `npm install`
   
5. **Environment Variables** - Add these:
   ```
   MONGODB_URI=your_mongodb_connection_string
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_gmail_app_password
   JWT_SECRET=u78uwsjfh984juifirue89utujrue898tjnu589rugfu5r98gu589gjutr
   PORT=3004
   ```

6. **Click "Deploy"**

7. **Copy your backend URL** (e.g., `https://teacher-backend-abc123.vercel.app`)

### Option B: Using Vercel CLI

```bash
cd "/home/imantha/Desktop/Attendance/mobile attendence/teacher_attendance/backend"

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts and set environment variables when asked
```

## 🌐 Step 2: Deploy Web Interface to Netlify

1. **Go to** https://netlify.com dashboard
2. **Go to your site** (teacher-web)
3. **Site configuration → Environment variables**
4. **Update these variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
   NEXT_PUBLIC_WS_URL=https://your-backend.vercel.app
   JWT_SECRET=u78uwsjfh984juifirue89utujrue898tjnu589rugfu5r98gu589gjutr
   SESSION_TIMEOUT=86400000
   ```
   
5. **Trigger redeploy:**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"

## 🔧 Step 3: Create vercel.json for Backend (Optional but Recommended)

Create this file in the backend directory to optimize Vercel deployment:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## 📱 Step 4: Update Mobile App Backend URL

Update your mobile app to point to the Vercel backend:

1. Edit `.env` in the mobile app:
   ```
   BACKEND_URL=https://your-backend.vercel.app
   ```

2. Or update the hardcoded URL in your Dart code if needed

## ✅ How It Works Now

### Old (WebSocket - Didn't work on Vercel):
```
Web → WebSocket Connection → Backend
      ❌ Failed on Vercel serverless
```

### New (HTTP Polling - Works everywhere):
```
Web → HTTP POST /api/web-session/generate-qr → Backend → Returns QR
Web → HTTP GET /api/web-session/check-auth/:id (every 2 sec) → Backend → Returns auth status
Mobile → Scans QR → Authenticates with backend
Web → Polling detects auth → Logs in user
```

## 🧪 Testing

1. **Visit your Netlify URL**: `https://teacher-eight-chi.vercel.app` or your Netlify domain
2. **You should see:**
   - QR code generates immediately
   - No WebSocket errors in console
   - Mobile app can scan and authenticate
   - Web interface logs in after scanning

## 🐛 Troubleshooting

### Error: "Failed to generate QR code"
- Check backend environment variables on Vercel
- Check MongoDB connection string is correct
- Check Vercel backend logs: `vercel logs your-deployment-url`

### QR Code not authenticating
- Make sure mobile app points to the Vercel backend URL
- Check that mobile app can reach the backend
- Check Vercel function logs for errors

### Netlify build fails
- Make sure Node version is 20.9.0 in `netlify.toml`
- Check environment variables are set correctly
- Redeploy after updating env vars

## 💰 Cost

- ✅ Vercel Free Tier: 100GB bandwidth/month
- ✅ Netlify Free Tier: 100GB bandwidth/month
- ✅ MongoDB Atlas Free Tier: 512MB storage

**Total: $0/month** for development and small-scale use!

## 📊 Vercel vs Railway/Render

| Feature | Vercel | Railway/Render |
|---------|--------|----------------|
| WebSockets | ❌ No | ✅ Yes |
| HTTP APIs | ✅ Yes | ✅ Yes |
| Free Tier | ✅ 100GB | ⚠️ Limited credits |
| Serverless | ✅ Yes | ❌ No |
| Cold Starts | ⚠️ Yes (~1-2s) | ✅ No |

## 🎉 Benefits of This Approach

✅ **No more WebSocket errors**
✅ **Works on Vercel FREE tier**
✅ **No Railway/Render credits needed**
✅ **Backend + Frontend both on free platforms**
✅ **HTTP polling is reliable everywhere**
✅ **Auto-scaling with Vercel**

## 📝 Notes

- **Polling interval**: 2 seconds (can adjust in `webSessionPolling.ts`)
- **QR expiration**: 5 minutes
- **Session timeout**: 24 hours
- **Cold start**: First request might be slow (~1-2 seconds) on free tier
