#!/bin/bash

# Navigate to the public directory (assuming public folder is here)
cd /path/to/your/public/folder

# Fetch the latest updates from GitHub to avoid conflicts
git fetch origin

# Merge remote changes (in case there were any) into the local branch
git merge origin/main

# Add all the files in the public directory
git add .

# Commit the changes with a message (you can modify this message)
git commit -m "Update Hugo public folder"

# Push the changes to GitHub (force push if you want to overwrite remote changes)
git push origin main --force

# Optional: Print status after push
echo "Successfully updated public folder on GitHub!"
