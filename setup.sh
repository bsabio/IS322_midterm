#!/bin/bash

# Quick setup script for Portfolio Manager

echo "======================================"
echo "Portfolio Manager - Quick Setup"
echo "======================================"
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.7 or higher."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"
echo ""

# Install dependencies
echo "Installing dependencies..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit the .env file and add your API keys!"
    echo ""
    echo "You need to set:"
    echo "  1. GITHUB_TOKEN (from GitHub Settings → Developer settings → Personal access tokens)"
    echo "  2. GITHUB_OWNER (your GitHub username)"
    echo "  3. GITHUB_REPO (your repository name)"
    echo "  4. LLM_PROVIDER (openai or claude)"
    echo "  5. LLM_API_KEY (from OpenAI or Anthropic)"
    echo ""
    echo "Edit .env now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    fi
else
    echo "✓ .env file already exists"
fi

echo ""
echo "======================================"
echo "Setup complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Make sure your .env file has all required values"
echo "2. Load environment variables: source .env"
echo "3. Run the script: python3 portfolio_manager.py"
echo ""
echo "For detailed instructions, see USAGE.md"
