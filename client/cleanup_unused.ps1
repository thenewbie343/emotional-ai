# Run this script in PowerShell to delete all unused files from the emotional-ai project
$base = "c:\Users\Asus\emotional-ai\client\src"

$unusedFiles = @(
    "$base\components\WebcamMood.jsx",
    "$base\components\EmotionAura.jsx",
    "$base\components\Portal.jsx",
    "$base\components\siya\CinematicCamera.jsx",
    "$base\components\siya\MirrorDimension.jsx",
    "$base\components\siya\AudioMandala.jsx",
    "$base\components\siya\QuantumSuperposition.jsx",
    "$base\components\siya\RealWorldEnv.jsx",
    "$base\components\siya\TimeWarp.jsx",
    "$base\components\siya\LiquidOpalShader.jsx",
    "$base\components\siya\Singularity.jsx"
)

foreach ($file in $unusedFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "Not found (skip): $file" -ForegroundColor Yellow
    }
}
Write-Host "Cleanup complete!" -ForegroundColor Cyan
