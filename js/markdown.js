// 마크다운 → HTML 변환기 (외부 라이브러리 없음)
// 모든 텍스트는 이스케이프한 뒤 태그를 만들고, 링크/이미지 URL은 안전한 스킴만 허용한다.

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url) {
  const compact = url.replace(/[\u0000- ]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (scheme && !['http', 'https', 'mailto'].includes(scheme[1].toLowerCase())) {
    return '#';
  }
  return url;
}

function inline(src) {
  const codes = [];
  let s = escapeHtml(src.replace(/\u0000/g, ''));

  // 인라인 코드는 다른 변환에서 보호하기 위해 먼저 빼 둔다
  s = s.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;.*?&quot;)?\)/g, (_, alt, url) => {
    return `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy">`;
  });

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;.*?&quot;)?\)/g, (_, text, url) => {
    const href = safeUrl(url);
    const external = /^https?:/i.test(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${attrs}>${text}</a>`;
  });

  s = s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?![\s*])(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>');

  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

const LIST_RE = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function renderList(lines) {
  const first = LIST_RE.exec(lines[0]);
  const baseIndent = first[1].length;
  const tag = /\d/.test(first[2]) ? 'ol' : 'ul';
  const items = [];

  for (const line of lines) {
    const m = LIST_RE.exec(line);
    if (m && m[1].length <= baseIndent) {
      items.push({ text: m[3], rest: [] });
    } else {
      items[items.length - 1].rest.push(line);
    }
  }

  const html = items.map((item) => {
    let nested = '';
    if (item.rest.length) {
      nested = LIST_RE.test(item.rest[0])
        ? renderList(item.rest)
        : ' ' + inline(item.rest.map((l) => l.trim()).join(' '));
    }
    return `<li>${inline(item.text)}${nested}</li>`;
  });

  return `<${tag}>${html.join('')}</${tag}>`;
}

function isBlockStart(line) {
  return (
    /^```/.test(line) ||
    /^#{1,6}\s/.test(line) ||
    /^>/.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
    LIST_RE.test(line)
  );
}

export function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // 코드 블록
    let m = /^```(\S*)/.exec(line);
    if (m) {
      const code = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++;
      const cls = m[1] ? ` class="language-${escapeHtml(m[1])}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // 제목
    m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const level = m[1].length;
      out.push(`<h${level} id="${slugify(m[2])}">${inline(m[2])}</h${level}>`);
      i++;
      continue;
    }

    // 수평선
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // 인용문
    if (/^>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`);
      continue;
    }

    // 표
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const th = head.map((c) => `<th>${inline(c)}</th>`).join('');
      const body = rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }

    // 목록
    if (LIST_RE.test(line)) {
      const list = [];
      while (i < lines.length && lines[i].trim() && (LIST_RE.test(lines[i]) || /^\s/.test(lines[i]))) {
        list.push(lines[i]);
        i++;
      }
      out.push(renderList(list));
      continue;
    }

    // 문단
    const para = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

// front matter(--- ... ---)를 분리한다. 값은 문자열 또는 [a, b] 형태의 배열.
export function parseFrontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };

  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([\w-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const value = kv[2].trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      data[kv[1]] = value.slice(1, -1).split(',').map((v) => v.trim()).filter(Boolean);
    } else {
      data[kv[1]] = value.replace(/^["']|["']$/g, '');
    }
  }
  return { data, body: text.slice(m[0].length) };
}
