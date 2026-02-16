# Development Setup - Automatic Prisma Integration

## 🚀 Quick Start (Recommended)

### Option 1: Use the dev.bat script (Windows)

```bash
dev.bat
```

This will:

1. ✅ Check and generate Prisma client
2. ✅ Update database schema
3. ✅ Start Next.js dev server
4. ✅ Report Card Pipeline ready immediately!

### Option 2: Use npm with automatic pre-dev hook

```bash
npm run dev
```

This will:

1. ✅ Automatically run `predev` script
2. ✅ Check if Prisma client needs generation
3. ✅ Update database if schema changed
4. ✅ Start dev server

### Option 3: Manual full setup

```bash
npm run dev:full
```

This will:

1. ✅ Force generate Prisma client
2. ✅ Force push database schema
3. ✅ Start dev server

## 📋 What Happens Automatically

When you run `npm run dev` or `dev.bat`:

```
🔧 [PRE-DEV] Preparing development environment...

📦 [PRE-DEV] Checking Prisma client...
✅ [PRE-DEV] Prisma client is up to date

📤 [PRE-DEV] Checking database schema...
✅ [PRE-DEV] Database schema is up to date

🎉 [PRE-DEV] Development environment ready!

📋 [PRE-DEV] Report Card Pipeline is ready to use:
   → Navigate to: /dashboard/dos/curriculum/approvals
   → Click "Approve & Send Report Cards"
   → Watch console for real-time progress

▲ Next.js 16.0.10 (Turbopack)
- Local:         http://localhost:3000
✓ Ready in 2.1s
```

## 🎯 No More Manual Commands!

You **no longer need** to run:

- ❌ `npx prisma generate`
- ❌ `npx prisma db push`
- ❌ `setup-report-card-pipeline.bat`

Everything happens automatically when you start the dev server! 🎉

## 🔧 How It Works

### Pre-Dev Script (`scripts/pre-dev.js`)

The script:

1. Checks if Prisma client exists
2. Checks if schema.prisma is newer than generated client
3. Generates client only if needed
4. Pushes schema only if changed
5. Starts dev server

### NPM Lifecycle Hook

NPM automatically runs `predev` before `dev`:

```json
{
  "scripts": {
    "predev": "node scripts/pre-dev.js",
    "dev": "next dev"
  }
}
```

## 🐛 Troubleshooting

### Issue: Pre-dev script fails

**Solution**: Use `dev.bat` instead, which has better error handling

### Issue: Prisma client not updating

**Solution**: Run `npm run dev:full` to force regeneration

### Issue: Database connection error

**Solution**: Check `.env` file for correct `DATABASE_URL`

### Issue: Schema changes not applied

**Solution**: Delete `node_modules/.prisma` and run `dev.bat`

## 📊 Development Workflow

### Normal Development

```bash
# Just run this every time
npm run dev
# or
dev.bat
```

### After Schema Changes

```bash
# Same command - it detects changes automatically
npm run dev
# or
dev.bat
```

### Force Full Regeneration

```bash
npm run dev:full
```

## ✅ Verification

After starting the dev server, verify everything works:

1. **Check console output**:

   ```
   ✅ [PRE-DEV] Prisma client generated
   ✅ [PRE-DEV] Database schema updated
   🎉 [PRE-DEV] Development environment ready!
   ```

2. **Test Report Card Pipeline**:
   - Navigate to: http://localhost:3000/dashboard/dos/curriculum/approvals
   - Select class and subject
   - Click "Approve & Send Report Cards"
   - Watch console for progress

3. **Check database**:
   ```javascript
   // New models should exist
   db.pdf_storage.find();
   db.published_reports.find();
   ```

## 🎉 Success!

Your development environment now:

- ✅ Automatically updates Prisma client
- ✅ Automatically updates database schema
- ✅ Report Card Pipeline works immediately
- ✅ No manual commands needed
- ✅ Fast startup (only updates when needed)

## 📝 Summary

| Command               | When to Use                          |
| --------------------- | ------------------------------------ |
| `npm run dev`         | Normal development (recommended)     |
| `dev.bat`             | Windows users, better error handling |
| `npm run dev:full`    | Force full regeneration              |
| `npm run db:generate` | Manual Prisma client generation      |
| `npm run db:push`     | Manual database schema push          |

**Recommended**: Use `dev.bat` on Windows or `npm run dev` on other platforms.

## 🚀 Next Steps

1. Run `dev.bat` or `npm run dev`
2. Wait for "Development environment ready!"
3. Navigate to approvals page
4. Test the Report Card Pipeline
5. Start coding! 🎉
