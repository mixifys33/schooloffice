# OpenRouter API Setup Guide

## 🔧 How to Fix the "User not found" Error

The error you're seeing indicates that your OpenRouter API key is invalid or the associated account doesn't exist.

## 📋 Steps to Get a Valid API Key

### 1. Create an OpenRouter Account

1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Click "Sign Up" and create an account
3. **Verify your email address** (this is crucial!)
4. Complete your profile setup

### 2. Get Your API Key

1. After email verification, go to [OpenRouter Keys](https://openrouter.ai/keys)
2. Click "Create Key"
3. Give it a name (e.g., "SchoolOffice AI Assistant")
4. Copy the generated API key (starts with `sk-or-v1-...`)

### 3. Update Your Environment Variables

Replace the current API key in your `.env` file:

```env
# Replace this line:
NEXT_PUBLIC_OPENROUTER_API_KEY="your_valid_openrouter_api_key_here"

# With your actual API key:
NEXT_PUBLIC_OPENROUTER_API_KEY="sk-or-v1-your-actual-key-here"
```

### 4. Choose a Model

I've updated your model to use `anthropic/claude-3-haiku` which is:

- ✅ Reliable and fast
- ✅ Very affordable (~$0.00025 per 1K tokens)
- ✅ Good for chat assistance
- ✅ Available on OpenRouter

### 5. Add Credits (Optional)

- OpenRouter gives you some free credits to start
- For production use, add credits at [OpenRouter Billing](https://openrouter.ai/credits)
- $5-10 should last a very long time for an AI assistant

## 🔍 Testing Your Setup

After updating your API key:

1. **Restart your development server**:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Test the AI Assistant**:
   - Open your app
   - Try using the AI chat feature
   - You should see successful responses instead of "User not found"

## ✅ What I Fixed

1. **Updated your model** from `qwen/qwen3-vl-235b-a22b-thinking` to `anthropic/claude-3-haiku`
2. **Added placeholder** for your API key in `.env`
3. **Fixed metadata warning** by adding `metadataBase` to your Next.js layout

## 🚨 Important Notes

- **Never commit your real API key** to version control
- **Keep your `.env` file** in `.gitignore`
- **The API key is public** (NEXT*PUBLIC*\*) because it's used in the browser
- **OpenRouter handles rate limiting** and security for you

## 🎯 Expected Results

After fixing the API key, your logs should show:

```
🔵 [OpenRouter] Response status: 200 OK
✅ [AI API] Response received successfully
```

Instead of:

```
❌ [OpenRouter] Error response body: {"error":{"message":"User not found.","code":401}}
```

## 📞 Support

If you still have issues:

1. Check that your email is verified on OpenRouter
2. Make sure you have credits in your account
3. Try a different model if needed
4. Contact OpenRouter support if the problem persists
