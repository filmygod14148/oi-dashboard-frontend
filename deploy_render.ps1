$TOKEN = "rnd_sJ7D1OCrSzgiVnwgwf1jl9DZ2opT"
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type"  = "application/json"
}

# 1. Get Owner ID
Write-Host "Fetching Owner ID..."
try {
    $owners = Invoke-RestMethod -Uri "https://api.render.com/v1/owners" -Method Get -Headers $headers
    $ownerId = $owners[0].owner.id
    Write-Host "Owner ID: $ownerId"
}
catch {
    Write-Error "Failed to fetch owners: $_"
    exit 1
}

# 2. Define Frontend Service
$body = @{
    name           = "oi-dashboard-frontend"
    type           = "static_site"
    repo           = "https://github.com/filmygod14148/oi-dashboard-frontend"
    branch         = "main"
    ownerId        = $ownerId
    serviceDetails = @{
        buildCommand   = "npm install && npm run build"
        publishDir      = "dist"
        plan           = "free"
    }
    envVars        = @(
        @{ key = "VITE_API_URL"; value = "https://oi-dashboard-backend.onrender.com" }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Service Body: $body"
Write-Host "Creating Frontend Static Site on Render..."
try {
    $response = Invoke-RestMethod -Uri "https://api.rest.render.com/v1/services" -Method Post -Headers $headers -Body $body
    Write-Host "Frontend Service creation successful!"
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

