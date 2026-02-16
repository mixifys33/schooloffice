# MongoDB Atlas DNS Resolution Error - Quick Fix Guide

## Error

```
os error 10051 - A socket operation was attempted to an unreachable network
```

## Root Cause

Your Windows DNS server (likely router at 192.168.1.1) cannot resolve MongoDB Atlas domain names.

## Solutions (Try in Order)

### Solution 1: Change DNS to Google DNS (RECOMMENDED)

1. Open PowerShell as Administrator
2. Run this command:

```powershell
# Get your network adapter name
Get-NetAdapter | Where-Object {$_.Status -eq "Up"}

# Set DNS to Google DNS (replace "Ethernet" with your adapter name)
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("8.8.8.8","8.8.4.4")

# Or for Wi-Fi:
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses ("8.8.8.8","8.8.4.4")
```

### Solution 2: Flush DNS Cache

```cmd
ipconfig /flushdns
ipconfig /release
ipconfig /renew
```

### Solution 3: Check MongoDB Atlas IP Whitelist

1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Click "Network Access" in left sidebar
4. Add your current IP or use `0.0.0.0/0` (allow all - for testing only)

### Solution 4: Restart Network

1. Restart your router (unplug for 30 seconds)
2. Restart your computer
3. Try again

### Solution 5: Disable VPN/Proxy

If you're using a VPN or proxy, try disabling it temporarily.

### Solution 6: Check Firewall

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Ensure Node.js is allowed for both Private and Public networks

## Verify DNS Resolution

Test if you can resolve MongoDB Atlas domain:

```cmd
nslookup schooloffice.jshbhxm.mongodb.net
```

If it fails, your DNS is the problem. Use Solution 1.

## After Fix

Once DNS is working, restart your dev server:

```cmd
# Stop current server (Ctrl+C)
npm run dev
```

The application will work normally once network connectivity is restored.
