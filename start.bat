@echo off
echo 启动道路统计分析工具...
echo Flask服务将在所有网络接口上监听端口5000
echo 可通过以下方式访问：
echo   - 本地访问: http://localhost:5000
echo   - 网络访问: http://[你的IP地址]:5000
echo.
REM 启动 Flask Web 服务
start /B python app.py
REM 等待3秒，确保服务启动
ping 127.0.0.1 -n 4 >nul
REM 自动打开默认浏览器
start http://localhost:5000
pause 