# Deployment Guide

## Environments

Use three environments:

| Environment | Purpose |
|---|---|
| Local | Developer machine |
| Staging | Testing before production |
| Production | Live users |

## Required Environment Variables

Backend:

```env
NODE_ENV=
PORT=
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
UPLOAD_DRIVER=
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
FCM_SERVER_KEY=
```

Web:

```env
VITE_API_URL=
VITE_APP_NAME=
```

Mobile:

```env
API_URL=
APP_NAME=
```

## Deployment Options

### Simple MVP

- Backend: Render / Railway / VPS
- Web: Vercel / Netlify / VPS
- Database: Managed PostgreSQL/MySQL
- Uploads: Cloudinary or S3-compatible bucket

### Production

- Backend: VPS / AWS EC2 / container platform
- Web: Vercel or Nginx
- Database: Managed PostgreSQL
- Storage: S3-compatible
- Reverse proxy: Nginx
- SSL: Let's Encrypt
- Monitoring: UptimeRobot + logs
- Backups: daily DB backup

## Build Commands

Backend:

```bash
npm install
npm run build
npm run start
```

Web:

```bash
npm install
npm run build
```

Mobile Android:

```bash
npm install
npx react-native run-android
```

## Production Checklist

- [ ] Backend health endpoint works
- [ ] Frontend points to production API
- [ ] Database migrations applied
- [ ] Seeds applied
- [ ] Admin user created
- [ ] SSL enabled
- [ ] Uploads tested
- [ ] Logs tested
- [ ] Backup tested
- [ ] Error handling verified
