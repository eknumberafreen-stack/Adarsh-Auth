#!/bin/bash

# SaaS Authentication Platform - Installation Script
# This script automates the installation process

set -e  # Exit on error

echo "================================================"
echo "  SaaS Authentication Platform - Installer"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Print colored message
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Check prerequisites
echo "Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js is installed: $NODE_VERSION"
else
    print_error "Node.js is not installed"
    print_info "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_success "npm is installed: $NPM_VERSION"
else
    print_error "npm is not installed"
    exit 1
fi

# Check MongoDB
if command_exists mongosh || command_exists mongo; then
    print_success "MongoDB client is installed"
else
    print_warning "MongoDB client not found"
    print_info "Make sure MongoDB is installed and running"
fi

# Check Redis
if command_exists redis-cli; then
    print_success "Redis client is installed"
else
    print_warning "Redis client not found"
    print_info "Make sure Redis is installed and running"
fi

echo ""
echo "================================================"
echo "  Installing Dependencies"
echo "================================================"
echo ""

# Install backend dependencies
print_info "Installing backend dependencies..."
npm install
print_success "Backend dependencies installed"

echo ""

# Install frontend dependencies
print_info "Installing frontend dependencies..."
cd frontend
npm install
cd ..
print_success "Frontend dependencies installed"

echo ""
echo "================================================"
echo "  Configuration"
echo "================================================"
echo ""

# Setup backend environment
if [ ! -f .env ]; then
    print_info "Creating backend .env file..."
    cp .env.example .env
    print_success "Backend .env created"
    print_warning "IMPORTANT: Edit .env and set your JWT secrets!"
else
    print_warning ".env already exists, skipping..."
fi

# Setup frontend environment
if [ ! -f frontend/.env.local ]; then
    print_info "Creating frontend .env.local file..."
    cp frontend/.env.local.example frontend/.env.local
    print_success "Frontend .env.local created"
else
    print_warning "frontend/.env.local already exists, skipping..."
fi

echo ""
echo "================================================"
echo "  Generating Secrets"
echo "================================================"
echo ""

print_info "Generating JWT secrets..."
echo ""
echo "Add these to your .env file:"
echo ""
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo ""

echo "================================================"
echo "  Installation Complete!"
echo "================================================"
echo ""
print_success "All dependencies installed"
print_success "Configuration files created"
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env and set your JWT secrets (see above)"
echo "2. Make sure MongoDB is running"
echo "3. Make sure Redis is running"
echo "4. Run: npm run dev"
echo "5. Open: http://localhost:3000"
echo ""
echo "For detailed instructions, see SETUP.md"
echo "For quick start, see QUICK_START.md"
echo ""
echo "================================================"
