#!/bin/bash

# Navigate to the public directory (current directory)
cd "/Users/igorchen/IC\ WEB/pehtheme-hugo/public"

# Fetch the latest updates from GitHub to avoid conflicts
git fetch origin

# Merge remote changes (in case there were any) into the local branch
git merge origin/main

# Add all the files in the public directory
git add .

# Commit the changes with a message (you can modify this message)
git commit -m "Update Hugo public folder"

# Push the changes to GitHub
git push origin main

# Optional: Print status after push
echo "Successfully updated public folder on GitHub!"
