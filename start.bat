@echo off
chcp 65001 >nul 2>&1
title AI Chat 启动器
cd /d "%~dp0"

echo ========================================
echo        AI Chat 一键启动脚本
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+。
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] 检查 Node.js 环境...  OK

:: 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [2/5] 首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络连接。
        pause
        exit /b 1
    )
) else (
    echo [2/5] 依赖已安装，跳过安装步骤。
)

:: 生成 Prisma Client
echo [3/5] 生成 Prisma Client...
call npx prisma generate >nul 2>nul

:: 检查数据库是否存在，不存在则执行迁移
if not exist "dev.db" (
    echo       数据库不存在，正在执行迁移...
    call npx prisma migrate dev --name init 2>nul
    if %errorlevel% neq 0 (
        echo       尝试推送 schema...
        call npx prisma db push
    )
    echo       数据库初始化完成。
) else (
    echo       数据库已存在，跳过迁移。
)

:: 杀掉占用 3000 端口的旧进程
echo [4/5] 清理旧进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul && echo       已终止 PID: %%a
)

:: 清理 Next.js 缓存
if exist ".next" (
    rmdir /s /q ".next" >nul 2>nul
    echo       已清理 .next 缓存
)

:: 启动开发服务器
echo [5/5] 启动开发服务器...
echo.
echo ========================================
echo  服务地址: http://localhost:3000
echo  按 Ctrl+C 停止服务
echo ========================================
echo.

call npx next dev

pause
