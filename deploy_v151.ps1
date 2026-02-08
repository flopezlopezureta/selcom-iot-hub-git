$host_ftp = "82.25.73.189"
$user = "u994400602.flopez"
$pass = "Dan15223-"
$local_dir = "dist"

Write-Host "Iniciando Despliegue v1.5.1 Correctivo..."

# 1. Asegurar index.html local es el de dist
Copy-Item "dist/index.html" "index.html" -Force

# 2. Subir index.html de forma prioritaria
Write-Host "Subiendo index.html maestro..."
& curl.exe -T "dist/index.html" --user "$($user):$($pass)" "ftp://$host_ftp/index.html" --silent

# 3. Subir assets
$files = Get-ChildItem -Path "$local_dir/assets" -Recurse | Where-Object { ! $_.PSIsContainer }
foreach ($file in $files) {
    $relative_path = "assets/" + $file.Name
    $remote_url = "ftp://$host_ftp/$relative_path"
    Write-Host "Subiendo: $relative_path ..."
    & curl.exe -T "$($file.FullName)" --user "$($user):$($pass)" "$remote_url" --ftp-create-dirs --silent
}

Write-Host "v1.5.1 Desplegada satisfactoriamente por FTP."
