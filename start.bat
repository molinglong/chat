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

echo [1/4] 检查 Node.js 环境...  OK

:: 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [2/4] 首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请检查网络连接。
        pause
        exit /b 1
    )
) else (
    echo [2/4] 依赖已安装，跳过安装步骤。
)

:: 生成 Prisma Client
echo [3/4] 生成 Prisma Client...
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

:: 启动开发服务器
echo [4/4] 启动开发服务器...
echo.
echo ========================================
echo  服务地址: http://localhost:3000
echo  按 Ctrl+C 停止服务
echo ========================================
echo.

call npx next dev

pause
