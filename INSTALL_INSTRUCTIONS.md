# Installation Instructions

## The errors you're seeing are normal before installation!

The TypeScript errors in `api.ts` are expected because:
1. **'axios' error** - The axios package hasn't been installed yet
2. **'process' error** - The @types/node package hasn't been installed yet

## Follow these steps to fix:

### Step 1: Install Backend Dependencies
```bash
# In the root directory
npm install
```

### Step 2: Install Frontend Dependencies
```bash
# Navigate to frontend directory
cd frontend

# Install all dependencies
npm install
```

This will install:
- axios (for HTTP requests)
- @types/node (for Node.js types including 'process')
- All other required packages

### Step 3: Verify Installation
After running `npm install`, the errors should disappear. If they don't:

1. **Restart VS Code TypeScript Server**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "TypeScript: Restart TS Server"
   - Press Enter

2. **Close and reopen the files**

### Step 4: Configure Environment
```bash
# In root directory
cp .env.example .env

# In frontend directory
cp .env.local.example .env.local
```

### Step 5: Start the Application
```bash
# In root directory (starts both backend and frontend)
npm run dev
```

## Quick Install Script

### For Windows (PowerShell):
```powershell
# Run in root directory
npm install
cd frontend
npm install
cd ..
```

### For Linux/Mac:
```bash
# Run in root directory
npm install && cd frontend && npm install && cd ..
```

## Troubleshooting

### If you still see errors after installation:

1. **Delete node_modules and reinstall**:
```bash
# In frontend directory
rm -rf node_modules package-lock.json
npm install
```

2. **Check Node.js version**:
```bash
node --version
# Should be 18.0.0 or higher
```

3. **Clear VS Code cache**:
   - Close VS Code
   - Delete `.vscode` folder in project root
   - Reopen VS Code

## What Gets Installed

### Backend (root directory):
- express
- mongoose
- redis
- jsonwebtoken
- bcrypt
- And 10+ more packages

### Frontend (frontend directory):
- next
- react
- axios ← **This fixes the 'axios' error**
- @types/node ← **This fixes the 'process' error**
- And 10+ more packages

## After Installation

Once installed, you should see:
- ✅ No red errors in `api.ts`
- ✅ `node_modules` folder in both root and frontend directories
- ✅ `package-lock.json` files created

Then you can proceed with configuration and running the application!
