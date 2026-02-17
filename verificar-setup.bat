@echo off
echo ========================================
echo   n8n Monitor - Verificacion de Setup
echo ========================================
echo.

echo [1/3] Verificando archivo .env del backend...
if exist "backend\.env" (
    echo    ✓ Archivo backend\.env existe
    
    findstr /C:"AKIA_TU_ACCESS_KEY_AQUI" "backend\.env" >nul
    if %ERRORLEVEL% EQU 0 (
        echo    ⚠ ATENCION: Necesitas reemplazar las credenciales AWS
        echo    Edita backend\.env con tus credenciales reales
    ) else (
        echo    ✓ Credenciales configuradas
    )
) else (
    echo    ✗ Archivo .env no encontrado
    echo    Crea backend\.env desde backend\.env.example
)
echo.

echo [2/3] Verificando dependencias...
if exist "backend\node_modules" (
    echo    ✓ Backend: Dependencias instaladas
) else (
    echo    ⚠ Backend: Ejecuta 'cd backend ^&^& npm install'
)

if exist "frontend\node_modules" (
    echo    ✓ Frontend: Dependencias instaladas
) else (
    echo    ⚠ Frontend: Ejecuta 'cd frontend ^&^& npm install'
)
echo.

echo [3/3] Instrucciones para ejecutar:
echo.
echo    Backend (Terminal 1):
echo    ---------------------
echo    cd backend
echo    npm start
echo.
echo    Frontend (Terminal 2):
echo    ----------------------
echo    cd frontend
echo    npm run dev
echo.
echo    Dashboard URL: http://localhost:5173
echo    API URL: http://localhost:3001/api/monitor
echo.
echo ========================================
echo   Configuracion completa!
echo ========================================
pause
