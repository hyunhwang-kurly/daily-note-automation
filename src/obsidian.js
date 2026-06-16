// Obsidian 딥링크(obsidian://) 생성. 순수 함수.

// 절대 파일 경로 + 볼트명 → obsidian://open URI
// 볼트명이 경로에 있으면 그 다음을 볼트 내 상대경로로 사용.
export function obsidianUri(fullPath, vaultName) {
  const marker = `/${vaultName}/`
  const idx = fullPath.indexOf(marker)
  const rel = idx >= 0 ? fullPath.slice(idx + marker.length) : fullPath.split('/').pop()
  // 슬래시/공백/한글 모두 인코딩 (Obsidian 권장 방식)
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(rel)}`
}
