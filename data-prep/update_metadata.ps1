$datasetPath = "dataset/historical_tickets_cleaned.json"
$outPath = "ml-service/models/ticket_metadata.json"

$content = Get-Content -Raw -Path $datasetPath
$tickets = $content | ConvertFrom-Json

$catalog = [ordered]@{}
foreach ($t in $tickets) {
    $catalog[$t.ticket_id] = [ordered]@{
        ticket_id = $t.ticket_id
        title = $t.title
        description = $t.description
        affected_service = $t.affected_service
        category = $t.category
        subcategory = $t.subcategory
        priority = $t.priority
        intent = $t.intent
        environment = $t.environment
        status = $t.status
        assignment_group = $t.assignment_group
        data_access_level = $t.data_access_level
        resolution_text = $t.resolution_text
        resolved_at = $t.resolved_at
        created_at = $t.created_at
    }
}

$json = $catalog | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outPath, $json, [System.Text.Encoding]::UTF8)
Write-Host "Successfully updated $outPath with resolution_text for $($catalog.Count) records."
