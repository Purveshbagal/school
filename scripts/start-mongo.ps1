# Starts the local MongoDB replica-set instance this app uses (port 27018).
# Prisma requires a replica set for MongoDB, so this app runs its own mongod
# instead of the standalone Windows "MongoDB" service on port 27017.

$dataDir = "$env:USERPROFILE\mongo-schoolapp\data"
$logDir = "$env:USERPROFILE\mongo-schoolapp\log"
$mongod = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$existing = Get-NetTCPConnection -LocalPort 27018 -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "MongoDB (school-app) already running on port 27018."
  exit 0
}

Write-Host "Starting MongoDB replica set on port 27018..."
Start-Process -FilePath $mongod -ArgumentList @(
  "--dbpath", $dataDir,
  "--logpath", "$logDir\mongod.log",
  "--port", "27018",
  "--replSet", "rs0",
  "--bind_ip", "127.0.0.1"
) -WindowStyle Hidden

Start-Sleep -Seconds 3

# Initiate the replica set if not already initiated (safe to call every time; ignores AlreadyInitialized).
node -e "
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient('mongodb://127.0.0.1:27018/?directConnection=true');
  await client.connect();
  const admin = client.db('admin').admin();
  try {
    await admin.command({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27018' }] } });
    console.log('Replica set initiated.');
  } catch (e) {
    if (e.codeName === 'AlreadyInitialized') {
      console.log('Replica set already initiated.');
    } else {
      console.log('Note:', e.message);
    }
  }
  await client.close();
})();
" 2>$null

Write-Host "MongoDB ready at mongodb://127.0.0.1:27018/school-app?replicaSet=rs0"
