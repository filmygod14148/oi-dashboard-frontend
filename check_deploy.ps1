$TOKEN = "rnd_sJ7D1OCrSzgiVnwgwf1jl9DZ2opT"
$SERVICE_ID = "srv-d5s8uevfte5s73cnhh00"
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type"  = "application/json"
}

try {
    Write-Host "Fetching deploys for service $SERVICE_ID..."
    $deploys = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$SERVICE_ID/deploys?limit=1" -Method Get -Headers $headers
    
    if ($deploys.Count -gt 0) {
        $lastDeploy = $deploys[0].deploy
        if ($null -eq $lastDeploy) { $lastDeploy = $deploys[0] }

        Write-Host "Last Deploy ID: $($lastDeploy.id)"
        Write-Host "Status: $($lastDeploy.status)"
        Write-Host "Commit: $($lastDeploy.commit.id)"
        Write-Host "Finished At: $($lastDeploy.finishedAt)"
        
        # We can't easily stream logs via simple REST without a stream reader on the log URL which might be authenticated differently or require a different endpoint.
        # But let's see if there is any other info.
    } else {
        Write-Host "No deploys found."
    }
}
catch {
    Write-Host "Error fetching deploys: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error Detail: $($reader.ReadToEnd())"
    }
}
