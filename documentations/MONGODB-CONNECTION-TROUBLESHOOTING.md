# MongoDB Atlas Connection Troubleshooting

**Date**: 2026-02-09  
**Issue**: DNS Resolution Failure (os error 10051)

## Error Summary

```
Error creating a database connection.
(Kind: An error occurred during DNS resolution:
proto error: io error: A socket operation was attempted to an unreachable network.
(os error 10051))
```

## Root Cause

**Windows Error 10051**: "Network is unreachable"

Your local DNS server (router) is failing to resolve MongoDB Atlas domain names:

- Domain: `schooloffice.jshbhxm.mongodb.net`
- Local DNS (192.168.1.1): **TIMEOUT** ❌
- Google DNS (8.8.8.8): **SUCCESS** ✅

## Quick Diagnosis

Run these commands to verify:

```cmd
# Test internet connection
ping google.com -n 2

# Test DNS resolution with local DNS
nslookup schooloffice.jshbhxm.mongodb.net

# Test DNS resolution with Google DNS
nslookup schooloffice.jshbhxm.mongodb.net 8.8.8.8
```

## Solutions (Try in Order)

### Solution 1: Change DNS to Google DNS (Recommended) ⭐

**Automatic (PowerShell - Run as Administrator)**:

```powershell
.\fix-dns-google.ps1
```

**Manual**:

1. Press `Win + R`, type `ncpa.cpl`, press Enter
2. Right-click your active network adapter (Wi-Fi or Ethernet)
3. Click **Properties**
4. Select **Internet Protocol Version 4 (TCP/IPv4)**
5. Click **Properties**
6. Select **Use the following DNS server addresses**
7. Enter:
   - Preferred DNS server: `8.8.8.8`
   - Alternate DNS server: `8.8.4.4`
8. Click **OK** on all dialogs
9. Disable and re-enable your network adapter (or restart PC)

**Verify**:

```cmd
ipconfig /all
# Look for DNS Servers: 8.8.8.8, 8.8.4.4

nslookup schooloffice.jshbhxm.mongodb.net
# Should resolve without timeout
```

### Solution 2: Flush DNS Cache

```cmd
ipconfig /flushdns
```

Then restart your development server.

### Solution 3: Restart Router

1. Unplug your router's power cable
2. Wait 30 seconds
3. Plug it back in
4. Wait for full connection (all lights stable)
5. Test connection again

### Solution 4: Check MongoDB Atlas IP Whitelist

1. Go to https://cloud.mongodb.com
2. Log in to your account
3. Select your cluster: **schooloffice**
4. Click **Network Access** in the left sidebar
5. Check if your current IP is whitelisted
6. If not, click **Add IP Address**
7. Options:
   - **Add Current IP Address** (recommended for security)
   - **Allow Access from Anywhere** (0.0.0.0/0) - for testing only

**Get your current IP**:

```cmd
curl ifconfig.me
# Or visit: https://whatismyipaddress.com
```

### Solution 5: Disable VPN/Proxy

If you're using a VPN or proxy:

1. Temporarily disable it
2. Test MongoDB connection
3. If it works, configure VPN to allow MongoDB Atlas traffic

### Solution 6: Check Windows Firewall

```cmd
# Check firewall status
netsh advfirewall show allprofiles state

# Allow MongoDB port (if blocked)
netsh advfirewall firewall add rule name="MongoDB Atlas" dir=out action=allow protocol=TCP remoteport=27017
```

### Solution 7: Check Antivirus/Security Software

Some antivirus software blocks MongoDB connections:

- Temporarily disable antivirus
- Test connection
- If it works, add MongoDB Atlas to antivirus whitelist

## After Fixing

1. **Restart Development Server**:

   ```cmd
   # Press Ctrl+C to stop
   npm run dev
   ```

2. **Test Connection**:
   - Visit your application
   - Try logging in
   - Check if APIs work

3. **Verify in Logs**:
   ```
   ✅ [DB] Connection successful
   ✅ [API] /api/class-teacher/assessments/classes - Successfully returning data
   ```

## Revert DNS Changes (If Needed)

**PowerShell (Run as Administrator)**:

```powershell
# Get your network adapter
$adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1

# Reset to automatic (DHCP)
Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ResetServerAddresses

# Flush DNS
ipconfig /flushdns
```

**Manual**:

1. Open Network Connections (ncpa.cpl)
2. Right-click adapter > Properties
3. Select Internet Protocol Version 4 (TCP/IPv4) > Properties
4. Select **Obtain DNS server address automatically**
5. Click OK

## Prevention

To avoid this issue in the future:

1. **Use Reliable DNS**: Keep Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1)
2. **Whitelist IP**: Keep your IP whitelisted in MongoDB Atlas
3. **Stable Network**: Use wired connection when possible
4. **Router Firmware**: Keep router firmware updated

## Still Not Working?

If none of the above solutions work:

1. **Check MongoDB Atlas Status**: https://status.mongodb.com
2. **Test with Different Network**: Try mobile hotspot
3. **Contact ISP**: Your ISP might be blocking MongoDB Atlas
4. **Use Local MongoDB**: For development, consider local MongoDB:
   ```
   DATABASE_URL="mongodb://localhost:27017/schooloffice"
   ```

## Technical Details

**Connection String**:

```
mongodb+srv://schooloffice_acedmy:jl7doyh6aoABCK9j@schooloffice.jshbhxm.mongodb.net/schooloffice?retryWrites=true&w=majority
```

**Cluster**: schooloffice.jshbhxm.mongodb.net  
**Port**: 27017 (default MongoDB port)  
**Protocol**: mongodb+srv (DNS SRV record)

**Error Code**: 10051 (WSAENETUNREACH)  
**Meaning**: Network is unreachable - DNS resolution failed

## Files Created

- `fix-mongodb-connection.bat` - Diagnostic script
- `fix-dns-google.ps1` - Automatic DNS fix (PowerShell)
- `MONGODB-CONNECTION-TROUBLESHOOTING.md` - This guide

---

**Status**: This is a network/DNS infrastructure issue, not a code issue. Once network connectivity is restored, all APIs will work properly.
