$TOKEN = "rnd_sJ7D1OCrSzgiVnwgwf1jl9DZ2opT"
$SERVICE_ID = "srv-d5s8uevfte5s73cnhh00"
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type"  = "application/json"
}

# 1. Get current service details to preserve existing env vars if needed
# But simplicity first: allow setting new env vars.
# The endpoint for updating environment variables is often separate or part of service update.
# PATCH /services/{serviceId} allows updating envVars.

$body = @{
    envVars = @(
        @{ key = "NODE_VERSION"; value = "20.10.0" },
        @{ key = "VITE_API_URL"; value = "https://oi-dashboard-backend.onrender.com" }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Updating Service Env Vars..."
try {
    $response = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$SERVICE_ID" -Method Patch -Headers $headers -Body $body
    Write-Host "Service updated successfully!"
    $response | ConvertTo-Json
}
catch {
    Write-Host "Error updating service: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error Detail: $($reader.ReadToEnd())"
    }
}
