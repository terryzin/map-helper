@echo off
echo 道路统计分析工具 - 客户端打包脚本
echo =====================================
echo.

REM 检查是否安装了PyInstaller
python -c "import PyInstaller" 2>nul
if errorlevel 1 (
    echo 正在安装PyInstaller...
    pip install pyinstaller
    if errorlevel 1 (
        echo PyInstaller安装失败！
        pause
        exit /b 1
    )
)

REM 清理之前的构建
if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"

echo 正在打包应用程序...
echo.
pyinstaller build.spec

if errorlevel 1 (
    echo 打包失败！
    pause
    exit /b 1
)

echo.
echo 打包完成！
echo 可执行文件位置: dist\道路统计分析工具.exe
echo.

REM 复制缓存目录（如果存在）
if exist "cache" (
    echo 复制缓存目录...
    xcopy /E /I "cache" "dist\cache"
)

echo 打包完成！双击运行 dist\道路统计分析工具.exe
pause 