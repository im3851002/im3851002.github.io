// 목록 페이지(index.html)와 상세 페이지(post.html)를 렌더링한다.
import { renderMarkdown, parseFrontMatter } from './markdown.js';

const params = new URLSearchParams(location.search);

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

function showStatus(container, message) {
  container.replaceChildren(el('p', { class: 'status', text: message }));
}

function tagLink(tag, activeTag) {
  const link = el('a', {
    class: 'tag' + (tag === activeTag ? ' is-active' : ''),
    href: `index.html?tag=${encodeURIComponent(tag)}`,
    text: `#${tag}`,
  });
  return link;
}

async function renderIndex() {
  const listEl = document.getElementById('post-list');
  const tagsEl = document.getElementById('tag-list');
  const activeTag = params.get('tag');

  let posts;
  try {
    const res = await fetch('posts/index.json');
    if (!res.ok) throw new Error(res.status);
    posts = await res.json();
  } catch {
    showStatus(listEl, '글 목록을 불러오지 못했습니다. 로컬 서버(python -m http.server)로 열었는지 확인해 주세요.');
    return;
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const allTags = [...new Set(posts.flatMap((p) => p.tags || []))];
  if (allTags.length) {
    tagsEl.replaceChildren(
      el('li', {}, [el('a', { class: 'tag' + (activeTag ? '' : ' is-active'), href: 'index.html', text: '전체' })]),
      ...allTags.map((t) => el('li', {}, [tagLink(t, activeTag)])),
    );
  }

  const visible = activeTag ? posts.filter((p) => (p.tags || []).includes(activeTag)) : posts;
  if (!visible.length) {
    showStatus(listEl, '아직 글이 없습니다.');
    return;
  }

  listEl.replaceChildren(
    ...visible.map((post) =>
      el('li', { class: 'post-item' }, [
        el('h2', { class: 'post-item__title' }, [
          el('a', { href: `post.html?slug=${encodeURIComponent(post.slug)}`, text: post.title }),
        ]),
        post.summary ? el('p', { class: 'post-item__summary', text: post.summary }) : '',
        el('div', { class: 'post-meta' }, [
          el('time', { datetime: post.date, text: formatDate(post.date) }),
          ...(post.tags || []).map((t) => tagLink(t, activeTag)),
        ]),
      ]),
    ),
  );
}

async function renderPost() {
  const article = document.getElementById('post');
  const slug = params.get('slug') || '';

  // 경로 조작 방지: 영문/숫자/하이픈만 허용
  if (!/^[\w-]+$/.test(slug)) {
    showStatus(article, '잘못된 글 주소입니다.');
    return;
  }

  let text;
  try {
    const res = await fetch(`posts/${slug}.md`);
    if (!res.ok) throw new Error(res.status);
    text = await res.text();
  } catch {
    showStatus(article, '글을 찾을 수 없습니다.');
    return;
  }

  const { data, body } = parseFrontMatter(text);
  const title = data.title || slug;
  document.title = `${title} · 내 블로그`;

  const header = el('header', { class: 'post-header' }, [
    el('h1', { text: title }),
    el('div', { class: 'post-meta' }, [
      data.date ? el('time', { datetime: data.date, text: formatDate(data.date) }) : '',
      el('span', { text: `읽는 시간 약 ${Math.max(1, Math.round(body.length / 500))}분` }),
      ...(Array.isArray(data.tags) ? data.tags : []).map((t) => tagLink(t)),
    ]),
  ]);

  const prose = el('div', { class: 'prose' });
  prose.innerHTML = renderMarkdown(body);

  article.replaceChildren(header, prose, el('a', { class: 'back-link', href: 'index.html', text: '← 목록으로' }));
}

if (document.body.dataset.page === 'post') renderPost();
else renderIndex();
