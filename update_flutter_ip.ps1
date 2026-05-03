$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match "Wi-Fi|Ethernet" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
if ($ip) {
    Write-Host "Detected active IP: $ip"
    $file = "$PSScriptRoot\lib\core\constants\app_constants.dart"
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "http://[\d\.]+:3000/api/v1", "http://${ip}:3000/api/v1"
        Set-Content -Path $file -Value $content
        Write-Host "Successfully updated app_constants.dart with new IP: $ip"
    } else {
        Write-Host "Error: Could not find app_constants.dart at $file"
    }
} else {
    Write-Host "Could not detect active Wi-Fi or Ethernet IP address."
}
