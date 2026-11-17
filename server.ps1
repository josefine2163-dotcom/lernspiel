$root = $PSScriptRoot
$port = 8093
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
  $listener.Start()
} catch {
  Write-Host ""
  Write-Host "Die App laeuft bereits (in einem anderen Fenster). Du kannst einfach im Browser weiterlernen:"
  Write-Host "    http://localhost:$port/"
  Write-Host ""
  exit 0
}
Write-Host "Lernspiel laeuft auf http://localhost:$port/  (Fenster offen lassen, zum Beenden schliessen)"

$mime = @{
  ".html" = "text/html"; ".css" = "text/css"; ".js" = "application/javascript";
  ".json" = "application/json"; ".png" = "image/png"; ".svg" = "image/svg+xml";
  ".webmanifest" = "application/manifest+json"; ".ico" = "image/x-icon"; ".pdf" = "application/pdf"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $req = $context.Request
    $res = $context.Response
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    # Gemeldete Fragen: Die App schickt die ganze Liste, der Server schreibt sie nach meldungen/gemeldet.json (für Claude Code)
    if ($req.HttpMethod -eq "POST" -and $path -eq "/meldungen") {
      $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
      $body = $reader.ReadToEnd()
      $reader.Close()
      $ok = $false
      $t = $body.Trim()
      if ($t.Length -lt 20000000 -and $t.StartsWith("{") -and $t.EndsWith("}")) { $ok = $true }
      if ($ok) {
        $ordner = Join-Path $root "meldungen"
        if (-not (Test-Path -LiteralPath $ordner)) { $null = New-Item -ItemType Directory -Path $ordner }
        [System.IO.File]::WriteAllText((Join-Path $ordner "gemeldet.json"), $body, (New-Object System.Text.UTF8Encoding($false)))
        $res.StatusCode = 204
      } else {
        $res.StatusCode = 400
      }
      continue
    }
    if ($req.HttpMethod -ne "GET" -and $req.HttpMethod -ne "HEAD") { $res.StatusCode = 405; continue }
    if ($path -eq "/") { $path = "/index.html" }
    $filePath = [System.IO.Path]::GetFullPath((Join-Path $root ($path.TrimStart("/"))))

    if ($filePath.StartsWith($root) -and (Test-Path -LiteralPath $filePath -PathType Leaf)) {
      $ext = [System.IO.Path]::GetExtension($filePath)
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $res.ContentType = if ($contentType -match "^(text|application/(javascript|json|manifest))") { "$contentType; charset=utf-8" } else { $contentType }
      $res.Headers.Add("Cache-Control", "no-store")
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $res.StatusCode = 404
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch {
    Write-Host "Fehler: $_"
  } finally {
    $context.Response.OutputStream.Close()
  }
}
