Add-Type -AssemblyName System.Drawing

$src = "C:\Users\spfst\.gemini\antigravity\brain\8bb7d7b7-89bf-408c-b5ce-03da0cfa12be\pwa_icon_1780968225039.png"
$destDir = "c:\Users\spfst\Desktop\Antigravity files\family-expense-tracker\public\icons"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

function ResizeImage($inputPath, $outputPath, $size) {
    $img = [System.Drawing.Image]::FromFile($inputPath)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $size, $size)
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    Write-Output "Saved: $outputPath"
}

ResizeImage $src "$destDir\icon-512x512.png" 512
ResizeImage $src "$destDir\icon-192x192.png" 192
ResizeImage $src "$destDir\icon-maskable-512x512.png" 512

Write-Output "All icons generated!"
