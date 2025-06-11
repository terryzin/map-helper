#!/bin/bash

echo "道路统计分析工具 - 客户端打包脚本"
echo "====================================="
echo

# 检查是否安装了PyInstaller
if ! python3 -c "import PyInstaller" 2>/dev/null; then
    echo "正在安装PyInstaller..."
    pip3 install pyinstaller
    if [ $? -ne 0 ]; then
        echo "PyInstaller安装失败！"
        exit 1
    fi
fi

# 清理之前的构建
if [ -d "build" ]; then
    rm -rf build
fi
if [ -d "dist" ]; then
    rm -rf dist
fi

echo "正在打包应用程序..."
echo
pyinstaller build.spec

if [ $? -ne 0 ]; then
    echo "打包失败！"
    exit 1
fi

echo
echo "打包完成！"
echo "可执行文件位置: dist/道路统计分析工具"
echo

# 复制缓存目录（如果存在）
if [ -d "cache" ]; then
    echo "复制缓存目录..."
    cp -r cache dist/
fi

echo "打包完成！运行 ./dist/道路统计分析工具" 