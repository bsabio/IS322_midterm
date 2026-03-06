# Portfolio Manager - Usage Guide

## Overview
This script automates updating your GitHub Pages portfolio by:
1. Fetching `projects.json` from your GitHub repository
2. Using an LLM (OpenAI or Claude) to format your unstructured text
3. Adding the new project to the JSON file
4. Committing and pushing changes to GitHub

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Get API Keys

#### GitHub Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "Portfolio Manager"
4. Select scopes: `repo` (full control of private repositories)
5. Generate and copy the token

#### LLM API Key
Choose one:

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key (starts with `sk-...`)

**Claude (Anthropic):**
1. Go to https://console.anthropic.com/
2. Get API key from settings
3. Copy the key (starts with `sk-ant-...`)

### 3. Configure Environment Variables

Copy the example file:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```bash
GITHUB_TOKEN=ghp_your_actual_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your-github-pages-repo
LLM_PROVIDER=openai
LLM_API_KEY=sk-your_actual_api_key
```

Load the environment variables:
```bash
source .env  # On Linux/Mac
# OR
set -a; source .env; set +a  # Alternative for Linux/Mac
```

On Windows (PowerShell):
```powershell
Get-Content .env | ForEach-Object {
    $name, $value = $_.split('=')
    Set-Item -Path "env:$name" -Value $value
}
```

## Usage

### Method 1: Interactive Input
```bash
python portfolio_manager.py
```

Then paste your project description (can be messy, unstructured text):
```
Built a cool weather app using React and OpenWeatherMap API
It shows 5-day forecasts and has a nice UI with animations
Check it out at https://github.com/myusername/weather-app
```

Press `Ctrl+D` (Linux/Mac) or `Ctrl+Z` then Enter (Windows) to submit.

### Method 2: From File
```bash
cat project_description.txt | python portfolio_manager.py
```

### Method 3: One-liner
```bash
echo "Made a task tracker with Python Flask and SQLite, deployed on Heroku at https://mytasks.herokuapp.com" | python portfolio_manager.py
```

## Expected projects.json Format

The script expects your `projects.json` to look like this:
```json
{
  "projects": [
    {
      "title": "Weather Dashboard",
      "description": "A React-based weather app with 5-day forecasts and animated UI.",
      "link": "https://github.com/user/weather-app"
    },
    {
      "title": "Task Tracker",
      "description": "Python Flask task management app with SQLite backend.",
      "link": "https://mytasks.herokuapp.com"
    }
  ]
}
```

If the file doesn't exist, it will be created automatically.

## Troubleshooting

### "GITHUB_TOKEN environment variable not set"
Make sure you've run `source .env` in your current terminal session.

### "404 Not Found" when fetching projects.json
The file will be created automatically if it doesn't exist. Make sure your repo name is correct.

### "401 Unauthorized"
Your GitHub token may be expired or doesn't have the right permissions. Generate a new token with `repo` scope.

### "403 Rate limit exceeded"
You've hit GitHub's API rate limit. Wait an hour or authenticate properly.

### LLM API Errors
- **OpenAI 401**: Check your API key and billing status
- **Claude 401**: Verify your Anthropic API key
- **429 Rate Limit**: You've exceeded your API quota

## Tips

1. **Keep it conversational**: The LLM will clean up your messy input, so don't worry about formatting

2. **Include key details**: Make sure to mention:
   - Project name or what it does
   - Technologies used (optional but helpful)
   - Link/URL if available

3. **Review before confirming**: The script will show you the formatted project before adding it

4. **Cost efficiency**: 
   - OpenAI GPT-3.5-turbo is very cheap (fractions of a cent per project)
   - Claude Haiku is also cost-effective

## Advanced: Automate with Aliases

Add to your `~/.bashrc` or `~/.zshrc`:
```bash
alias add-project='cd /path/to/IS322_midterm && source .env && python portfolio_manager.py'
```

Then from anywhere:
```bash
add-project
```

## Security Notes

- **Never commit `.env`** to Git (already in `.gitignore`)
- Keep your tokens secure and rotate them periodically
- Use environment variables, not hardcoded credentials
- For production, consider using GitHub Secrets or a secrets manager
