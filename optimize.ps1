param(
  [Parameter(Mandatory=$true)][string]$Video,
  [ValidateSet("hdr","standard")][string]$Mode = "hdr"
)
$ErrorActionPreference = "Stop"
$repo = "$HOME\Desktop\vague-transcode-4k-test"
$src  = (Resolve-Path -LiteralPath $Video).Path
$outDir = Join-Path $repo "out"
New-Item -ItemType Directory -Force $outDir | Out-Null
$dst = Join-Path $outDir ("{0}-optimized.mp4" -f [IO.Path]::GetFileNameWithoutExtension($src))
if ($src -eq $dst) { throw "Output would overwrite the source" }

# 1. Inspect source (read-only)
$s = ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,time_base,nb_frames -show_entries format=duration,size -of json $src | ConvertFrom-Json
$v = $s.streams | Where-Object codec_type -eq "video" | Select-Object -First 1
$a = $s.streams | Where-Object codec_type -eq "audio"
$n,$d = $v.r_frame_rate -split "/"; $fps = [double]$n / [double]$d
$tb = [int](($v.time_base -split "/")[1])
$mb = [double]$s.format.size / 1MB
Write-Host ("SOURCE: {0}x{1} {2} fps {3} {4:N1} MiB timescale {5}" -f $v.width,$v.height,$fps,$v.codec_name,$mb,$tb)
if ($mb -gt 572)      { throw "File is over ~600 MB" }

# 2. Optimize
Push-Location $repo
$pargs = @("tools/rtx-pipeline.js", $src, $dst, "--preserve-source")
if ($Mode -eq "standard") { $pargs += "--keep-dv" }
node @pargs
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Pipeline failed" }
Pop-Location

# 3. Validate: ffprobe + mandatory copy test
$o = ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,color_transfer:stream_side_data -show_entries format=duration,size -of json $dst | ConvertFrom-Json
$ov = $o.streams | Where-Object codec_type -eq "video" | Select-Object -First 1
$oa = @($o.streams | Where-Object codec_type -eq "audio").Count
$dv = [bool]($ov.side_data_list | Where-Object side_data_type -like "DOVI*")
Write-Host ("OUTPUT: {0}x{1} {2} fps, {3} frames, {4} audio track(s), DV present: {5}, {6:N2}s" -f $ov.width,$ov.height,$ov.r_frame_rate,$ov.nb_frames,$oa,$dv,[double]$o.format.duration)
$err = ffmpeg -v error -copyts -i $dst -map 0 -c copy -fps_mode passthrough -f null - 2>&1
if ($err) { Write-Host "COPY TEST: FAIL" -ForegroundColor Red; $err } else { Write-Host "COPY TEST: PASS" -ForegroundColor Green }
Write-Host "FILE: $dst"


