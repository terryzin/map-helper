#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
道路统计分析工具 - 客户端启动程序
"""

import sys
import os
import webbrowser
import threading
import time
import socket
from contextlib import closing
from app import app

def find_free_port():
    """找到一个可用的端口"""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port

def check_port_in_use(port):
    """检查端口是否被占用"""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        try:
            s.bind(('localhost', port))
            return False
        except OSError:
            return True

def start_flask_server(port):
    """启动Flask服务器"""
    try:
        print(f"正在启动Flask服务器，端口: {port}")
        app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
    except Exception as e:
        print(f"Flask服务器启动失败: {e}")

def open_browser(port):
    """延迟打开浏览器"""
    time.sleep(2)  # 等待服务器启动
    url = f"http://localhost:{port}"
    print(f"正在打开浏览器: {url}")
    webbrowser.open(url)

def main():
    """主函数"""
    print("道路统计分析工具 v1.0")
    print("=" * 50)
    
    # 查找可用端口
    port = 5000
    if check_port_in_use(port):
        port = find_free_port()
        print(f"端口5000被占用，使用端口: {port}")
    
    # 启动浏览器
    browser_thread = threading.Thread(target=open_browser, args=(port,))
    browser_thread.daemon = True
    browser_thread.start()
    
    # 显示访问信息
    print(f"服务器地址:")
    print(f"  本地访问: http://localhost:{port}")
    try:
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        print(f"  网络访问: http://{local_ip}:{port}")
    except:
        pass
    
    print("\n按 Ctrl+C 停止服务器")
    print("=" * 50)
    
    try:
        # 启动Flask服务器（阻塞）
        start_flask_server(port)
    except KeyboardInterrupt:
        print("\n正在停止服务器...")
        sys.exit(0)
    except Exception as e:
        print(f"服务器运行出错: {e}")
        input("按回车键退出...")
        sys.exit(1)

if __name__ == '__main__':
    main() 