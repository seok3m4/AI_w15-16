$ErrorActionPreference = "Stop"

$containerName = "jungle-ai-postgres"
$existing = docker ps -a --filter "name=^/$containerName$" --format "{{.Names}}"

if ([string]::IsNullOrWhiteSpace($existing)) {
	docker run --name $containerName `
		-e POSTGRES_DB=jungle_ai `
		-e POSTGRES_USER=jungle `
		-e POSTGRES_PASSWORD=jungle `
		-p 5432:5432 `
		-d pgvector/pgvector:pg16
} else {
	$running = docker ps --filter "name=^/$containerName$" --filter "status=running" --format "{{.Names}}"
	if ([string]::IsNullOrWhiteSpace($running)) {
		docker start $containerName
	} else {
		Write-Output "already-running:$containerName"
	}
}

docker exec $containerName pg_isready -U jungle -d jungle_ai
