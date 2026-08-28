@echo off
cd /d "C:\Users\Anwender\Documents\Default Project\nachbarschaft-jobs"
start "Nachbarjobs Server" /min cmd /c "npx.cmd next start -p 3000 > prod.log 2>&1"
timeout /t 5 /nobreak >nul
start "Nachbarjobs Tunnel" /min cmd /c "tools\cloudflared.exe tunnel --url http://localhost:3000 > cf.log 2>&1"
