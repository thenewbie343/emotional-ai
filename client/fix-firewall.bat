@echo off
echo ========================================================
echo Fixing Windows Firewall for Node.js (Vite Network Access)
echo ========================================================
echo.
echo Requesting Administrator privileges if needed...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed.
) else (
    echo.
    echo ERROR: Please right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo Adding firewall rule for your custom Node.js executable...
powershell -Command "New-NetFirewallRule -DisplayName 'Node.js (Emotional AI)' -Direction Inbound -Action Allow -Program 'C:\Users\Asus\emotional-ai\node.exe' -Profile Any -ErrorAction SilentlyContinue"

echo Adding firewall rule for port 5173 (Vite)...
powershell -Command "New-NetFirewallRule -DisplayName 'Vite Port 5173' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Any -ErrorAction SilentlyContinue"

echo Adding firewall rule for port 3000 (Express API)...
powershell -Command "New-NetFirewallRule -DisplayName 'Express Port 3000' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Any -ErrorAction SilentlyContinue"

echo.
echo Your local IP addresses (use the IPv4 address to connect from your phone):
ipconfig | findstr /i "ipv4"

echo.
echo ========================================================
echo Firewall rules updated!
echo 1. Make sure your phone and PC are on the SAME Wi-Fi network.
echo 2. Restart your development server (npm run dev).
echo 3. Enter the IPv4 address shown above in your phone's browser with :5173 at the end.
echo    Example: http://192.168.1.X:5173
echo ========================================================
pause
