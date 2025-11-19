#!/bin/bash

# Production Deployment Script for Maguva Magic World
# This script handles the complete production deployment process

set -e  # Exit on any error

echo "🚀 Starting production deployment for Maguva Magic World..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi

    print_success "Dependencies check passed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci
    print_success "Dependencies installed"
}

# Run type checking
run_type_check() {
    print_status "Running TypeScript type checking..."
    npm run type-check
    print_success "Type checking passed"
}

# Run linting
run_linting() {
    print_status "Running ESLint..."
    npm run lint
    print_success "Linting passed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm run test:run
    print_success "Tests passed"
}

# Build the application
build_application() {
    print_status "Building application for production..."
    npm run build
    print_success "Application built successfully"
}

# Analyze bundle size
analyze_bundle() {
    print_status "Analyzing bundle size..."
    npm run size-check
    print_success "Bundle analysis completed"
}

# Create deployment package
create_deployment_package() {
    print_status "Creating deployment package..."

    # Create deployment directory
    DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$DEPLOY_DIR"

    # Copy built files
    cp -r dist "$DEPLOY_DIR/"

    # Copy deployment files
    cp package.json "$DEPLOY_DIR/"
    cp SECURITY_HEADERS.md "$DEPLOY_DIR/"
    cp PRODUCTION_SETUP_GUIDE.md "$DEPLOY_DIR/"
    cp docker-compose.yml "$DEPLOY_DIR/" 2>/dev/null || true

    # Create deployment info
    cat > "$DEPLOY_DIR/deployment-info.txt" << EOF
Deployment Information
=====================
Build Date: $(date)
Build Version: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Node Version: $(node --version)
NPM Version: $(npm --version)
Environment: Production

Files included:
- dist/ (built application)
- package.json
- SECURITY_HEADERS.md
- PRODUCTION_SETUP_GUIDE.md
- docker-compose.yml (if available)
EOF

    print_success "Deployment package created: $DEPLOY_DIR"
    echo "📦 Deployment package: $DEPLOY_DIR"
}

# Pre-deployment checks
pre_deployment_checks() {
    print_status "Running pre-deployment checks..."

    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Please ensure environment variables are configured."
    fi

    # Check if dist directory exists
    if [ ! -d "dist" ]; then
        print_error "dist directory not found. Run build first."
        exit 1
    fi

    # Check bundle size
    BUNDLE_SIZE=$(du -sh dist | cut -f1)
    print_status "Bundle size: $BUNDLE_SIZE"

    if [ "$(du -s dist | cut -f1)" -gt 50000 ]; then
        print_warning "Bundle size is large (>50MB). Consider optimizing."
    fi

    print_success "Pre-deployment checks completed"
}

# Main deployment function
deploy() {
    print_status "Starting deployment process..."

    check_dependencies
    install_dependencies
    run_type_check
    run_linting
    run_tests
    build_application
    analyze_bundle
    pre_deployment_checks
    create_deployment_package

    print_success "🎉 Deployment preparation completed!"
    echo ""
    echo "Next steps:"
    echo "1. Review the deployment package in the '$DEPLOY_DIR' directory"
    echo "2. Configure your web server with the security headers from SECURITY_HEADERS.md"
    echo "3. Upload the 'dist' folder to your hosting provider"
    echo "4. Configure environment variables on your hosting platform"
    echo "5. Test the deployed application"
    echo ""
    echo "For detailed deployment instructions, see PRODUCTION_SETUP_GUIDE.md"
}

# Help function
show_help() {
    echo "Production Deployment Script for Maguva Magic World"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --skip-tests   Skip running tests"
    echo "  --skip-lint    Skip linting"
    echo "  --quick        Quick deployment (skip tests, lint, and analysis)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full deployment with all checks"
    echo "  $0 --quick           # Quick deployment"
    echo "  $0 --skip-tests      # Skip tests only"
}

# Parse command line arguments
SKIP_TESTS=false
SKIP_LINT=false
QUICK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --quick)
            QUICK=true
            SKIP_TESTS=true
            SKIP_LINT=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Modify functions based on flags
if [ "$SKIP_TESTS" = true ]; then
    run_tests() {
        print_status "Skipping tests..."
    }
fi

if [ "$SKIP_LINT" = true ]; then
    run_linting() {
        print_status "Skipping linting..."
    }
fi

if [ "$QUICK" = true ]; then
    analyze_bundle() {
        print_status "Skipping bundle analysis..."
    }
fi

# Run deployment
deploy
