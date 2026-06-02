@echo off
cd /d "c:\Users\安昕\Desktop\code\lottery-app"
echo 🚀 正在启动抽奖服务器...
start "抽奖管理后台" node server.js
timeout /t 2 /nobreak >nul
echo 📡 正在创建公网隧道...
ssh -o StrictHostKeyChecking=no -R 80:localhost:4000 nokey@localhost.run
pause
