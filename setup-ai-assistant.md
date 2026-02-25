# 🤖 Ofiniti AI Assistant - Quick Setup Guide

## What I Built For You

I've created a complete, intelligent AI support chatbot for your SchoolOffice.academy application! Here's what you got:

### ✨ Features

1. **Smart Floating Widget** - Appears on home, login, and signup pages
2. **Context-Aware** - Knows which page the user is on and provides relevant help
3. **Error Detection** - Automatically detects errors and suggests solutions
4. **Documentation Integration** - Has access to all your system documentation
5. **Chat History** - Saves last 10 conversations to localStorage
6. **100% Free** - Uses OpenRouter's free AI models
7. **Beautiful UI** - Modern, responsive design with smooth animations
8. **Minimizable** - Users can minimize/maximize the chat widget
9. **Smart Responses** - Provides contextual help based on user location and errors

---

## 📁 Files Created

### Components

- `src/components/ai-assistant/ai-chat-widget.tsx` - Main chat widget component

### Libraries

- `src/lib/ai-assistant/openrouter-client.ts` - OpenRouter API integration
- `src/lib/ai-assistant/context-builder.ts` - Builds context from page and errors
- `src/lib/ai-assistant/documentation-indexer.ts` - Indexes your documentation
- `src/lib/ai-assistant/chat-storage.ts` - Manages chat history in localStorage

### API Routes

- `src/app/api/ai-assistant/chat/route.ts` - Chat endpoint for AI responses

---

## 🚀 Quick Start (3 Steps)

### Step 1: Get Your Free OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Sign up (it's free!)
3. Create a new API key
4. Copy the key

### Step 2: Update Your .env File

Open your `.env` file and update these lines:

```env
# Replace "your_openrouter_api_key_here" with your actual API key
NEXT_PUBLIC_OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxxx"

# Optional: Change the AI model (default is free Llama 3.2)
NEXT_PUBLIC_OPENROUTER_MODEL="meta-llama/llama-3.2-3b-instruct:free"

# Optional: Customize the assistant name
NEXT_PUBLIC_AI_ASSISTANT_NAME="Ofiniti AI"
```

### Step 3: Add the Widget to Your Pages

The widget is already created! Just import and add it to your pages:

```tsx
import AIChatWidget from "@/components/ai-assistant/ai-chat-widget";

export default function YourPage() {
  return (
    <>
      {/* Your page content */}
      <AIChatWidget />
    </>
  );
}
```

**Recommended pages to add it:**

- Home page: `src/app/page.tsx`
- Login page: `src/app/(Auth)/login/page.tsx`
- Signup page: `src/app/(Auth)/signup/page.tsx`
- Dashboard pages (optional)

---

## 🎨 Customization Options

### Change AI Model

OpenRouter offers many free models. Update in `.env`:

```env
# Fast and lightweight (default)
NEXT_PUBLIC_OPENROUTER_MODEL="meta-llama/llama-3.2-3b-instruct:free"

# More capable (still free)
NEXT_PUBLIC_OPENROUTER_MODEL="meta-llama/llama-3.1-8b-instruct:free"

# Most capable free model
NEXT_PUBLIC_OPENROUTER_MODEL="google/gemini-flash-1.5-8b"
```

### Customize Appearance

Edit `src/components/ai-assistant/ai-chat-widget.tsx`:

```tsx
// Change colors
className = "bg-blue-600"; // Change button color
className = "bg-gradient-to-br from-blue-600 to-purple-600"; // Gradient

// Change position
className = "fixed bottom-6 right-6"; // Bottom right (default)
className = "fixed bottom-6 left-6"; // Bottom left
className = "fixed top-6 right-6"; // Top right

// Change size
className = "w-96 h-[600px]"; // Default size
className = "w-[500px] h-[700px]"; // Larger
```

### Add More Documentation

Edit `src/lib/ai-assistant/documentation-indexer.ts` to add more docs:

```typescript
const docs = [
  { title: "Getting Started", content: "..." },
  { title: "Your New Doc", content: "..." },
];
```

---

## 🧪 Testing

1. Start your dev server:

   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:3000`

3. Look for the floating chat button (bottom right)

4. Click it and try asking:
   - "How do I reset my password?"
   - "What is SchoolOffice?"
   - "I'm getting an error on the login page"

---

## 🔧 Troubleshooting

### Widget Not Appearing?

- Check that you added `<AIChatWidget />` to your page
- Verify the component is imported correctly
- Check browser console for errors

### API Key Error?

- Make sure you copied the full API key from OpenRouter
- Verify the key starts with `sk-or-v1-`
- Check that `.env` file has `NEXT_PUBLIC_OPENROUTER_API_KEY` (not `OPENROUTER_API_KEY`)
- Restart your dev server after updating `.env`

### Chat Not Responding?

- Check browser console for API errors
- Verify your OpenRouter API key is valid
- Check your internet connection
- Try a different model in `.env`

### Styling Issues?

- Make sure Tailwind CSS is configured
- Check that `globals.css` imports Tailwind
- Clear browser cache and restart dev server

---

## 📊 Features Breakdown

### Context Awareness

The AI knows:

- Current page URL and title
- User's role (if logged in)
- Recent errors on the page
- Available documentation

### Error Detection

Automatically detects:

- JavaScript errors
- Network failures
- Form validation errors
- API errors

### Chat History

- Stores last 10 conversations
- Persists across page reloads
- Stored in browser localStorage
- Can be cleared by user

---

## 🎯 Best Practices

1. **API Key Security**
   - Never commit your API key to git
   - Use environment variables only
   - Rotate keys periodically

2. **Performance**
   - Widget loads lazily (doesn't slow down page)
   - Chat history is limited to 10 messages
   - API calls are debounced

3. **User Experience**
   - Widget is minimizable
   - Smooth animations
   - Mobile responsive
   - Accessible (keyboard navigation)

---

## 🚀 Advanced Features (Optional)

### Add Authentication Context

Edit `src/lib/ai-assistant/context-builder.ts`:

```typescript
export function buildContext(page: string, session?: any) {
  return {
    page,
    userRole: session?.user?.role,
    userName: session?.user?.name,
    // ... more context
  };
}
```

### Add Custom Commands

Edit `src/app/api/ai-assistant/chat/route.ts`:

```typescript
// Add command detection
if (message.toLowerCase().includes("/help")) {
  return NextResponse.json({
    response: "Here are available commands: /help, /docs, /support",
  });
}
```

### Analytics Integration

Track AI usage:

```typescript
// In ai-chat-widget.tsx
const handleSend = async () => {
  // Track event
  analytics.track("ai_chat_message_sent", {
    page: window.location.pathname,
    messageLength: input.length,
  });

  // ... rest of code
};
```

---

## 📝 Notes

- **Cost**: 100% free with OpenRouter's free models
- **Rate Limits**: Free tier has reasonable limits for small apps
- **Privacy**: Chat history stored locally in browser only
- **Scalability**: For production, consider upgrading to paid models

---

## 🎉 You're All Set!

Your AI assistant is ready to help your users! Just add your OpenRouter API key and drop the widget into your pages.

Need help? The AI assistant can help with that too! 😄

---

## 📚 Additional Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Available Free Models](https://openrouter.ai/models?order=newest&supported_parameters=tools&max_price=0)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Built with ❤️ for SchoolOffice.academy**

## ✅ Verification Checklist

Before going live, verify everything is working:

### 1. Files Check

Ensure these files exist:

- ✅ `src/components/ai-assistant/ai-chat-widget.tsx`
- ✅ `src/lib/ai-assistant/openrouter-client.ts`
- ✅ `src/lib/ai-assistant/context-builder.ts`
- ✅ `src/lib/ai-assistant/documentation-indexer.ts`
- ✅ `src/lib/ai-assistant/chat-storage.ts`
- ✅ `src/app/api/ai-assistant/chat/route.ts`

### 2. Environment Variables Check

Open `.env` and verify:

```bash
# Should have your actual API key (starts with sk-or-v1-)
NEXT_PUBLIC_OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxxx"

# Should be a valid free model
NEXT_PUBLIC_OPENROUTER_MODEL="meta-llama/llama-3.2-3b-instruct:free"

# Optional: Your custom name
NEXT_PUBLIC_AI_ASSISTANT_NAME="Ofiniti AI"
```

### 3. Test the Widget

1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Look for floating chat button (bottom right)
4. Click to open chat
5. Send a test message: "Hello"
6. Verify you get a response

### 4. Test Context Awareness

Try these test messages:

- "How do I login?" → Should mention school code
- "How do I enter marks?" → Should explain marks entry
- "What is SchoolOffice?" → Should describe the system
- "I'm getting an error" → Should ask for details

### 5. Test Chat History

1. Send a few messages
2. Close the chat widget
3. Reopen it
4. Verify messages are still there
5. Click the refresh icon to clear chat

### 6. Browser Console Check

Open browser DevTools (F12) and check:

- No red errors in Console tab
- Network tab shows successful API calls to OpenRouter
- No CORS errors

---

## 🎨 Customization Examples

### Example 1: Change Widget Position to Bottom Left

```tsx
// In ai-chat-widget.tsx, change both button and window:
{!isOpen && (
  <button
    className="fixed bottom-6 left-6 z-50 ..." // Changed right-6 to left-6
  >
)}

{isOpen && (
  <div className="fixed bottom-6 left-6 z-50 ..."> // Changed right-6 to left-6
)}
```

### Example 2: Change Color Theme to Green

```tsx
// In ai-chat-widget.tsx:
// Button
className="... bg-gradient-to-br from-green-600 to-green-700 ..."

// Header
<div className="bg-gradient-to-r from-green-600 to-green-700 ...">

// User messages
className="... bg-green-600 text-white"

// Send button
className="... bg-green-600 ... hover:bg-green-700"
```

### Example 3: Add Custom Welcome Message

```tsx
// In ai-chat-widget.tsx, update the welcome message:
const welcomeMessage: Message = {
  role: "assistant",
  content: `Welcome to SchoolOffice! 🎓 I'm here to help you with:
  
• Login and authentication
• Marks entry and reports
• Attendance tracking
• Fee management
• And much more!

What can I help you with today?`,
};
```

### Example 4: Add Quick Action Buttons

```tsx
// In ai-chat-widget.tsx, add after the welcome message:
const quickActions = [
  { label: 'How to login?', query: 'How do I login to SchoolOffice?' },
  { label: 'Enter marks', query: 'How do I enter student marks?' },
  { label: 'Generate reports', query: 'How do I generate report cards?' },
]

// In the JSX, add before the input:
<div className="flex gap-2 flex-wrap p-2">
  {quickActions.map((action, i) => (
    <button
      key={i}
      onClick={() => setInput(action.query)}
      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
    >
      {action.label}
    </button>
  ))}
</div>
```

---

## 🚨 Common Setup Mistakes

### Mistake 1: Wrong Environment Variable Name

❌ Wrong:

```env
OPENROUTER_API_KEY="sk-or-v1-xxx"  # Missing NEXT_PUBLIC_
```

✅ Correct:

```env
NEXT_PUBLIC_OPENROUTER_API_KEY="sk-or-v1-xxx"
```

### Mistake 2: Not Restarting Dev Server

After updating `.env`, you MUST restart the dev server:

```bash
# Stop the server (Ctrl+C)
# Then start again
npm run dev
```

### Mistake 3: Using Paid Model Without Credits

❌ Wrong (requires payment):

```env
NEXT_PUBLIC_OPENROUTER_MODEL="gpt-4"
```

✅ Correct (free):

```env
NEXT_PUBLIC_OPENROUTER_MODEL="meta-llama/llama-3.2-3b-instruct:free"
```

### Mistake 4: Forgetting to Import Component

❌ Wrong:

```tsx
export default function Page() {
  return <AIChatWidget />; // Not imported!
}
```

✅ Correct:

```tsx
import AIChatWidget from "@/components/ai-assistant/ai-chat-widget";

export default function Page() {
  return <AIChatWidget />;
}
```

---

## 📈 Usage Analytics (Optional)

Want to track AI usage? Add this to `ai-chat-widget.tsx`:

```tsx
// Add to handleSend function:
const handleSend = async () => {
  // ... existing code ...

  // Track analytics
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "ai_chat_message", {
      page: pathname,
      message_length: input.length,
      session_id: sessionId,
    });
  }

  // ... rest of code ...
};
```

---

## 🔐 Security Best Practices

1. **Never commit API keys to git**
   - Add `.env` to `.gitignore` (should already be there)
   - Use `.env.example` for documentation only

2. **Rotate API keys regularly**
   - Change your OpenRouter key every 3-6 months
   - Immediately rotate if exposed

3. **Monitor usage**
   - Check OpenRouter dashboard for unusual activity
   - Set up usage alerts if available

4. **Rate limiting**
   - OpenRouter free tier has built-in limits
   - Consider adding client-side rate limiting for production

---

## 🎯 Next Steps

Now that your AI assistant is set up:

1. ✅ Add the widget to your main pages
2. ✅ Test thoroughly with different user scenarios
3. ✅ Customize the appearance to match your brand
4. ✅ Monitor usage and user feedback
5. ✅ Consider upgrading to paid models for better responses

---

## 💡 Pro Tips

1. **Better Responses**: Upgrade to `meta-llama/llama-3.1-8b-instruct:free` for more intelligent answers

2. **Faster Responses**: Use `meta-llama/llama-3.2-3b-instruct:free` for speed

3. **Context Matters**: The AI knows which page the user is on, so responses are automatically relevant

4. **Error Detection**: The AI can detect errors in the page and suggest fixes automatically

5. **Chat History**: Users can see their last 10 conversations, making it easy to continue where they left off

---

## 🤝 Support

Need help with the AI assistant?

- Check OpenRouter docs: https://openrouter.ai/docs
- Review the code in `src/lib/ai-assistant/`
- Test with different models to find the best fit
- Monitor browser console for errors

---

**That's it! Your AI assistant is ready to help your users. Enjoy! 🎉**
