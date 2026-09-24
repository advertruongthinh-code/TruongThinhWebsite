[CmdletBinding()]
param(
  [string]$SourceDirectory = (Join-Path $PSScriptRoot "../../_temp"),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "../../src/site/assets/content/client-logos")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$logoFiles = [ordered]@{
  "LogoBCJ.svg" = "bcj.svg"
  "LogoBeinco.svg" = "beinco.svg"
  "LogoBenhVienMinhDuc.svg" = "benh-vien-minh-duc.svg"
  "LogoBetrimex.svg" = "betrimex.svg"
  "LogoBIDV.svg" = "bidv.svg"
  "LogoCannesHotel.svg" = "cannes-hotel.svg"
  "LogoDuaCuuLong.svg" = "dua-cuu-long.svg"
  "LogoHDBank.svg" = "hdbank.svg"
  "LogoPrudential.svg" = "prudential.svg"
  "LogoTTC.svg" = "ttc-hospitality.svg"
  "LogoVietcombank.svg" = "vietcombank.svg"
  "LogoViettinbank.svg" = "vietinbank.svg"
}

$allowedElements = [System.Collections.Generic.HashSet[string]]::new(
  [string[]]@("svg", "g", "defs", "path", "polygon", "circle", "linearGradient", "stop")
)
$geometryAttributes = [System.Collections.Generic.HashSet[string]]::new(
  [string[]]@(
    "d", "points", "cx", "cy", "r", "x1", "y1", "x2", "y2", "gradientUnits",
    "gradientTransform", "offset", "href", "fill", "fill-rule", "clip-rule", "opacity",
    "stop-color", "stop-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "stroke-miterlimit", "transform"
  )
)

function Convert-StyleDeclarations {
  param([string]$Style)

  $declarations = [ordered]@{}
  foreach ($part in $Style -split ";") {
    if ($part -notmatch "^\s*([^:]+):\s*(.+?)\s*$") { continue }
    $name = $matches[1].Trim()
    if ($geometryAttributes.Contains($name)) {
      $declarations[$name] = $matches[2].Trim()
    }
  }
  return $declarations
}

function Copy-GeometryNode {
  param(
    [System.Xml.XmlNode]$SourceNode,
    [System.Xml.XmlDocument]$TargetDocument,
    [hashtable]$ClassStyles,
    [System.Collections.Generic.HashSet[string]]$ReferencedIds
  )

  if (-not $allowedElements.Contains($SourceNode.LocalName) -or $SourceNode.LocalName -eq "svg") {
    return $null
  }

  $targetNode = $TargetDocument.CreateElement($SourceNode.LocalName, "http://www.w3.org/2000/svg")
  $attributes = [ordered]@{}

  if ($SourceNode.Attributes["class"]) {
    foreach ($className in $SourceNode.Attributes["class"].Value -split "\s+") {
      if ($ClassStyles.ContainsKey($className)) {
        foreach ($entry in $ClassStyles[$className].GetEnumerator()) {
          $attributes[$entry.Key] = $entry.Value
        }
      }
    }
  }
  if ($SourceNode.Attributes["style"]) {
    foreach ($entry in (Convert-StyleDeclarations $SourceNode.Attributes["style"].Value).GetEnumerator()) {
      $attributes[$entry.Key] = $entry.Value
    }
  }

  foreach ($attribute in $SourceNode.Attributes) {
    $name = if ($attribute.LocalName -eq "href") { "href" } else { $attribute.Name }
    if ($geometryAttributes.Contains($name)) {
      $attributes[$name] = $attribute.Value
    }
    if ($name -eq "id" -and $ReferencedIds.Contains($attribute.Value)) {
      $attributes[$name] = $attribute.Value
    }
  }

  foreach ($entry in $attributes.GetEnumerator()) {
    $targetNode.SetAttribute($entry.Key, $entry.Value)
  }

  foreach ($child in $SourceNode.ChildNodes) {
    if ($child.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
    $copiedChild = Copy-GeometryNode $child $TargetDocument $ClassStyles $ReferencedIds
    if ($null -ne $copiedChild) { [void]$targetNode.AppendChild($copiedChild) }
  }

  return $targetNode
}

$sourceRoot = (Resolve-Path -LiteralPath $SourceDirectory).Path
$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputRoot) | Out-Null

foreach ($mapping in $logoFiles.GetEnumerator()) {
  $sourcePath = Join-Path $sourceRoot $mapping.Key
  if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw "Missing source logo: $sourcePath"
  }

  [xml]$sourceDocument = Get-Content -Raw -LiteralPath $sourcePath
  $viewBox = $sourceDocument.DocumentElement.GetAttribute("viewBox")
  if ([string]::IsNullOrWhiteSpace($viewBox)) { throw "Missing viewBox: $sourcePath" }

  $classStyles = @{}
  foreach ($styleNode in $sourceDocument.SelectNodes("//*[local-name()='style']")) {
    foreach ($match in [regex]::Matches($styleNode.InnerText, "(?ms)\.([A-Za-z_][\w-]*)\s*\{([^}]*)\}")) {
      $classStyles[$match.Groups[1].Value] = Convert-StyleDeclarations $match.Groups[2].Value
    }
  }

  $rawSvg = Get-Content -Raw -LiteralPath $sourcePath
  $referencedIds = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($match in [regex]::Matches($rawSvg, "(?:url\(#|(?:xlink:)?href=[`"']#)([A-Za-z_][\w.-]*)")) {
    [void]$referencedIds.Add($match.Groups[1].Value)
  }

  $targetDocument = [System.Xml.XmlDocument]::new()
  $targetRoot = $targetDocument.CreateElement("svg", "http://www.w3.org/2000/svg")
  $targetRoot.SetAttribute("viewBox", $viewBox)
  $targetRoot.SetAttribute("shape-rendering", "geometricPrecision")
  $targetRoot.SetAttribute("fill-rule", "evenodd")
  $targetRoot.SetAttribute("clip-rule", "evenodd")
  [void]$targetDocument.AppendChild($targetRoot)

  foreach ($child in $sourceDocument.DocumentElement.ChildNodes) {
    if ($child.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
    $copiedChild = Copy-GeometryNode $child $targetDocument $classStyles $referencedIds
    if ($null -ne $copiedChild) { [void]$targetRoot.AppendChild($copiedChild) }
  }

  $settings = [System.Xml.XmlWriterSettings]::new()
  $settings.Encoding = [System.Text.UTF8Encoding]::new($false)
  $settings.Indent = $true
  $settings.OmitXmlDeclaration = $true
  $targetPath = Join-Path $outputRoot $mapping.Value
  $writer = [System.Xml.XmlWriter]::Create($targetPath, $settings)
  try { $targetDocument.Save($writer) } finally { $writer.Dispose() }
}

Write-Output "Sanitized $($logoFiles.Count) client logos into $outputRoot"
