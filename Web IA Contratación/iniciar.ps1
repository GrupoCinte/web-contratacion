# Script rápido para iniciar backend y frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Iniciando n8n Monitor Dashboard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar .env backend
if (Test-Path "backend\.env") {
    $envContent = Get-Content "backend\.env" -Raw
    if ($envContent -match "AKIA_TU_ACCESS_KEY_AQUI") {
        Write-Host "⚠️  ATENCIÓN: Necesitas configurar tus credenciales AWS" -ForegroundColor Yellow
        Write-Host "   Edita: backend\.env" -ForegroundColor Yellow
        Write-Host ""
        $continue = "s" # Asumimos S por defecto si falla el input, o simplificamos
        # $continue = Read-Host "¿Continuar de todas formas? (s/n)"
        # if ($continue -ne "s") { exit }
    }
}

Write-Host "Iniciando Backend..." -ForegroundColor Green
# Usamos -NoNewWindow para ver errores si falla, o start directo
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'backend'; npm start"

Start-Sleep -Seconds 3

Write-Host "Iniciando Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev"

Write-Host ""
Write-Host "✅ Servidores iniciados en ventanas separadas!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 API: http://localhost:3001/api/monitor" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C en las otras ventanas para detenerlos." -ForegroundColor Gray
