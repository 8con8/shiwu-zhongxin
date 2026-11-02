@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ShiWu Center - Local Server

echo ==================================================
echo   ShiWu Center  -  Local HTTP Server
echo ==================================================
echo.
echo   Port: 8080   (change: edit this file)
echo   Stop:  close this window / Ctrl+C
echo.

where python >nul 2>nul
if %errorlevel%==0 (
    python serve.py
    goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
    py serve.py
    goto end
)

echo [ERROR] Python not found.
echo         Install Python from https://www.python.org/downloads/
echo         and check "Add Python to PATH" during setup.
echo.
pause

:end
