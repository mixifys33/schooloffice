# QUICK DNS FIX - Manual Steps

## The Problem

Your Windows DNS cannot resolve MongoDB Atlas domains, causing:

- `os error 10051` - Network unreachable
- `Unexpected end of JSON input` - Empty API responses
- Authentication failures

## Manual Fix (5 minutes)

### Step 1: Open Network Connections

1. Press `Win + R`
2. Type: `ncpa.cpl`
3. Press Enter

### Step 2: Change DNS Settings

1. Right-click your active network adapter (Ethernet or Wi-Fi)
2. Click "Properties"
3. Double-click "Internet Protocol Version 4 (TCP/IPv4)"
4. Select "Use the following DNS server addresses"
5. Enter:
   - **Preferred DNS**: `8.8.8.8`
   - **Alternate DNS**: `8.8.4.4`
6. Click OK twice

### Step 3: Flush DNS Cache

Open Command Prompt and run:

```cmd
ipconfig /flushdns
ipconfig /release
ipconfig /renew
```

### Step 4: Test Connection

```cmd
nslookup schooloffice.jshbhxm.mongodb.net
```

If you see IP addresses, DNS is working!

### Step 5: Restart Dev Server

```cmd
# Stop current server (Ctrl+C)
npm run dev
```

## Alternative: Use PowerShell Script

```powershell
# Run as Administrator
.\fix-dns-google.ps1
```

## After Fix

- Authentication will work
- "Unexpected end of JSON input" error will disappear
- Database queries will succeed

## Still Not Working?

### Check MongoDB Atlas IP Whitelist

1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Network Access → Add IP Address
4. Use `0.0.0.0/0` (allow all IPs) for testing

### Check Firewall

1. Windows Defender Firewall
2. Allow Node.js through firewall
3. Allow both Private and Public networks

### Restart Router

Unplug router for 30 seconds, then plug back in.

---

**Note**: The "Unexpected end of JSON input" error is NOT a code bug. It's caused by the DNS failure preventing database connection. Fix DNS first, then everything works.
