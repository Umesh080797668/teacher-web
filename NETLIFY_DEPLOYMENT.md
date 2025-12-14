# Netlify Deployment Guide

This guide will help you deploy the web interface to Netlify.

## Prerequisites

1. **GitHub Account** - Your code should be pushed to a GitHub repository
2. **Netlify Account** - Sign up at [netlify.com](https://www.netlify.com/)
3. **Backend Running** - Ensure your backend is deployed at `https://teacher-eight-chi.vercel.app`

## Step 1: Prepare Your Repository

1. Make sure all changes are committed:
```bash
cd /home/imantha/Desktop/Attendance/web-interface
git add .
git commit -m "Add Netlify deployment configuration"
git push origin main
```

## Step 2: Connect to Netlify

### Option A: Netlify Dashboard (Recommended)

1. Go to [app.netlify.com](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and authorize Netlify
4. Select your repository
5. Configure build settings:
   - **Base directory**: `web-interface`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: `18`

### Option B: Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize new site
cd /home/imantha/Desktop/Attendance/web-interface
netlify init

# Follow the prompts:
# - Create & configure a new site
# - Choose your team
# - Site name: attendance-web-interface (or your choice)
# - Build command: npm run build
# - Publish directory: .next
```

## Step 3: Configure Environment Variables

In Netlify Dashboard:

1. Go to **Site settings** → **Environment variables**
2. Add the following variables:

```
NEXT_PUBLIC_API_URL=https://teacher-eight-chi.vercel.app
NEXT_PUBLIC_WS_URL=https://teacher-eight-chi.vercel.app
NEXT_PUBLIC_APP_URL=https://your-site-name.netlify.app
```

> **Note**: Replace `your-site-name.netlify.app` with your actual Netlify URL after deployment

## Step 4: Install Next.js Plugin

Netlify should automatically detect and install the `@netlify/plugin-nextjs` plugin. If not:

1. Go to **Integrations** → **Plugins**
2. Search for **"Next.js"** and install **"Essential Next.js"**

## Step 5: Deploy

### Automatic Deployment (GitHub Integration)
- Push to your main branch → Netlify automatically builds and deploys
- Every commit triggers a new deployment

### Manual Deployment (CLI)
```bash
cd /home/imantha/Desktop/Attendance/web-interface
netlify deploy --prod
```

## Step 6: Verify Deployment

1. Check build logs in Netlify Dashboard
2. Visit your site URL: `https://your-site-name.netlify.app`
3. Test the following:
   - **Admin Login**: `/login/admin`
   - **Teacher QR Login**: `/login`
   - **Admin Dashboard**: `/dashboard/admin`
   - **Teacher Dashboard**: `/dashboard/teacher`

## Step 7: Update Mobile App (Optional)

If you want to add the web interface URL to your mobile app:

1. Edit the QR scanner screen or add a button to open the web interface
2. Use the Netlify URL: `https://your-site-name.netlify.app`

## Troubleshooting

### Build Fails

**Error**: "Module not found" or dependency issues
```bash
# Clear cache and reinstall dependencies
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

**Error**: TypeScript errors
- Check `next.config.ts` → ensure `ignoreBuildErrors: false` is correct
- Fix TypeScript errors in your code

### WebSocket Connection Issues

**Error**: WebSocket fails to connect
- Verify `NEXT_PUBLIC_WS_URL` is set correctly in Netlify environment variables
- Ensure backend supports WebSocket connections (Socket.IO)
- Check CORS settings in backend

### Authentication Not Working

**Error**: Login fails or redirects incorrectly
- Verify `NEXT_PUBLIC_API_URL` points to your backend
- Check backend is running and accessible
- Verify JWT token generation in backend

### Environment Variables Not Loading

- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Restart build after adding environment variables
- Check variables are set in Netlify Dashboard (not just .env files)

## Custom Domain (Optional)

1. Go to **Domain settings** → **Add custom domain**
2. Follow DNS configuration instructions
3. Update `NEXT_PUBLIC_APP_URL` environment variable to your custom domain
4. Wait for SSL certificate to provision (automatic)

## Continuous Deployment

Netlify automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main
# Netlify automatically builds and deploys
```

## Deploy Previews

- Every pull request gets a preview deployment
- Test changes before merging to main
- Preview URL format: `deploy-preview-{pr-number}--your-site-name.netlify.app`

## Performance Optimization

### Enable Caching
Already configured in `netlify.toml` with Next.js plugin

### Image Optimization
Next.js Image component works automatically with Netlify

### Analytics (Optional)
1. Go to **Analytics** tab in Netlify Dashboard
2. Enable Netlify Analytics for $9/month (optional)

## Monitoring

### Build Status
- Check **Deploys** tab for build history
- View logs for each deployment

### Site Performance
- Lighthouse scores available in deploy details
- Monitor Core Web Vitals

## Rollback

If a deployment breaks something:

1. Go to **Deploys** tab
2. Find the last working deployment
3. Click **"Publish deploy"** to rollback

## Additional Resources

- [Netlify Docs](https://docs.netlify.com/)
- [Next.js on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Environment Variables](https://docs.netlify.com/environment-variables/overview/)

## Quick Commands Reference

```bash
# Local development
npm run dev

# Test production build locally
npm run build
npm run start

# Deploy to Netlify (manual)
netlify deploy --prod

# View site in browser
netlify open:site

# View admin dashboard
netlify open:admin
```

## Post-Deployment Checklist

- [ ] Site loads at Netlify URL
- [ ] Admin login works
- [ ] Teacher QR login generates QR code
- [ ] Mobile app can scan QR code and authenticate
- [ ] Admin dashboard shows all data
- [ ] Teacher dashboard shows filtered data
- [ ] WebSocket connection successful
- [ ] All API calls work correctly
- [ ] SSL certificate active (https)
- [ ] Environment variables set correctly
- [ ] Custom domain configured (if applicable)

## Support

If you encounter issues:
1. Check Netlify build logs
2. Verify environment variables
3. Test backend API endpoints directly
4. Check browser console for errors
5. Review [Netlify Support Forums](https://answers.netlify.com/)
