# IS322 Midterm - Automated Portfolio Manager

A Python script that automates updating your GitHub Pages portfolio using LLM-powered text formatting and GitHub's REST API.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure your credentials:**
   ```bash
   cp .env.example .env
   # Edit .env and add your tokens
   ```

3. **Run the script:**
   ```bash
   source .env
   python3 portfolio_manager.py
   ```

## ✨ Features

- 🤖 **LLM-Powered Formatting**: Converts messy text into clean JSON using OpenAI or Claude
- 🔄 **Automated GitHub Updates**: Fetches, modifies, and commits `projects.json` automatically
- 🔐 **Secure**: Uses environment variables for API tokens
- 🎯 **Simple CLI**: Just paste your project description and hit Ctrl+D
- ✅ **SHA Handling**: Properly manages GitHub's file versioning

## 📖 What It Does

1. Fetches your `projects.json` from GitHub Pages repository
2. Takes your unstructured text input (can be messy!)
3. Uses an LLM to format it into a proper JSON structure with title, description, and link
4. Shows you the formatted result for confirmation
5. Updates the file in your GitHub repo with proper Base64 encoding and SHA handling
6. Commits the change directly to your repository

## 🎬 Example Usage

```bash
$ python3 portfolio_manager.py
```

Then paste something like:
```
Built a cool weather app using React and the OpenWeatherMap API
It has 5-day forecasts and animated UI
https://github.com/myuser/weather-app
```

The LLM transforms it into:
```json
{
  "title": "Weather App",
  "description": "A React-based weather application with 5-day forecasts and animated user interface.",
  "link": "https://github.com/myuser/weather-app"
}
```

And automatically commits it to your GitHub repository!

## 📋 Requirements

- Python 3.7+
- GitHub Personal Access Token (with `repo` scope)
- OpenAI API key OR Anthropic Claude API key
- A GitHub repository with (or without) a `projects.json` file

## 📚 Documentation

- [USAGE.md](USAGE.md) - Detailed setup and usage instructions
- [.env.example](.env.example) - Configuration template

## 🔧 Configuration

Required environment variables:
```bash
GITHUB_TOKEN=ghp_...           # Your GitHub PAT
GITHUB_OWNER=your_username      # Your GitHub username
GITHUB_REPO=your_repo_name      # Repository name
LLM_PROVIDER=openai            # "openai" or "claude"
LLM_API_KEY=sk-...             # Your LLM API key
```

## 🛠️ Tech Stack

- Python 3
- GitHub REST API (Content API)
- OpenAI GPT-3.5-turbo or Anthropic Claude Haiku
- requests library for HTTP calls

## 📝 License

See [LICENSE](LICENSE)