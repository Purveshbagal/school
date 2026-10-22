# Ensures the local MongoDB this app uses is running (Windows "MongoDB" service, port 27017).
# Prisma requires a replica set for MongoDB; the service is configured with replSetName rs0
# in C:\Program Files\MongoDB\Server\9.0\bin\mongod.cfg.

$existing = Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "MongoDB (school-app) already running on port 27017."
  exit 0
}

Write-Host "Starting MongoDB service..."
try {
  Start-Service -Name MongoDB -ErrorAction Stop
  Start-Sleep -Seconds 3
  Write-Host "MongoDB ready at mongodb://127.0.0.1:27017/school-app?replicaSet=rs0"
} catch {
  Write-Host "Could not start the MongoDB service ($($_.Exception.Message))."
  Write-Host "Start it from an administrator terminal: net start MongoDB"
}
