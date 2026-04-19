# How to Fix the TypeScript Errors

## 🔴 Current Errors You're Seeing

In `frontend/lib/api.ts`:
- **Line 1**: `Cannot find module 'axios'`
- **Line 3**: `Cannot find name 'process'`

## ✅ Why These Errors Appear

These are **NOT code errors** - they appear because the npm packages haven't been installed yet!

Think of it like this:
- The code is trying to use `axios` (a library)
- But the library hasn't been downloaded yet
- So TypeScript says "I can't find this!"

## 🚀 How to Fix (Simple Steps)

### Option 1: Run the Install Script

**Windows:**
```bash
install-frontend.bat
```

**Linux/Mac:**
```bash
chmod +x install-frontend.sh
./install-frontend.sh
```

### Option 2: Manual Installation

```bash
# Navigate to frontend folder
cd frontend

# Install all packages
npm install
```

This will download and install:
- ✅ axios (fixes the 'axios' error)
- ✅ @types/node (fixes the 'process' error)
- ✅ All other required packages

## ⏱️ How Long Does It Take?

- **First time**: 2-5 minutes (downloading packages)
- **After that**: Instant (packages are cached)

## 🔄 After Installation

1. **Wait for installation to complete**
   - You'll see "Installation Successful!" message

2. **Restart TypeScript Server in VS Code**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type: `TypeScript: Restart TS Server`
   - Press Enter

3. **Check the file**
   - The red errors should be gone!
   - If not, close and reopen `api.ts`

## 📦 What Gets Installed?

When you run `npm install` in the frontend folder, it installs:

```
node_modules/
├── axios/              ← Fixes 'axios' error
├── @types/node/        ← Fixes 'process' error
├── next/
├── react/
├── typescript/
└── ... (50+ packages total)
```

## 🎯 Expected Result

**Before Installation:**
```typescript
import axios from 'axios'  // ❌ Error: Cannot find module 'axios'
const API_URL = process.env.NEXT_PUBLIC_API_URL  // ❌ Error: Cannot find name 'process'
```

**After Installation:**
```typescript
import axios from 'axios'  // ✅ No error
const API_URL = process.env.NEXT_PUBLIC_API_URL  // ✅ No error
```

## 🆘 Still Having Issues?

### Issue 1: "npm: command not found"
**Solution**: Install Node.js from https://nodejs.org/

### Issue 2: Installation fails
**Solution**: 
```bash
# Delete old files and try again
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue 3: Errors still showing after installation
**Solution**:
1. Close VS Code completely
2. Reopen VS Code
3. Open the project folder
4. The errors should be gone

### Issue 4: "Permission denied"
**Solution** (Linux/Mac):
```bash
sudo npm install
```

## 📝 Summary

1. ✅ The code is correct
2. ✅ The errors are expected before installation
3. ✅ Run `npm install` in the frontend folder
4. ✅ Restart TypeScript server
5. ✅ Errors will disappear

**The errors are temporary and will be fixed once you install the dependencies!**
