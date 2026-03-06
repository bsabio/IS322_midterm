#!/usr/bin/env python3
"""
Automated Portfolio Manager
Updates projects.json and config.json in GitHub Pages repository using LLM-formatted input
"""

import os
import sys
import json
import base64
import requests
from typing import Dict, Any, Optional


class PortfolioManager:
    def __init__(self, github_token: str, llm_api_key: str, llm_provider: str = "openai"):
        """
        Initialize the Portfolio Manager
        
        Args:
            github_token: GitHub Personal Access Token
            llm_api_key: API key for LLM provider (OpenAI or Claude)
            llm_provider: "openai" or "claude" (default: openai)
        """
        self.github_token = github_token
        self.llm_api_key = llm_api_key
        self.llm_provider = llm_provider.lower()
        self.github_api_base = "https://api.github.com"
        
    def fetch_json_file(self, owner: str, repo: str, file_path: str, default_content: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Fetch a JSON file from the GitHub repository
        
        Args:
            owner: GitHub repository owner
            repo: Repository name
            file_path: Path to the file in the repo
            default_content: Default content if file doesn't exist
            
        Returns:
            Dictionary containing the file content and metadata (sha, content)
        """
        if default_content is None:
            default_content = {}
        url = f"{self.github_api_base}/repos/{owner}/{repo}/contents/{file_path}"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        print(f"Fetching {file_path} from {owner}/{repo}...")
        response = requests.get(url, headers=headers)
        
        if response.status_code == 404:
            print(f"File not found. Will create a new {file_path}.")
            return {
                "sha": None,
                "content": default_content
            }
        
        response.raise_for_status()
        data = response.json()
        
        # Decode base64 content
        content_decoded = base64.b64decode(data["content"]).decode("utf-8")
        content_json = json.loads(content_decoded)
        
        print(f"✓ Successfully fetched {file_path} (SHA: {data['sha'][:7]}...)")
        return {
            "sha": data["sha"],
            "content": content_json
        }
    
    def format_with_llm(self, raw_text: str, mode: str = "project") -> Dict[str, str]:
        """
        Use LLM to format raw text into structured JSON
        
        Args:
            raw_text: Unstructured text describing changes
            mode: "project" for new project, "config" for site config update
            
        Returns:
            Dictionary with the formatted data
        """
        if mode == "config":
            prompt = self._build_config_prompt(raw_text)
        else:
            prompt = self._build_project_prompt(raw_text)

        if self.llm_provider == "openai":
            return self._format_with_openai(prompt)
        elif self.llm_provider == "claude":
            return self._format_with_claude(prompt)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.llm_provider}")

    def _build_project_prompt(self, raw_text: str) -> str:
        return f"""Convert the following unstructured text into a clean JSON object with exactly these three fields: "title", "description", and "link".

Rules:
- Extract or infer a clear project title
- Create a concise, professional description (1-2 sentences)
- Extract any URLs mentioned, or use an empty string if none found
- Return ONLY valid JSON, no additional text or formatting

Input text:
{raw_text}

Return JSON in this exact format:
{{"title": "Project Title", "description": "Brief description", "link": "https://example.com"}}"""

    def _build_config_prompt(self, raw_text: str) -> str:
        return f"""You are updating a portfolio website's config.json file. The user has described changes in natural language. Return ONLY the fields that should be updated as a JSON object.

The config.json has this structure:
{{
  "name": "Person's full name",
  "tagline": "Short professional title like 'AI Consultant & Full-Stack Developer'",
  "subtitle": "Short label above the name like 'AI-Powered Solutions'",
  "bio": "1-3 sentence professional bio for the About section",
  "hero_description": "One sentence describing what they do, shown under the name",
  "skills": ["Skill 1", "Skill 2", ...],
  "social": {{
    "github": "https://github.com/username",
    "linkedin": "https://linkedin.com/in/username",
    "email": "their@email.com"
  }},
  "scheduling": {{
    "provider": "calcom or calendly",
    "link": "username/30min"
  }}
}}

Rules:
- ONLY include fields the user wants to change
- For skills: if the user mentions adding skills, return the FULL skills array (old + new)
- For social/scheduling: include the full sub-object if any part changes
- Return ONLY valid JSON, no additional text or markdown

User's request:
{raw_text}

Return only the JSON fields to update:"""

    def _format_with_openai(self, prompt: str) -> Dict[str, str]:
        """Format using OpenAI API"""
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.llm_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that formats project descriptions into clean JSON. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 500
        }
        
        print("Formatting with OpenAI GPT-3.5-turbo...")
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        content = result["choices"][0]["message"]["content"].strip()
        
        # Clean up response (remove markdown code blocks if present)
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
            content = content.replace("```json", "").replace("```", "").strip()
        
        project_data = json.loads(content)
        print("✓ Successfully formatted project with LLM")
        return project_data
    
    def _format_with_claude(self, prompt: str) -> Dict[str, str]:
        """Format using Anthropic Claude API"""
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.llm_api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 500,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3
        }
        
        print("Formatting with Claude (Haiku)...")
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        content = result["content"][0]["text"].strip()
        
        # Clean up response (remove markdown code blocks if present)
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
            content = content.replace("```json", "").replace("```", "").strip()
        
        project_data = json.loads(content)
        print("✓ Successfully formatted project with LLM")
        return project_data
    
    def update_github_file(self, owner: str, repo: str, file_path: str, 
                          content: Dict[str, Any], sha: Optional[str],
                          commit_message: str = "Update projects.json via portfolio manager") -> bool:
        """
        Update or create the projects.json file in GitHub repository
        
        Args:
            owner: GitHub repository owner
            repo: Repository name
            file_path: Path to the file in the repo
            content: New content as dictionary
            sha: SHA of the existing file (None if creating new file)
            commit_message: Commit message
            
        Returns:
            True if successful
        """
        url = f"{self.github_api_base}/repos/{owner}/{repo}/contents/{file_path}"
        headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        # Encode content to base64
        content_json = json.dumps(content, indent=2)
        content_base64 = base64.b64encode(content_json.encode("utf-8")).decode("utf-8")
        
        payload = {
            "message": commit_message,
            "content": content_base64
        }
        
        # Include SHA if updating existing file
        if sha:
            payload["sha"] = sha
            print(f"Updating {file_path} (SHA: {sha[:7]}...)...")
        else:
            print(f"Creating new file {file_path}...")
        
        response = requests.put(url, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        new_sha = result["content"]["sha"]
        print(f"✓ Successfully updated {file_path} (New SHA: {new_sha[:7]}...)")
        print(f"✓ Commit: {result['commit']['html_url']}")
        return True
    
    def add_project(self, owner: str, repo: str, raw_input: str, 
                   file_path: str = "projects.json") -> bool:
        """
        Complete workflow: fetch, format, add project, and update
        
        Args:
            owner: GitHub repository owner
            repo: Repository name
            raw_input: Raw unstructured text describing the project
            file_path: Path to the projects.json file
            
        Returns:
            True if successful
        """
        try:
            # Step 1: Fetch current projects.json
            file_data = self.fetch_json_file(owner, repo, file_path, {"projects": []})
            
            # Step 2: Format raw input with LLM
            new_project = self.format_with_llm(raw_input)
            
            # Step 3: Add to projects list
            projects_content = file_data["content"]
            if "projects" not in projects_content:
                projects_content["projects"] = []
            
            projects_content["projects"].append(new_project)
            
            print(f"\nNew project to add:")
            print(json.dumps(new_project, indent=2))
            
            # Step 4: Confirm with user
            confirm = input("\nAdd this project to your portfolio? (yes/no): ").strip().lower()
            if confirm not in ["yes", "y"]:
                print("Operation cancelled.")
                return False
            
            # Step 5: Update GitHub
            commit_msg = f"Add project: {new_project['title']}"
            self.update_github_file(owner, repo, file_path, projects_content, 
                                   file_data["sha"], commit_msg)
            
            print("\n✅ Portfolio updated successfully!")
            print(f"Total projects: {len(projects_content['projects'])}")
            return True
            
        except requests.exceptions.HTTPError as e:
            print(f"❌ HTTP Error: {e}")
            print(f"Response: {e.response.text if e.response else 'No response'}")
            return False
        except json.JSONDecodeError as e:
            print(f"❌ JSON Error: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return False

    def update_config(self, owner: str, repo: str, raw_input: str,
                     file_path: str = "config.json") -> bool:
        """
        Update site config via natural language.
        Fetches current config, uses LLM to determine changes, merges, and pushes.
        """
        try:
            # Step 1: Fetch current config.json
            file_data = self.fetch_json_file(owner, repo, file_path, {})
            current_config = file_data["content"]

            # Step 2: Use LLM to parse the requested changes
            changes = self.format_with_llm(raw_input, mode="config")

            # Step 3: Show what will change
            print("\nChanges to apply:")
            for key, val in changes.items():
                old_val = current_config.get(key, "(not set)")
                print(f"  {key}: {old_val!r}  →  {val!r}")

            # Step 4: Confirm
            confirm = input("\nApply these changes? (yes/no): ").strip().lower()
            if confirm not in ["yes", "y"]:
                print("Operation cancelled.")
                return False

            # Step 5: Deep merge changes into current config
            for key, val in changes.items():
                if isinstance(val, dict) and isinstance(current_config.get(key), dict):
                    current_config[key].update(val)
                else:
                    current_config[key] = val

            # Step 6: Push to GitHub
            commit_msg = "Update site config via portfolio manager"
            self.update_github_file(owner, repo, file_path, current_config,
                                   file_data["sha"], commit_msg)

            print("\n✅ Site config updated successfully!")
            return True

        except requests.exceptions.HTTPError as e:
            print(f"❌ HTTP Error: {e}")
            print(f"Response: {e.response.text if e.response else 'No response'}")
            return False
        except json.JSONDecodeError as e:
            print(f"❌ JSON Error: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return False


def main():
    """Main entry point for the portfolio manager CLI"""
    print("=" * 60)
    print("Portfolio Manager - Automated GitHub Pages Update")
    print("=" * 60)
    print()
    
    # Load configuration from environment variables
    github_token = os.getenv("GITHUB_TOKEN")
    llm_api_key = os.getenv("LLM_API_KEY")
    llm_provider = os.getenv("LLM_PROVIDER", "openai")  # Default to OpenAI
    
    github_owner = os.getenv("GITHUB_OWNER")
    github_repo = os.getenv("GITHUB_REPO")
    
    # Validate required environment variables
    if not github_token:
        print("❌ Error: GITHUB_TOKEN environment variable not set")
        print("   Set it with: export GITHUB_TOKEN='your_token_here'")
        sys.exit(1)
    
    if not llm_api_key:
        print("❌ Error: LLM_API_KEY environment variable not set")
        print("   Set it with: export LLM_API_KEY='your_api_key_here'")
        sys.exit(1)
    
    if not github_owner:
        print("❌ Error: GITHUB_OWNER environment variable not set")
        print("   Set it with: export GITHUB_OWNER='your_github_username'")
        sys.exit(1)
    
    if not github_repo:
        print("❌ Error: GITHUB_REPO environment variable not set")
        print("   Set it with: export GITHUB_REPO='your_repo_name'")
        sys.exit(1)
    
    # Initialize manager
    manager = PortfolioManager(github_token, llm_api_key, llm_provider)
    
    # Mode selection
    print(f"Repository: {github_owner}/{github_repo}")
    print()
    print("What would you like to do?")
    print("  1) Add a project")
    print("  2) Update site info (name, bio, skills, links, etc.)")
    print()
    
    try:
        choice = input("Enter 1 or 2: ").strip()
        
        if choice == "1":
            print()
            print("Describe your project (paste any text, press Ctrl+D or Ctrl+Z when done):")
            print("-" * 60)
            raw_input = sys.stdin.read().strip()
            if not raw_input:
                print("\n❌ No input provided. Exiting.")
                sys.exit(1)
            print("-" * 60)
            print()
            success = manager.add_project(github_owner, github_repo, raw_input)
            
        elif choice == "2":
            print()
            print("Describe what you want to change (e.g. 'change my name to John Doe")
            print("and add Python and Docker to my skills'):")
            print("-" * 60)
            raw_input = sys.stdin.read().strip()
            if not raw_input:
                print("\n❌ No input provided. Exiting.")
                sys.exit(1)
            print("-" * 60)
            print()
            success = manager.update_config(github_owner, github_repo, raw_input)
            
        else:
            print("❌ Invalid choice. Please enter 1 or 2.")
            sys.exit(1)
        
        sys.exit(0 if success else 1)
            
    except KeyboardInterrupt:
        print("\n\n❌ Operation cancelled by user.")
        sys.exit(1)


if __name__ == "__main__":
    main()
