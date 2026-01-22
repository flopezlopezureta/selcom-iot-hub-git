@echo off
title AutoPush GitHub
echo --- AutoPush GitHub ---

echo Comprobando estado de git...
git status

echo.
echo Agregando todos los archivos cambios...
git add .

if "%~1"=="" (
    set "msg=Auto-update: %date% %time%"
) else (
    set "msg=%~1"
)

echo.
echo Realizando commit con mensaje: "%msg%"
git commit -m "%msg%"

echo.
echo Subiendo cambios a GitHub...
git push

echo.
echo ¡Listo! Cambios subidos correctamente.
pause
