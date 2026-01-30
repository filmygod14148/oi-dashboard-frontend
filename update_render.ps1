$TOKEN = "rnd_sJ7D1OCrSzgiVnwgwf1jl9DZ2opT"
$SERVICE_ID = "srv-d5s8uevfte5s73cnhh00"
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type"  = "application/json"
}

$body = @{
    serviceDetails = @{
        publishPath = "dist"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Updating Frontend Service configuration..."
try {
    $response = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$SERVICE_ID" -Method Patch -Headers $headers -Body $body
    Write-Host "Update successful!"
    $response | ConvertTo-Json
}
catch {
    Write-Host "Error occurred: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorResponse = $reader.ReadToEnd()
        Write-Host "Error Detail: $errorResponse"
    }
}
