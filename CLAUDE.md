# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 따라야 할 지침입니다.

## 프로젝트 개요

마크다운(`.md`) 파일을 읽어 블로그 웹사이트로 변환하는 프로젝트입니다.

- **프레임워크·UI 라이브러리 사용 금지.** 순수 HTML, CSS, JavaScript(바닐라 JS)만 사용합니다.
- 디자인 목표: 깔끔하고 읽기 좋은 타이포그래피, 다크 모드 지원, 모바일 우선 반응형.
- 빌드 도구(webpack, vite 등)와 CSS 프레임워크(Tailwind, Bootstrap 등)는 도입하지 않습니다.
- 새 의존성을 추가해야 할 것 같으면 먼저 사용자에게 확인합니다. (마크다운 파서가 필요하면 직접 작성하거나 CDN/로컬 단일 파일 사용 여부를 먼저 상의)

> 현재 저장소는 초기 상태입니다. 아래 구조와 명령은 목표 설계이며, 실제 구조가 바뀌면 이 파일도 함께 갱신하세요.

## 권장 디렉터리 구조

```
my-blog/
├── index.html          # 글 목록 페이지
├── post.html           # 글 상세 페이지 (?slug=... 로 글 선택)
├── css/
│   ├── base.css        # 리셋, CSS 변수(색상·간격·폰트), 타이포그래피
│   ├── layout.css      # 헤더, 푸터, 컨테이너, 반응형 규칙
│   └── markdown.css    # 본문(.prose) 스타일: 제목, 코드, 인용, 표 등
├── js/
│   ├── markdown.js     # 마크다운 → HTML 변환기
│   ├── router.js       # 목록/상세 페이지 로직
│   └── theme.js        # 다크 모드 토글 및 저장
├── posts/
│   ├── index.json      # 글 목록 메타데이터 (제목, 날짜, slug, 태그, 요약)
│   └── *.md            # 블로그 글 (front matter + 본문)
└── CLAUDE.md
```

## 개발 방법

`fetch()`로 `.md` 파일을 불러오므로 `file://`로 직접 열면 CORS 오류가 납니다. 로컬 정적 서버로 확인합니다.

```bash
python -m http.server 8000
```

그 후 `http://localhost:8000` 접속. 빌드·린트·테스트 도구는 없습니다.

## 동작 방식

1. 페이지가 `posts/index.json`을 fetch해 글 목록을 렌더링한다.
2. 글을 열면 해당 `posts/<slug>.md`를 fetch한다.
3. `markdown.js`가 front matter를 분리하고 본문을 HTML로 변환한다.
4. 변환된 HTML을 `.prose` 컨테이너에 삽입한다.

### 글 형식 (front matter)

```markdown
---
title: 글 제목
date: 2026-11-01
tags: [일기, 개발]
summary: 목록에 보여줄 한 줄 요약
---

본문...
```

새 글을 추가할 때는 `.md` 파일을 만들고 `posts/index.json`에도 항목을 추가합니다.

### 마크다운 변환 시 지원 범위

제목(h1–h6), 문단, 굵게/기울임, 링크, 이미지, 순서/비순서 목록, 인용문, 인라인 코드, 코드 블록(```), 수평선, 표(가능하면). 

**보안:** 마크다운에서 변환한 HTML을 `innerHTML`에 넣기 전에 반드시 텍스트를 이스케이프하고, `javascript:` 같은 위험한 URL 스킴은 차단합니다.

## 디자인 가이드

### 읽기 좋은 본문
- 본문 폭 최대 `65ch`(약 680px) 정도로 제한, 가운데 정렬.
- 본문 글자 크기 `1.0625rem`(17px) 내외, 행간 `1.7` 이상.
- 한글에 맞는 시스템 폰트 스택 사용 (예: `Pretendard`, `-apple-system`, `"Noto Sans KR"`, `system-ui`, `sans-serif`). 웹폰트는 꼭 필요할 때만.
- 한글 줄바꿈: `word-break: keep-all; overflow-wrap: break-word;`
- 여백은 넉넉하게, 장식은 최소화.

### 색상은 CSS 변수로만 관리
색상 값을 컴포넌트 CSS에 직접 쓰지 말고 `:root` 변수를 사용합니다.

```css
:root {
  --bg: #ffffff;
  --text: #1f2328;
  --muted: #656d76;
  --border: #d8dee4;
  --accent: #2563eb;
  --code-bg: #f6f8fa;
}
:root[data-theme="dark"] {
  --bg: #0d1117;
  --text: #e6edf3;
  --muted: #8b949e;
  --border: #30363d;
  --accent: #6ea8fe;
  --code-bg: #161b22;
}
```

### 다크 모드
- 기본값은 OS 설정(`prefers-color-scheme`)을 따른다.
- 헤더의 토글 버튼으로 수동 전환하면 `localStorage`에 저장하고 `<html data-theme="...">`로 적용한다.
- **깜빡임 방지:** 테마 적용 스크립트는 `<head>`에서 CSS보다 먼저 인라인 또는 동기 스크립트로 실행한다.
- 다크 모드에서도 본문 대비(WCAG AA, 4.5:1 이상)를 유지한다. 순수 `#000`/`#fff` 조합은 피한다.

### 모바일 / 반응형
- 모든 HTML `<head>`에 `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- **모바일 우선**으로 작성하고 `min-width` 미디어 쿼리로 확장한다. 주요 구간: ~600px, ~900px.
- 좌우 여백은 최소 `1rem`. 가로 스크롤이 생기면 안 된다.
- 코드 블록·표는 `overflow-x: auto`로 컨테이너 안에서만 스크롤. 이미지는 `max-width: 100%; height: auto`.
- 터치 대상(버튼·링크)은 최소 44×44px.

### 접근성
- 시맨틱 태그(`header`, `nav`, `main`, `article`, `footer`) 사용.
- 테마 토글 버튼에 `aria-label`과 `aria-pressed` 지정. 이미지는 `alt` 필수.
- 키보드 포커스 스타일(`:focus-visible`)을 제거하지 않는다.

## 코드 컨벤션

- JavaScript: ES 모듈(`type="module"`) 또는 단순 스크립트, `const`/`let`만 사용, 세미콜론 사용, 2칸 들여쓰기.
- 전역 변수를 만들지 않는다. 기능별로 파일을 분리한다.
- CSS: 클래스 기반, 가능한 한 낮은 명시도. `!important` 지양. BEM 스타일 또는 단순한 의미 있는 클래스명.
- HTML/CSS/JS 모두 최신 브라우저(Chrome, Safari, Firefox, Edge 최신 2개 버전) 기준. 폴리필은 넣지 않는다.
- 주석과 문서는 한국어로 작성해도 되지만, 파일명·변수명·클래스명은 영어를 사용한다.
- 글 파일명(slug)은 영문 소문자와 하이픈 (`my-first-post.md`).

## 작업 시 주의사항

- 변경 후에는 라이트/다크 모드, 모바일 폭(약 375px)과 데스크톱 폭을 모두 확인한다.
- 이 CLAUDE.md의 구조나 규칙과 실제 코드가 어긋나면 코드가 아니라 먼저 사용자에게 확인하고, 합의된 내용으로 이 파일을 갱신한다.
