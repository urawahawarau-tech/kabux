const STORE_KEY = "kabux:v0.1";
const MAX_BODY_LENGTH = 10000;

const seed = {
  viewerId: "u-yui",
  activeFeed: "globalRecommended",
  activeRoute: "home",
  searchKind: "all",
  users: [
    {
      id: "u-yui",
      username: "yui",
      displayName: "Yui",
      bio: "日本株の決算と需給を追っています。",
      avatarUrl: "",
      createdAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "u-alpha",
      username: "alpha_kabu",
      displayName: "決算メモ",
      bio: "上方修正、営業利益率、株主還元を中心にメモ。",
      avatarUrl: "",
      createdAt: "2026-05-12T07:30:00.000Z",
    },
    {
      id: "u-flow",
      username: "supply_demand",
      displayName: "需給観測",
      bio: "信用倍率、出来高、空売り残を淡々と。",
      avatarUrl: "",
      createdAt: "2026-05-11T10:12:00.000Z",
    },
    {
      id: "u-chart",
      username: "chart_note",
      displayName: "テクニカル手帖",
      bio: "移動平均と高値更新だけを見る人。",
      avatarUrl: "",
      createdAt: "2026-05-10T03:10:00.000Z",
    },
  ],
  posts: [
    {
      id: "p-1",
      userId: "u-alpha",
      body: "7203は会社予想ベースのPERがまだ極端に高くない一方、円安メリットの織り込みが進んでいる印象。次の決算では営業利益率よりも、通期上方修正の有無と自己株買い余地を見たい。\n\n#7203 #トヨタ",
      imageUrls: [chartImage("PER", "#1f6feb", [22, 24, 25, 21, 20, 18, 17])],
      quotedPostId: null,
      replyToPostId: null,
      impressionCount: 5421,
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(3),
    },
    {
      id: "p-2",
      userId: "u-flow",
      body: "高値ブレイク銘柄を見るときは、出来高増を伴っているかを先に見る。薄商いの上抜けは、翌日以降に売り物が出ると崩れやすい。信用買い残が増えすぎていないかもセット確認。\n\n#需給 #高値ブレイク",
      imageUrls: [],
      quotedPostId: null,
      replyToPostId: null,
      impressionCount: 3910,
      createdAt: hoursAgo(8),
      updatedAt: hoursAgo(8),
    },
    {
      id: "p-3",
      userId: "u-chart",
      body: "25日線を割らずに横ばい、出来高だけ落ちている形は悪くない。次に高値を抜くなら、初動ではなく2段目として見る。\n\n#テクニカル",
      imageUrls: [chartImage("MA25", "#0f766e", [18, 22, 26, 25, 29, 31, 35])],
      quotedPostId: null,
      replyToPostId: null,
      impressionCount: 2214,
      createdAt: hoursAgo(18),
      updatedAt: hoursAgo(18),
    },
    {
      id: "p-4",
      userId: "u-yui",
      body: "こういう投稿に対して、単なるリポストではなく引用で前提や反論を足せるSNSにしたい。",
      imageUrls: [],
      quotedPostId: "p-2",
      replyToPostId: null,
      impressionCount: 910,
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
  ],
  follows: [
    { followerId: "u-yui", followingId: "u-alpha", createdAt: hoursAgo(30) },
    { followerId: "u-yui", followingId: "u-flow", createdAt: hoursAgo(20) },
  ],
  reactions: [
    { id: "r-1", userId: "u-yui", postId: "p-1", type: "useful", createdAt: hoursAgo(2) },
    { id: "r-2", userId: "u-flow", postId: "p-1", type: "useful", createdAt: hoursAgo(2) },
    { id: "r-3", userId: "u-alpha", postId: "p-2", type: "useful", createdAt: hoursAgo(6) },
    { id: "r-4", userId: "u-yui", postId: "p-3", type: "useful", createdAt: hoursAgo(9) },
    { id: "r-5", userId: "u-chart", postId: "p-2", type: "noise", createdAt: hoursAgo(4) },
  ],
  bookmarks: [
    { id: "b-1", userId: "u-yui", postId: "p-1", createdAt: hoursAgo(2) },
    { id: "b-2", userId: "u-yui", postId: "p-3", createdAt: hoursAgo(8) },
  ],
  reports: [],
  notifications: [
    { id: "n-1", userId: "u-yui", text: "決算メモさんがあなたをフォローしました", createdAt: hoursAgo(2) },
    { id: "n-2", userId: "u-yui", text: "需給観測さんが投稿を有益にしました", createdAt: hoursAgo(5) },
  ],
};

let state = loadState();
let modalContext = { quoteId: null, replyToId: null };
let pendingImages = { inlineComposer: [], modalComposer: [] };

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function chartImage(label, color, values) {
  const bars = values
    .map((value, index) => {
      const x = 28 + index * 37;
      const height = value * 3;
      const y = 136 - height;
      return `<rect x="${x}" y="${y}" width="22" height="${height}" rx="3" fill="${color}"/>`;
    })
    .join("");
  const line = values
    .map((value, index) => `${39 + index * 37},${128 - value * 3}`)
    .join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#f8fafc"/><path d="M28 138H292M28 98H292M28 58H292" stroke="#d9e0ea"/><text x="24" y="28" font-family="Arial" font-size="18" font-weight="700" fill="#111827">${label}</text>${bars}<polyline points="${line}" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function loadState() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) return structuredClone(seed);
  try {
    return { ...structuredClone(seed), ...JSON.parse(saved) };
  } catch {
    return structuredClone(seed);
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function currentUser() {
  return state.users.find((user) => user.id === state.viewerId) || state.users[0];
}

function userById(id) {
  return state.users.find((user) => user.id === id);
}

function postById(id) {
  return state.posts.find((post) => post.id === id);
}

function sorted(items, compare) {
  return [...items].sort(compare);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function avatarHtml(user) {
  if (user.avatarUrl) {
    return `<span class="avatar"><img src="${escapeHtml(user.avatarUrl)}" alt=""></span>`;
  }
  return `<span class="avatar">${escapeHtml(user.displayName.slice(0, 1))}</span>`;
}

function formatCount(number) {
  return new Intl.NumberFormat("ja-JP", { notation: number >= 10000 ? "compact" : "standard" }).format(number);
}

function relativeTime(date) {
  const delta = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.floor(delta / 60000));
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

function countsFor(postId) {
  const replies = state.posts.filter((post) => post.replyToPostId === postId).length;
  const quotes = state.posts.filter((post) => post.quotedPostId === postId).length;
  const useful = state.reactions.filter((reaction) => reaction.postId === postId && reaction.type === "useful").length;
  const noise = state.reactions.filter((reaction) => reaction.postId === postId && reaction.type === "noise").length;
  const bookmarks = state.bookmarks.filter((bookmark) => bookmark.postId === postId).length;
  return { replies, quotes, useful, noise, bookmarks };
}

function scorePost(post) {
  const c = countsFor(post.id);
  const base = c.useful * 3 - c.noise * 2 + c.replies + c.quotes * 2 + c.bookmarks * 2 + post.impressionCount * 0.01;
  const hours = Math.max(1, (Date.now() - new Date(post.createdAt).getTime()) / 3600000);
  return base / Math.sqrt(hours);
}

function visiblePosts() {
  const followedIds = new Set(
    state.follows.filter((follow) => follow.followerId === state.viewerId).map((follow) => follow.followingId),
  );
  let posts = state.posts.filter((post) => !post.replyToPostId);
  if (state.activeFeed.startsWith("following")) {
    posts = posts.filter((post) => followedIds.has(post.userId) || post.userId === state.viewerId);
  }
  if (state.activeFeed.endsWith("Recommended")) {
    return sorted(posts, (a, b) => scorePost(b) - scorePost(a));
  }
  return sorted(posts, (a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function render() {
  renderAuth();
  renderViewer();
  renderComposer(qs("#inlineComposer"), "inlineComposer");
  renderComposer(qs("#modalComposer"), "modalComposer");
  renderFeed();
  renderSearch();
  renderBookmarks();
  renderNotifications();
  renderProfile();
  renderRail();
  updateNav();
}

function updateNav() {
  qsa(".view").forEach((view) => view.classList.remove("active"));
  qs(`#${state.activeRoute}View`)?.classList.add("active");
  qsa("[data-route]").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === state.activeRoute);
  });
  qsa("[data-feed]").forEach((button) => {
    button.classList.toggle("active", button.dataset.feed === state.activeFeed);
  });
  qsa("[data-search-kind]").forEach((button) => {
    button.classList.toggle("active", button.dataset.searchKind === state.searchKind);
  });
}

function renderAuth() {
  const auth = qs("#authPanel");
  if (state.viewerId) {
    auth.innerHTML = "";
    return;
  }
  auth.innerHTML = `
    <form class="auth-form" data-auth-form>
      <label class="field">表示名<input name="displayName" required maxlength="32" placeholder="例: 決算メモ"></label>
      <label class="field">ユーザーID<input name="username" required maxlength="24" pattern="[a-zA-Z0-9_]+" placeholder="kessan_note"></label>
      <button class="primary-button" type="submit">登録 / ログイン</button>
    </form>
  `;
}

function renderViewer() {
  const user = currentUser();
  qs("#viewerCard").innerHTML = `
    <div class="viewer-mini">
      ${avatarHtml(user)}
      <div>
        <div class="display-name">${escapeHtml(user.displayName)}</div>
        <div class="user-id">@${escapeHtml(user.username)}</div>
      </div>
    </div>
  `;
}

function renderComposer(root, composerId) {
  const user = currentUser();
  const context = composerId === "modalComposer" ? modalContext : { quoteId: null, replyToId: null };
  const quote = context.quoteId ? postById(context.quoteId) : null;
  const reply = context.replyToId ? postById(context.replyToId) : null;
  root.innerHTML = `
    <form data-composer="${composerId}">
      <div class="composer-row">
        ${avatarHtml(user)}
        <div class="composer">
          ${quote ? `<div class="meta">引用投稿として作成中</div>` : ""}
          ${reply ? `<div class="meta">返信として作成中</div>` : ""}
          <label class="field">
            投稿本文
            <textarea name="body" maxlength="${MAX_BODY_LENGTH}" placeholder="銘柄、根拠、リスク、需給などを書いてください"></textarea>
          </label>
          <div class="image-preview" data-preview="${composerId}">
            ${pendingImages[composerId].map((src) => `<img src="${src}" alt="添付画像プレビュー">`).join("")}
          </div>
          <div class="composer-actions">
            <label class="file-label">画像を追加
              <input type="file" accept="image/*" multiple data-image-input="${composerId}">
            </label>
            <span class="meta">最大4枚 / ${MAX_BODY_LENGTH.toLocaleString("ja-JP")}文字まで</span>
            <button class="primary-button compact" type="submit">投稿する</button>
          </div>
        </div>
      </div>
    </form>
  `;
}

function renderFeed() {
  const posts = visiblePosts();
  qs("#feed").innerHTML = posts.length
    ? posts.map((post) => postHtml(post)).join("")
    : `<div class="empty-state">表示できる投稿がありません。フォローするか、新しく投稿してください。</div>`;
}

function postHtml(post, options = {}) {
  const user = userById(post.userId);
  if (!user) return "";
  const c = countsFor(post.id);
  const viewerUseful = hasReaction(post.id, "useful");
  const viewerNoise = hasReaction(post.id, "noise");
  const viewerBookmark = state.bookmarks.some((bookmark) => bookmark.userId === state.viewerId && bookmark.postId === post.id);
  const quote = post.quotedPostId ? postById(post.quotedPostId) : null;
  const images = post.imageUrls.length
    ? `<div class="post-images">${post.imageUrls.map((src) => `<img src="${src}" alt="投稿画像">`).join("")}</div>`
    : "";
  const compact = options.compact ? " compact-quote" : "";
  const replies = !options.compact
    ? state.posts
        .filter((replyPost) => replyPost.replyToPostId === post.id)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((replyPost) => `<div class="reply-box">${postHtml(replyPost, { compact: true })}</div>`)
        .join("")
    : "";

  return `
    <article class="post-card${compact}" data-post-id="${post.id}">
      ${avatarHtml(user)}
      <div>
        <div class="post-head">
          <div class="post-author">
            <span class="display-name">${escapeHtml(user.displayName)}</span>
            <span class="user-id">@${escapeHtml(user.username)}</span>
            <span class="post-time">${relativeTime(post.createdAt)}</span>
          </div>
          ${options.compact ? "" : overflowMenu(post)}
        </div>
        <div class="post-body">${linkify(escapeHtml(post.body))}</div>
        ${images}
        ${quote ? postHtml(quote, { compact: true }) : ""}
        ${
          options.compact
            ? ""
            : `<div class="post-actions">
                <button class="action-button" data-action="reply" data-id="${post.id}" type="button">返信 ${c.replies}</button>
                <button class="action-button" data-action="quote" data-id="${post.id}" type="button">引用 ${c.quotes}</button>
                <button class="action-button ${viewerUseful ? "active" : ""}" data-action="useful" data-id="${post.id}" type="button">有益 ${c.useful}</button>
                <button class="action-button ${viewerNoise ? "active" : ""}" data-action="noise" data-id="${post.id}" type="button">ノイズ ${c.noise}</button>
                <button class="action-button ${viewerBookmark ? "active" : ""}" data-action="bookmark" data-id="${post.id}" type="button">保存 ${c.bookmarks}</button>
                <span class="action-button" aria-label="インプレッション">表示 ${formatCount(post.impressionCount)}</span>
              </div>
              ${replies}`
        }
      </div>
    </article>
  `;
}

function overflowMenu(post) {
  return `
    <div class="menu-wrap">
      <button class="icon-button" data-menu-toggle="${post.id}" type="button" aria-label="投稿メニュー">...</button>
      <div class="overflow-menu" data-menu="${post.id}" hidden>
        <button class="menu-item" data-action="profile" data-id="${post.userId}" type="button">プロフィール</button>
        <button class="menu-item danger" data-action="report" data-id="${post.id}" type="button">通報</button>
      </div>
    </div>
  `;
}

function linkify(text) {
  return text.replace(/(#[\w一-龠ぁ-んァ-ヶー]+)/g, '<button class="linklike" data-tag="$1" type="button">$1</button>');
}

function hasReaction(postId, type) {
  return state.reactions.some((reaction) => reaction.userId === state.viewerId && reaction.postId === postId && reaction.type === type);
}

function renderSearch() {
  const query = qs("#searchInput").value.trim().toLowerCase();
  if (!query) {
    qs("#searchResults").innerHTML = `<div class="empty-state">キーワードを入力すると、投稿本文・ユーザー名・ユーザーID・ハッシュタグを検索できます。</div>`;
    return;
  }
  const tagQuery = query.startsWith("#") ? query : `#${query}`;
  const matchedUsers = state.users.filter(
    (user) => user.displayName.toLowerCase().includes(query) || user.username.toLowerCase().includes(query),
  );
  const matchedPosts = state.posts.filter((post) => {
    const author = userById(post.userId);
    const body = post.body.toLowerCase();
    const userHit = author && (author.displayName.toLowerCase().includes(query) || author.username.toLowerCase().includes(query));
    const tagHit = body.includes(tagQuery);
    return body.includes(query) || userHit || tagHit;
  });
  const parts = [];
  if (["all", "users"].includes(state.searchKind)) {
    parts.push(...matchedUsers.map((user) => userResultHtml(user)));
  }
  if (["all", "posts", "tags"].includes(state.searchKind)) {
    parts.push(...matchedPosts.map((post) => postHtml(post)));
  }
  qs("#searchResults").innerHTML = parts.length ? parts.join("") : `<div class="empty-state">該当する結果がありません。</div>`;
}

function userResultHtml(user) {
  const followed = state.follows.some((follow) => follow.followerId === state.viewerId && follow.followingId === user.id);
  return `
    <article class="post-card">
      ${avatarHtml(user)}
      <div>
        <div class="post-head">
          <div>
            <div class="display-name">${escapeHtml(user.displayName)}</div>
            <div class="user-id">@${escapeHtml(user.username)}</div>
          </div>
          ${user.id === state.viewerId ? "" : `<button class="follow-button" data-follow="${user.id}" type="button">${followed ? "フォロー中" : "フォロー"}</button>`}
        </div>
        <p class="post-body">${escapeHtml(user.bio)}</p>
      </div>
    </article>
  `;
}

function renderBookmarks() {
  const ids = state.bookmarks.filter((bookmark) => bookmark.userId === state.viewerId).map((bookmark) => bookmark.postId);
  const posts = sorted(
    state.posts.filter((post) => ids.includes(post.id)),
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  qs("#bookmarkFeed").innerHTML = posts.length
    ? posts.map((post) => postHtml(post)).join("")
    : `<div class="empty-state">保存した投稿はまだありません。</div>`;
}

function renderNotifications() {
  const items = sorted(
    state.notifications.filter((item) => item.userId === state.viewerId),
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  qs("#notifications").innerHTML = items.length
    ? items.map((item) => `<div class="notice">${escapeHtml(item.text)}<div class="meta">${relativeTime(item.createdAt)}</div></div>`).join("")
    : `<div class="empty-state">通知はまだありません。</div>`;
}

function renderProfile(profileUserId = state.profileUserId || state.viewerId) {
  state.profileUserId = profileUserId;
  const user = userById(profileUserId) || currentUser();
  const following = state.follows.filter((follow) => follow.followerId === user.id).length;
  const followers = state.follows.filter((follow) => follow.followingId === user.id).length;
  const posts = state.posts.filter((post) => post.userId === user.id && !post.replyToPostId);
  const usefulTotal = posts.reduce((sum, post) => sum + countsFor(post.id).useful, 0);
  const viewerFollows = state.follows.some((follow) => follow.followerId === state.viewerId && follow.followingId === user.id);
  qs("#profile").innerHTML = `
    <div class="profile-cover"></div>
    <div class="profile-head">
      <div>
        ${avatarHtml(user)}
        <h1>${escapeHtml(user.displayName)}</h1>
        <div class="user-id">@${escapeHtml(user.username)}</div>
      </div>
      ${user.id === state.viewerId ? "" : `<button class="follow-button" data-follow="${user.id}" type="button">${viewerFollows ? "フォロー中" : "フォロー"}</button>`}
    </div>
    <div class="post-card" style="display:block">
      <p>${escapeHtml(user.bio)}</p>
      <div class="profile-meta">
        <span>フォロー ${following}</span>
        <span>フォロワー ${followers}</span>
        <span>投稿 ${posts.length}</span>
        <span>有益された数 ${usefulTotal}</span>
      </div>
    </div>
    <div class="feed" style="margin-top:12px">${posts.length ? posts.map((post) => postHtml(post)).join("") : `<div class="empty-state">投稿はまだありません。</div>`}</div>
  `;
}

function renderRail() {
  const tags = new Map();
  state.posts.forEach((post) => {
    [...post.body.matchAll(/#[\w一-龠ぁ-んァ-ヶー]+/g)].forEach(([tag]) => tags.set(tag, (tags.get(tag) || 0) + 1));
  });
  qs("#tagCloud").innerHTML = [...tags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => `<button class="tag-pill" data-tag="${tag}" type="button">${escapeHtml(tag)} ${count}</button>`)
    .join("");

  qs("#usefulRanking").innerHTML = state.posts
    .map((post) => ({ post, useful: countsFor(post.id).useful }))
    .sort((a, b) => b.useful - a.useful)
    .slice(0, 4)
    .map(({ post, useful }) => {
      const user = userById(post.userId);
      return `<div class="ranking-row"><span>${escapeHtml(user.displayName)}</span><strong>${useful}</strong></div>`;
    })
    .join("");
}

function submitPost(form, composerId) {
  const body = new FormData(form).get("body").trim();
  if (!body && pendingImages[composerId].length === 0) {
    toast("本文または画像を追加してください");
    return;
  }
  const post = {
    id: crypto.randomUUID(),
    userId: state.viewerId,
    body,
    imageUrls: [...pendingImages[composerId]],
    quotedPostId: composerId === "modalComposer" ? modalContext.quoteId : null,
    replyToPostId: composerId === "modalComposer" ? modalContext.replyToId : null,
    impressionCount: Math.floor(60 + Math.random() * 420),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.posts.unshift(post);
  pendingImages[composerId] = [];
  modalContext = { quoteId: null, replyToId: null };
  qs("#composerModal").hidden = true;
  saveState();
  render();
  toast(post.replyToPostId ? "返信しました" : post.quotedPostId ? "引用投稿しました" : "投稿しました");
}

function toggleReaction(postId, type) {
  const otherType = type === "useful" ? "noise" : "useful";
  const existingIndex = state.reactions.findIndex((reaction) => reaction.userId === state.viewerId && reaction.postId === postId && reaction.type === type);
  state.reactions = state.reactions.filter((reaction) => !(reaction.userId === state.viewerId && reaction.postId === postId && reaction.type === otherType));
  if (existingIndex >= 0) {
    state.reactions.splice(existingIndex, 1);
  } else {
    state.reactions.push({ id: crypto.randomUUID(), userId: state.viewerId, postId, type, createdAt: new Date().toISOString() });
  }
  saveState();
  render();
}

function toggleBookmark(postId) {
  const existing = state.bookmarks.findIndex((bookmark) => bookmark.userId === state.viewerId && bookmark.postId === postId);
  if (existing >= 0) {
    state.bookmarks.splice(existing, 1);
  } else {
    state.bookmarks.push({ id: crypto.randomUUID(), userId: state.viewerId, postId, createdAt: new Date().toISOString() });
  }
  saveState();
  render();
}

function toggleFollow(userId) {
  if (userId === state.viewerId) return;
  const existing = state.follows.findIndex((follow) => follow.followerId === state.viewerId && follow.followingId === userId);
  if (existing >= 0) {
    state.follows.splice(existing, 1);
  } else {
    state.follows.push({ followerId: state.viewerId, followingId: userId, createdAt: new Date().toISOString() });
    const user = userById(userId);
    if (user) {
      state.notifications.push({ id: crypto.randomUUID(), userId, text: `${currentUser().displayName}さんがあなたをフォローしました`, createdAt: new Date().toISOString() });
    }
  }
  saveState();
  render();
}

function reportPost(postId) {
  const reason = prompt("通報理由を選ぶか入力してください: 詐欺誘導 / 風説の流布 / なりすまし / 誹謗中傷 / スパム");
  if (!reason) return;
  state.reports.push({ id: crypto.randomUUID(), userId: state.viewerId, postId, reason, createdAt: new Date().toISOString() });
  saveState();
  toast("通報を受け付けました");
}

async function handleImages(input) {
  const composerId = input.dataset.imageInput;
  const files = [...input.files].slice(0, 4 - pendingImages[composerId].length);
  const reads = files.map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      }),
  );
  pendingImages[composerId].push(...(await Promise.all(reads)));
  renderComposer(qs(`#${composerId}`), composerId);
}

function openComposer(context = {}) {
  modalContext = { quoteId: context.quoteId || null, replyToId: context.replyToId || null };
  pendingImages.modalComposer = [];
  qs("#composerModal").hidden = false;
  renderComposer(qs("#modalComposer"), "modalComposer");
}

function routeTo(route) {
  state.activeRoute = route;
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(message) {
  const el = qs("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("show"), 2200);
}

document.addEventListener("click", (event) => {
  const route = event.target.closest("[data-route]")?.dataset.route;
  if (route) routeTo(route);

  if (event.target.closest("[data-open-composer]")) openComposer();
  if (event.target.closest("[data-close-modal]")) qs("#composerModal").hidden = true;

  const feed = event.target.closest("[data-feed]")?.dataset.feed;
  if (feed) {
    state.activeFeed = feed;
    saveState();
    render();
  }

  const searchKind = event.target.closest("[data-search-kind]")?.dataset.searchKind;
  if (searchKind) {
    state.searchKind = searchKind;
    saveState();
    render();
  }

  const tag = event.target.closest("[data-tag]")?.dataset.tag;
  if (tag) {
    routeTo("search");
    qs("#searchInput").value = tag;
    renderSearch();
  }

  const followId = event.target.closest("[data-follow]")?.dataset.follow;
  if (followId) toggleFollow(followId);

  const menuId = event.target.closest("[data-menu-toggle]")?.dataset.menuToggle;
  if (menuId) {
    qsa(".overflow-menu").forEach((menu) => {
      if (menu.dataset.menu !== menuId) menu.hidden = true;
    });
    const menu = qs(`[data-menu="${menuId}"]`);
    menu.hidden = !menu.hidden;
  }

  const action = event.target.closest("[data-action]");
  if (!action) return;
  const id = action.dataset.id;
  if (action.dataset.action === "useful" || action.dataset.action === "noise") toggleReaction(id, action.dataset.action);
  if (action.dataset.action === "bookmark") toggleBookmark(id);
  if (action.dataset.action === "reply") openComposer({ replyToId: id });
  if (action.dataset.action === "quote") openComposer({ quoteId: id });
  if (action.dataset.action === "report") reportPost(id);
  if (action.dataset.action === "profile") {
    state.profileUserId = id;
    routeTo("profile");
  }
});

document.addEventListener("submit", (event) => {
  const composer = event.target.closest("[data-composer]");
  if (composer) {
    event.preventDefault();
    submitPost(event.target, composer.dataset.composer);
    return;
  }
  const auth = event.target.closest("[data-auth-form]");
  if (auth) {
    event.preventDefault();
    const data = new FormData(auth);
    const username = data.get("username").trim().replace(/^@/, "");
    const existing = state.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      state.viewerId = existing.id;
    } else {
      const user = {
        id: crypto.randomUUID(),
        username,
        displayName: data.get("displayName").trim(),
        bio: "株っくすに参加しました。",
        avatarUrl: "",
        createdAt: new Date().toISOString(),
      };
      state.users.push(user);
      state.viewerId = user.id;
    }
    saveState();
    render();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-image-input]")) handleImages(event.target);
});

qs("#searchInput").addEventListener("input", renderSearch);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") qs("#composerModal").hidden = true;
});

render();
