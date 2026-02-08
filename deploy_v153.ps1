$host_ftp = "82.25.73.189"
$user = "u994400602.flopez"
$pass = "Dan15223-"
$local_dir = "dist"

Write-Host "Desplegando Selcom IoT Hub v1.5.3 - Mejora UI Final..."

# 1. Subir index.html prioritario
Write-Host "Actualizando punto de entrada index.html..."
& curl.exe -T "dist/index.html" --user "$($user):$($pass)" "ftp://$host_ftp/index.html" --silent

# 2. Subir todos los archivos en dist/assets
$files = Get-ChildItem -Path "$local_dir/assets" -Recurse | Where-Object { ! $_.PSIsContainer }
foreach ($file in $files) {
    $relative_path = "assets/" + $file.Name
    $remote_url = "ftp://$host_ftp/$relative_path"
    Write-Host "Subiendo asset: $relative_path ..."
    & curl.exe -T "$($file.FullName)" --user "$($user):$($pass)" "$remote_url" --ftp-create-dirs --silent
}

Write-Host "v1.5.3 desplegada con éxito. Por favor usa Ctrl + F5 en el navegador."
