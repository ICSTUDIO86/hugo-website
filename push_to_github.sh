#!/bin/bash

# Navigate to the main project directory
cd "/Users/igorchen/IC WEB/pehtheme-hugo"

# Generate latest Hugo build
echo "Building Hugo site..."
hugo

# Fetch the latest updates from GitHub to avoid conflicts
echo "Fetching latest changes..."
git fetch origin

# Add the public directory (now that it's not ignored)
echo "Adding public folder to git..."
git add public/

# Also add any other changes
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "No changes to commit."
else
    # Commit the changes with a message
    echo "Committing changes..."
    git commit -m "Update Hugo public folder and site content"
    
    # Push the changes to GitHub
    echo "Pushing to GitHub..."
    git push origin main
    
    echo "Successfully updated site on GitHub!"
fi
