// Obsidian 딥링크(obsidian://) 생성. 순수 함수.

// 절대 파일 경로 + 볼트명 → 볼트 내 상대경로
function vaultRelative(fullPath, vaultName) {
  const marker = `/${vaultName}/`
  const idx = fullPath.indexOf(marker)
  return idx >= 0 ? fullPath.slice(idx + marker.length) : fullPath.split('/').pop()
}

// 절대 파일 경로 + 볼트명 → obsidian://open URI
// 볼트명이 경로에 있으면 그 다음을 볼트 내 상대경로로 사용.
export function obsidianUri(fullPath, vaultName) {
  const rel = vaultRelative(fullPath, vaultName)
  // 슬래시/공백/한글 모두 인코딩 (Obsidian 권장 방식)
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(rel)}`
}

// https 리다이렉트 URL. Gmail 등 웹메일은 obsidian:// 커스텀 스킴 링크를
// 제거하므로, 메일 버튼은 이 https 페이지를 거쳐 obsidian://으로 넘긴다.
// base: GitHub Pages 등에 올린 open.html 주소.
export function obsidianWebUri(fullPath, vaultName, base) {
  const rel = vaultRelative(fullPath, vaultName)
  return `${base}?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(rel)}`
}
