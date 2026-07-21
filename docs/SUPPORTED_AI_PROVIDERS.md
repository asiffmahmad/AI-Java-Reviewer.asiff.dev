# Supported AI Providers

AI Java Reviewer allows you to connect to the most powerful LLMs in the world, or run entirely offline for ultimate privacy.

## OpenAI
- **Supported Models**: `gpt-4o`, `gpt-4-turbo`, `gpt-4`
- **Configuration**:
  ```yaml
  provider: openai
  model: gpt-4o
  ```

## Google Gemini
- **Supported Models**: `gemini-1.5-pro`, `gemini-1.5-flash`
- **Configuration**:
  ```yaml
  provider: gemini
  model: gemini-1.5-pro
  ```

## Anthropic Claude
- **Supported Models**: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`
- **Configuration**:
  ```yaml
  provider: claude
  model: claude-3-5-sonnet-20241022
  ```

## GitHub Models (Copilot API)
You can use your GitHub Personal Access Token to run inference via GitHub Models.
- **Supported Models**: `gpt-4o`, `gpt-4`, `Llama-3.2-90B-Vision-Instruct`
- **Configuration**:
  ```yaml
  provider: github
  model: gpt-4o
  ```

## Groq
- **Supported Models**: `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`
- **Configuration**:
  ```yaml
  provider: groq
  model: llama-3.3-70b-versatile
  ```

## Ollama (Local & Offline)
Ollama runs the models directly on your hardware. Your code never leaves your machine.
- **Supported Models**: `llama3`, `mistral`, `codellama`, `deepseek-coder`
- **Configuration**:
  ```yaml
  provider: ollama
  model: llama3
  ollamaBaseUrl: http://localhost:11434
  ```

## OpenRouter
- **Configuration**:
  ```yaml
  provider: openrouter
  model: meta-llama/llama-3-70b-instruct
  openRouterBaseUrl: https://openrouter.ai/api/v1
  ```
