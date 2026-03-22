@echo off
echo ========================================================
echo Starting Drishti AI Path Detection Service...
echo ========================================================
echo.
echo Note: Ensure you are running this from a standard Windows
echo Command Prompt as Administrator, and that Python 3.9+ is
echo installed with pip available in your PATH.
echo.
set PYTHON=C:\Users\rishi\AppData\Local\Python\pythoncore-3.14-64\python.exe

echo 1. Installing required deep learning dependencies...
%PYTHON% -m pip install -r requirements_full.txt

echo.
echo 2. Starting YOLOv8 + MiDaS backend...
%PYTHON% app_full.py

pause
