// 다크 모드 토글. 첫 적용은 각 HTML <head>의 인라인 스크립트가 담당한다(깜빡임 방지).
const STORAGE_KEY = 'theme';
const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');

function stored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function apply(theme) {
  root.setAttribute('data-theme', theme);
  const button = document.querySelector('.theme-toggle');
  if (button) {
    const dark = theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
  }
}

apply(stored() || (media.matches ? 'dark' : 'light'));

document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  apply(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 저장 실패해도 현재 세션에서는 적용된다
  }
});

// 사용자가 직접 고르지 않았다면 OS 설정 변경을 따라간다
media.addEventListener('change', (e) => {
  if (!stored()) apply(e.matches ? 'dark' : 'light');
});
