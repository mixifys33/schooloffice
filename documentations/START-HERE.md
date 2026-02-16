# 🚀 Report Card Pipeline - START HERE

## ⚠️ First Time Setup (One-Time Only)

If you're seeing Prisma errors, run this **ONCE**:

```bash
fix-prisma-lock.bat
```

This will:

1. Stop all Node processes
2. Clear Prisma cache
3. Generate Prisma client fresh
4. Fix file lock issues

## ✅ Normal Development (Every Time)

After the first-time setup, just run:

```bash
dev.bat
```

This will:

1. Check Prisma client
2. Update database schema
3. Start development server
4. Report Card Pipeline ready!

## 🎯 Quick Test

1. **Start server**: `dev.bat`
2. **Open browser**: http://localhost:3000/dos/curriculum/approvals
3. **Select** class and subject
4. **Click** "Approve & Send Report Cards"
5. **Watch** console for progress
6. **View** results with URLs

## 🔧 Troubleshooting

### Issue: EPERM error (file lock)

**Solution**: Run `fix-prisma-lock.bat`

### Issue: Prisma client not found

**Solution**: Run `fix-prisma-lock.bat`

### Issue: Schema changes not applied

**Solution**: Run `fix-prisma-lock.bat`

## 📚 Documentation

- **This file**: Quick start guide
- **DEVELOPMENT-SETUP.md**: Detailed setup info
- **REPORT-CARD-PIPELINE-COMPLETE.md**: Complete system guide
- **REPORT-CARD-PIPELINE-FLOW.md**: Visual flow diagrams

## 🎉 That's It!

1. Run `fix-prisma-lock.bat` (first time only)
2. Run `dev.bat` (every time)
3. Test the Report Card Pipeline
4. Start coding!

**The system is ready to use immediately when the dev server starts!**
