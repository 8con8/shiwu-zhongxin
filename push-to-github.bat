@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ShiWu Center - Push to GitHub

echo ==================================================
echo   ShiWu Center  -  Push to GitHub
echo ==================================================
echo.

echo [1/4] Checking git repository ...
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Not a git repository.
    pause
    exit /b 1
)
git log --oneline -1
echo.

echo [2/4] Before you continue, create an EMPTY repo on GitHub:
echo       https://github.com/new
echo.
echo       - Repository name : shiwu-zhongxin
echo       - Public          : YES  ^(required for free GitHub Pages^)
echo       - Do NOT check "Add a README file" / .gitignore / license
echo.
echo       Then copy the repo URL, it looks like:
echo       https://github.com/YOUR-NAME/shiwu-zhongxin.git
echo.
set "REPO="
set /p REPO=Paste the repo URL here and press Enter: 

if "%REPO%"=="" (
    echo.
    echo [CANCELLED] No URL entered.
    pause
    exit /b 0
)

echo.
echo [3/4] Setting remote and pushing ...
git remote remove origin >nul 2>nul
git remote add origin %REPO%

echo.
echo       A GitHub login window may pop up - sign in with your account.
echo.
git push -u origin main
if errorlevel 1 (
    echo.
    echo [WARN] Push failed. Trying to merge remote commit first ...
    git pull --rebase origin main
    git push -u origin main
)

if errorlevel 1 (
    echo.
    echo [FAILED] Push did not complete. Copy the messages above and send them back.
    pause
    exit /b 1
)

echo.
echo [4/4] Done!
echo.
echo ==================================================
echo   Next step - turn on GitHub Pages:
echo.
echo   1. Open  %REPO:.git=%
echo   2. Settings  -^>  Pages
echo   3. Source: Deploy from a branch
echo   4. Branch: main   Folder: /root   -^> Save
echo   5. Wait 1-3 minutes, your site is at:
echo      https://YOUR-NAME.github.io/shiwu-zhongxin/
echo ==================================================
echo.
pause
