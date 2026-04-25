param(
    [int]$Port = 5173,
    [string]$HostName = "127.0.0.1",
    [string]$Root = (Resolve-Path "$PSScriptRoot\..").Path
)

$ErrorActionPreference = "Stop"

$contentTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".csv"  = "text/csv; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".ico"  = "image/x-icon"
}

function Get-SafePath {
    param([string]$UrlPath)

    $relativePath = [Uri]::UnescapeDataString($UrlPath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = "index.html"
    }

    $candidate = [System.IO.Path]::GetFullPath((Join-Path $Root $relativePath))
    $rootPath = [System.IO.Path]::GetFullPath($Root)

    if (-not $candidate.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }

    return $candidate
}

function Write-Response {
    param(
        [System.IO.Stream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [string]$ContentType,
        [byte[]]$Body
    )

    $headers = "HTTP/1.1 $StatusCode $StatusText`r`n" +
        "Content-Type: $ContentType`r`n" +
        "Content-Length: $($Body.Length)`r`n" +
        "Connection: close`r`n" +
        "Cache-Control: no-store`r`n" +
        "`r`n"

    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    $Stream.Write($Body, 0, $Body.Length)
}

$address = [System.Net.IPAddress]::Parse($HostName)
$server = [System.Net.Sockets.TcpListener]::new($address, $Port)

try {
    $server.Start()
    Write-Host "Serving $Root at http://$HostName`:$Port/"
    Write-Host "Press Ctrl+C to stop."

    while ($true) {
        $client = $server.AcceptTcpClient()

        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                $client.Close()
                continue
            }

            while (-not [string]::IsNullOrEmpty($reader.ReadLine())) {
            }

            $parts = $requestLine.Split(" ")
            $method = $parts[0]
            $requestPath = $parts[1].Split("?")[0]

            if ($method -ne "GET" -and $method -ne "HEAD") {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
                Write-Response $stream 405 "Method Not Allowed" "text/plain; charset=utf-8" $body
                continue
            }

            $path = Get-SafePath $requestPath
            if ($null -eq $path -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
                Write-Response $stream 404 "Not Found" "text/plain; charset=utf-8" $body
                continue
            }

            $extension = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
            $contentType = if ($contentTypes.ContainsKey($extension)) {
                $contentTypes[$extension]
            } else {
                "application/octet-stream"
            }

            $body = if ($method -eq "HEAD") {
                [byte[]]::new(0)
            } else {
                [System.IO.File]::ReadAllBytes($path)
            }

            Write-Response $stream 200 "OK" $contentType $body
        } catch {
            try {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Server error")
                Write-Response $stream 500 "Internal Server Error" "text/plain; charset=utf-8" $body
            } catch {
            }
        } finally {
            $client.Close()
        }
    }
} finally {
    $server.Stop()
}
