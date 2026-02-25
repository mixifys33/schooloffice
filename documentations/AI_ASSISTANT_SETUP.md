# Ofiniti AI Assistant - Setup & Documentation

## Overview

Ofiniti AI is an intelligent support chatbot integrated into SchoolOffice.academy, powered by AD-Technologies and 7 Boys at Kasese Secondary School. It provides context-aware assistance to users across the platform.

## Features

✅ **Context-Aware Support**: Understands which page the user is on and provides relevant help
✅ **Error Detection**: Automatically detects errors and suggests solutions
✅ **Documentation Integration**: Has access to all system documentation
✅ **Chat History**: Saves conversations to localStorage (last 10 sessions)
✅ **Free to Use**: Uses OpenRouter's free models (no cost)
✅ **Floating Widget**: Non-intrusive floating button on home, login, and signup pages
✅ **Smart Responses**: Concise, actionable answers without lengthy explanations
✅ **Multi-Role Awareness**: Understands different user roles and their capabilities

## Setup Instructions

### 1. Get OpenRouter API Key

1. Visit [https://openrouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
4. Create a new API key
5. Copy the API key

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# AI Assistant Configuration
NEXT_PUBLIC_OPENROUTER_API_KEY="your_api_key_here"
NEXT_PUBLIC_OPENROUTER_MODEL="meta-llama/llama-3.2-3b-instruct:free"
NEXT_PUBLIC_AI_ASSISTANT_NAME="Ofiniti AI"
```

### 3. Available Free Models

OpenRouter provides several free models you can use:

- `meta-llama/llama-3.2-3b-instruct:free` (Recommended - Fast & Accurate)
- `google/gemma-2-9b-it:free` (Good for complex queries)
- `mistralai/mistral-7b-instruct:free` (Balanced performance)
- `meta-llama/llama-3.1-8b-instruct:free` (Larger context window)

To change the model, update `NEXT_PUBLIC_OPENROUTER_MODEL` in your `.env` file.

## Architecture

### Components

1. **AIChatWidget** (`src/components/ai-assistant/ai-chat-widget.tsx`)
   - Floating chat button and window
   - Message display and input
   - Chat history management

2. **OpenRouter Client** (`src/lib/ai-assistant/openrouter-client.ts`)
   - Handles API communication
   - Manages chat completions
   - Error handling

3. **Context Builder** (`src/lib/ai-assistant/context-builder.ts`)
   - Builds system context for AI
   - Provides page-specific context
   - Detects and explains errors

4. **Documentation Indexer** (`src/lib/ai-assistant/documentation-indexer.ts`)
   - Indexes documentation content
   - Provides relevant docs based on query
   - Quick reference snippets

5. **Chat Storage** (`src/lib/ai-assistant/chat-storage.ts`)
   - Manages localStorage persistence
   - Saves last 10 chat sessions
   - Limits messages per session (50 max)

### Data Flow

```
User Input → AIChatWidget → Context Builder → OpenRouter API → AI Response → User
                ↓                                                      ↓
          Chat Storage                                          Chat Storage
```

## Usage

### For Users

1. Look for the floating blue chat button on the bottom-right corner
2. Click to open the chat window
3. Type your question or describe your issue
4. Get instant, context-aware responses
5. Chat history is automatically saved

### For Developers

#### Adding AI Widget to New Pages

```tsx
import { AIChatWidget } from "@/components/ai-assistant/ai-chat-widget";

export default function YourPage() {
  return (
    <div>
      {/* Your page content */}
      <AIChatWidget />
    </div>
  );
}
```

#### Customizing Context

Edit `src/lib/ai-assistant/context-builder.ts` to add page-specific context:

```typescript
getPageContext(pathname: string): string {
  const contexts: Record<string, string> = {
    '/your-page': 'User is on your custom page. Features: ...',
    // Add more contexts
  }
  // ...
}
```

#### Adding Documentation

Edit `src/lib/ai-assistant/documentation-indexer.ts` to add new documentation snippets:

```typescript
export const documentationSnippets = {
  yourFeature: `
YOUR FEATURE DOCUMENTATION:
- Step 1: ...
- Step 2: ...
`,
  // Add more snippets
};
```

## AI Capabilities

### What the AI Can Do

✅ Answer questions about system features
✅ Guide users through workflows (login, marks entry, reports, etc.)
✅ Troubleshoot common errors
✅ Explain role-based permissions
✅ Provide quick solutions without lengthy explanations
✅ Detect errors from context and suggest fixes
✅ Help with navigation and feature discovery

### What the AI Knows

- Complete system architecture
- All user roles and permissions
- Authentication flow
- Marks entry process (CA and Exam)
- DOS approval workflow
- Report generation
- Fee management (Bursar)
- Attendance tracking
- Timetable management
- Common errors and solutions

### Response Style

The AI is configured to:

- Be concise and direct
- Provide actionable solutions
- Use bullet points for steps
- Avoid long explanations unless asked
- Immediately suggest fixes when errors are detected
- Be friendly but professional

## Configuration Options

### Environment Variables

| Variable                         | Description        | Default                                 |
| -------------------------------- | ------------------ | --------------------------------------- |
| `NEXT_PUBLIC_OPENROUTER_API_KEY` | OpenRouter API key | Required                                |
| `NEXT_PUBLIC_OPENROUTER_MODEL`   | Model to use       | `meta-llama/llama-3.2-3b-instruct:free` |
| `NEXT_PUBLIC_AI_ASSISTANT_NAME`  | Display name       | `Ofiniti AI`                            |

### Chat Storage Limits

Configured in `src/lib/ai-assistant/chat-storage.ts`:

```typescript
MAX_SESSIONS = 10; // Maximum saved sessions
MAX_MESSAGES_PER_SESSION = 50; // Maximum messages per session
```

### Context Window

The AI uses the last 10 messages for context to maintain conversation flow while staying within token limits.

## Troubleshooting

### AI Not Responding

1. Check if `NEXT_PUBLIC_OPENROUTER_API_KEY` is set in `.env`
2. Verify API key is valid at [https://openrouter.ai/keys](https://openrouter.ai/keys)
3. Check browser console for errors
4. Ensure you have internet connection

### Chat Widget Not Showing

1. Verify the component is imported and rendered
2. Check if there are any CSS conflicts
3. Ensure z-index is high enough (currently 50)

### Slow Responses

1. Try a different free model (some are faster than others)
2. Check your internet connection
3. OpenRouter free tier may have rate limits during peak times

### Chat History Not Saving

1. Check if localStorage is enabled in browser
2. Verify localStorage quota is not exceeded
3. Check browser console for storage errors

## API Costs

**Good News**: All recommended models are completely FREE!

OpenRouter provides free access to several models with no cost. The free tier includes:

- No credit card required
- Reasonable rate limits
- Multiple model options

For production use with higher volume, consider:

- OpenRouter paid plans (pay-per-token)
- Self-hosted models
- Alternative AI providers

## Security Considerations

1. **API Key**: Store in environment variables, never commit to git
2. **Client-Side**: API key is exposed to client (use OpenRouter's domain restrictions)
3. **Rate Limiting**: OpenRouter handles rate limiting automatically
4. **Data Privacy**: Chat history stored locally in browser only
5. **No PII**: AI doesn't have access to user's personal data

## Future Enhancements

Potential improvements:

- [ ] Voice input support
- [ ] Multi-language support
- [ ] Advanced error detection with code analysis
- [ ] Integration with system logs
- [ ] Proactive suggestions based on user behavior
- [ ] Admin dashboard for chat analytics
- [ ] Custom training on school-specific data
- [ ] Integration with help desk ticketing

## Credits

**Ofiniti AI** is powered by:

- **AD-Technologies**: Core development and architecture
- **7 Boys at Kasese Secondary School**: Innovation and implementation
- **OpenRouter**: AI model infrastructure
- **Meta/Google/Mistral**: Open-source AI models

## Support

For issues or questions:

1. Check this documentation
2. Ask Ofiniti AI directly in the chat
3. Contact AD-Technologies support
4. Visit [https://openrouter.ai/docs](https://openrouter.ai/docs) for API issues

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**License**: Proprietary - SchoolOffice.academy
