#!/bin/bash

echo "================================================"
echo "  Installing Frontend Dependencies"
echo "================================================"
echo ""

cd frontend

echo "Installing packages..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "  Installation Successful!"
    echo "================================================"
    echo ""
    echo "The TypeScript errors should now be gone."
    echo ""
    echo "Next steps:"
    echo "1. Restart VS Code TypeScript Server"
    echo "   Press Ctrl+Shift+P and type 'TypeScript: Restart TS Server'"
    echo "2. Close and reopen api.ts"
    echo "3. The errors should disappear"
    echo ""
else
    echo ""
    echo "================================================"
    echo "  Installation Failed"
    echo "================================================"
    echo ""
    echo "Please check your internet connection and try again."
    echo ""
fi
