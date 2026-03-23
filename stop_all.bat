@echo off
echo ========================================================
echo Terminating Drishti AI Distributed Ecosystem
echo ========================================================
echo.

echo 1. Stopping Isolated Command Terminals...
:: We intentionally use the /T flag to terminate the specific CMD window and all attached child processes (Node/Python)
taskkill /F /FI "WINDOWTITLE eq Drishti-Python*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq Drishti-Proxy*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq Drishti-Backend*" /T 2>nul
taskkill /F /FI "WINDOWTITLE eq Drishti-Frontend*" /T 2>nul

echo 2. Sweeping Orphaned Microservices (Drishti Specific)...
:: Secondary sweep utilizing WMIC to catch detached node processes specifically running Drishti code
:: This guarantees we do not accidentally kill unrelated Node.js workflows you might be running.
wmic process where "name='node.exe' and commandline like '%%Drishti%%'" call terminate 2>nul
wmic process where "name='python.exe' and commandline like '%%app_full.py%%'" call terminate 2>nul

echo.
echo ========================================================
echo MEMORY TEARDOWN COMPLETE
echo All Drishti microservices have been successfully stopped.
echo ========================================================
pause
