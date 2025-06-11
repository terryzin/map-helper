#!/bin/bash
echo "启动道路统计分析工具..."
echo "Flask服务将在所有网络接口上监听端口5000"
echo "可通过以下方式访问："
echo "  - 本地访问: http://localhost:5000"
echo "  - 网络访问: http://[你的IP地址]:5000"
echo ""
# 启动 Flask Web 服务
nohup python3 app.py &
# 等待3秒，确保服务启动
sleep 3
# 自动打开默认浏览器
xdg-open http://localhost:5000 || open http://localhost:5000 