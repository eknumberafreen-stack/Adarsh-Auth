# Fix tsconfig.json Error

## Error: "Cannot find type definition file for 'react'"

This error appears because TypeScript can't find the React type definitions.

## Solution 1: Restart TypeScript Server (Quickest)

1. In VS Code, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `TypeScript: Restart TS Server`
3. Press Enter
4. Wait a few seconds
5. The error should disappear

## Solution 2: Verify React Types Are Installed

```bash
cd frontend
npm list @types/react
```

If it shows "not installed", run:
```bash
npm install --save-dev @types/react @types/react-dom
```

## Solution 3: Reload VS Code Window

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Developer: Reload Window`
3. Press Enter
4. VS Code will reload and the error should be gone

## Solution 4: Close and Reopen the File

1. Close `tsconfig.json`
2. Close VS Code completely
3. Reopen VS Code
4. Open the project
5. Open `tsconfig.json` again

## Why This Happens

After running `npm install`, TypeScript needs to reload its type definitions. The `skipLibCheck: true` option in tsconfig.json should prevent this error, but sometimes VS Code's TypeScript server needs a restart to recognize the newly installed packages.

## Quick Fix Command

Run this in the frontend directory:
```bash
npm install && code --reuse-window .
```

This reinstalls packages and reopens VS Code.

## Expected Result

After following any of the solutions above, you should see:
- ✅ No errors in `tsconfig.json`
- ✅ No errors in `api.ts`
- ✅ All TypeScript files working correctly

## If Error Persists

Delete the TypeScript cache:
```bash
cd frontend
rm -rf node_modules/.cache
rm -rf .next
```

Then restart VS Code.
