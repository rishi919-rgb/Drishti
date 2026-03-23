@echo off
echo ========================================================
echo Starting Drishti AI Distributed Ecosystem
echo ========================================================
echo.

:: 1. Start Python Deep-Learning Engine
echo [1/4] Booting Python Path Detection Engine (Port 5003)...
start "Drishti-Python" cmd /c "title Drishti-Python && cd path-detection-service && "C:\Users\rishi\AppData\Local\Python\pythoncore-3.14-64\python.exe" app_full.py > python.log 2>&1"
echo Waiting 15 seconds for PyTorch and YOLOv8 models to mount into RAM...
timeout /t 15 /nobreak

:: 2. Start AI Proxy Load Balancer
echo.
echo [2/4] Booting AI Proxy Gateway (Port 3001)...
start "Drishti-Proxy" cmd /c "title Drishti-Proxy && cd proxy && npm start > proxy.log 2>&1"
echo Waiting 5 seconds for Gemini API Keys to authenticate...
timeout /t 5 /nobreak

:: 3. Start Express Backend
echo.
echo [3/4] Booting Node Backend Database (Port 5002)...
start "Drishti-Backend" cmd /c "title Drishti-Backend && cd backend && npm start > backend.log 2>&1"
echo Waiting 5 seconds for MongoDB and API Routes to sync...
timeout /t 5 /nobreak

:: 4. Start React Frontend
echo.
echo [4/4] Booting React Frontend Interface (Port 5177)...
start "Drishti-Frontend" cmd /c "title Drishti-Frontend && cd frontend && npm run dev > frontend.log 2>&1"
echo Waiting 5 seconds for Vite Engine to map components...
timeout /t 5 /nobreak

echo.
echo ========================================================
echo ALL DRISHTI MICROSERVICES STARTED
echo ========================================================
echo - React Frontend:  http://localhost:5177 (or 5173/5174 based on Vite)
echo - Node Backend:    http://localhost:5002
echo - API Proxy:       http://localhost:3001/status
echo - ML Path Engine:  http://127.0.0.1:5003
echo.
echo Note: Output for each service is actively writing to:
echo  - path-detection-service\python.log
echo  - proxy\proxy.log
echo  - backend\backend.log
echo  - frontend\frontend.log
echo.
echo You may close this window. The background services will remain 
echo attached to their respective isolated command prompts. To shut 
echo everything down securely, run stop_all.bat.
pause
