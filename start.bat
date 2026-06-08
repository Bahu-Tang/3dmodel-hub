@echo off
echo 3D Model Hub
echo.
wsl -d Ubuntu-26.04 -- bash -c "cd ~/3dmodel && node server-http.js"
pause
