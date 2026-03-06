# Portfolio Manager - Quick Reference

## Setup (One Time)
```bash
# 1. Run setup script
./setup.sh

# 2. Edit .env file with your credentials
nano .env

# 3. Get API keys:
# - GitHub: https://github.com/settings/tokens
# - OpenAI: https://platform.openai.com/api-keys  
# - Claude: https://console.anthropic.com/
```

## Daily Usage

### Load Environment Variables (each new terminal session)
```bash
source .env
```

### Add a Project
```bash
python3 portfolio_manager.py
# Paste project description
# Press Ctrl+D to submit
```

### Quick One-Liner
```bash
echo "Your project description here" | python3 portfolio_manager.py
```

### From a File
```bash
cat description.txt | python3 portfolio_manager.py
```

## Example Input Formats

All of these work - the LLM will format them:

**Casual:**
```
made a todo app with react, pretty simple but works great
live at https://mytodo.com
```

**Detailed:**
```
Blog Platform
Built with Django and PostgreSQL
Features: user auth, markdown support, comments
Deployed on Railway
https://myblog.railway.app
```

**Messy:**
```
weather thing i made uses react and some weather api forgot which one
has like forecasts and stuff github.com/me/weather
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | `ghp_abc123...` |
| `GITHUB_OWNER` | Your GitHub username | `john_doe` |
| `GITHUB_REPO` | Repository name | `john_doe.github.io` |
| `LLM_PROVIDER` | LLM service to use | `openai` or `claude` |
| `LLM_API_KEY` | API key for LLM | `sk-...` |

## Troubleshooting

| Error | Solution |
|-------|----------|
| "GITHUB_TOKEN not set" | Run `source .env` |
| "401 Unauthorized" | Check token permissions (needs `repo` scope) |
| "404 Not Found" | Verify owner/repo names; file will be created if missing |
| "Rate limit exceeded" | Wait 1 hour or check API quotas |
| LLM format issues | Check API key and billing status |

## Tips

✅ **DO:**
- Include project name, description, and link in your input
- Review the formatted output before confirming
- Keep .env file secure and never commit it

❌ **DON'T:**
- Hardcode credentials in the script
- Share your .env file
- Forget to run `source .env` in new terminal sessions

## Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Quick access
alias portfolio='cd ~/IS322/IS322_midterm && source .env && python3 portfolio_manager.py'

# Load env vars
alias load-portfolio='cd ~/IS322/IS322_midterm && source .env'
```

Then use:
```bash
portfolio  # Run from anywhere!
```
