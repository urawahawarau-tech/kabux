"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";

const LOCAL_KEY = "kabux:next:v0.1";
const MAX_BODY_LENGTH = 10000;
const supabase = getSupabaseClient();
const guestUser = { id: null, username: "guest", displayName: "ゲスト", bio: "", avatarUrl: "", createdAt: null };
const feedOptions = [
  ["globalRecommended", "おすすめ"],
  ["globalChrono", "時系列"],
  ["followingRecommended", "フォローおすすめ"],
  ["followingChrono", "フォロー時系列"],
];

const seed = {
  viewerId: "u-yui",
  users: [
    { id: "u-yui", username: "yui", displayName: "Yui", bio: "日本株の決算と需給を追っています。", avatarUrl: "", createdAt: ago(6) },
    { id: "u-alpha", username: "alpha_kabu", displayName: "決算メモ", bio: "上方修正、営業利益率、株主還元を中心にメモ。", avatarUrl: "", createdAt: ago(72) },
    { id: "u-flow", username: "supply_demand", displayName: "需給観測", bio: "信用倍率、出来高、空売り残を淡々と。", avatarUrl: "", createdAt: ago(80) },
    { id: "u-chart", username: "chart_note", displayName: "テクニカル手帖", bio: "移動平均と高値更新だけを見る人。", avatarUrl: "", createdAt: ago(90) },
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
      createdAt: ago(3),
      updatedAt: ago(3),
    },
    {
      id: "p-2",
      userId: "u-flow",
      body: "高値ブレイク銘柄を見るときは、出来高増を伴っているかを先に見る。薄商いの上抜けは、翌日以降に売り物が出ると崩れやすい。信用買い残が増えすぎていないかもセット確認。\n\n#需給 #高値ブレイク",
      imageUrls: [],
      quotedPostId: null,
      replyToPostId: null,
      impressionCount: 3910,
      createdAt: ago(8),
      updatedAt: ago(8),
    },
    {
      id: "p-3",
      userId: "u-chart",
      body: "25日線を割らずに横ばい、出来高だけ落ちている形は悪くない。次に高値を抜くなら、初動ではなく2段目として見る。\n\n#テクニカル",
      imageUrls: [chartImage("MA25", "#0f766e", [18, 22, 26, 25, 29, 31, 35])],
      quotedPostId: null,
      replyToPostId: null,
      impressionCount: 2214,
      createdAt: ago(18),
      updatedAt: ago(18),
    },
  ],
  follows: [
    { followerId: "u-yui", followingId: "u-alpha", createdAt: ago(30) },
    { followerId: "u-yui", followingId: "u-flow", createdAt: ago(20) },
  ],
  reactions: [
    { id: "r-1", userId: "u-yui", postId: "p-1", type: "useful", createdAt: ago(2) },
    { id: "r-2", userId: "u-flow", postId: "p-1", type: "useful", createdAt: ago(2) },
    { id: "r-3", userId: "u-alpha", postId: "p-2", type: "useful", createdAt: ago(6) },
    { id: "r-4", userId: "u-chart", postId: "p-2", type: "noise", createdAt: ago(4) },
  ],
  bookmarks: [{ id: "b-1", userId: "u-yui", postId: "p-1", createdAt: ago(2) }],
  reports: [],
  notifications: [{ id: "n-1", userId: "u-yui", text: "決算メモさんがあなたをフォローしました", createdAt: ago(2) }],
};

export default function KabuxApp() {
  const [store, setStore] = useState(seed);
  const [route, setRoute] = useState("home");
  const [feedMode, setFeedMode] = useState("globalRecommended");
  const [searchKind, setSearchKind] = useState("all");
  const [query, setQuery] = useState("");
  const [profileUserId, setProfileUserId] = useState(seed.viewerId);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authMessage, setAuthMessage] = useState("");
  const [authMode, setAuthMode] = useState("signup");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [passwordRecoveryReady, setPasswordRecoveryReady] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const cloudMode = Boolean(supabase && session);
  const viewer = store.users.find((user) => user.id === store.viewerId) || guestUser;

  useEffect(() => {
    if (!supabase) {
      const saved = localStorage.getItem(LOCAL_KEY);
      if (saved) setStore(JSON.parse(saved));
      return;
    }

    let mounted = true;
    const recoveryRequested = new URLSearchParams(window.location.search).get("recovery") === "1";
    if (recoveryRequested) setPasswordRecovery(true);
    if (new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery") setPasswordRecoveryReady(true);
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadCloud(data.session?.user.id || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setPasswordRecoveryReady(true);
      }
      if (event === "SIGNED_OUT") {
        setPasswordRecovery(false);
        setPasswordRecoveryReady(false);
      }
      setSession(nextSession);
      loadCloud(nextSession?.user.id || null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
  }, [store]);

  async function loadCloud(viewerId) {
    setLoading(true);
    const [profiles, posts, follows, reactions, bookmarks, reports] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("posts").select("*").order("created_at", { ascending: false }),
      supabase.from("follows").select("*"),
      supabase.from("reactions").select("*"),
      viewerId ? supabase.from("bookmarks").select("*") : Promise.resolve({ data: [], error: null }),
      viewerId ? supabase.from("reports").select("*") : Promise.resolve({ data: [], error: null }),
    ]);

    const errors = [profiles, posts, follows, reactions, bookmarks, reports].flatMap((result) => (result.error ? [result.error.message] : []));
    if (errors.length) {
      showToast(`Supabase読み込みエラー: ${errors[0]}`);
      setLoading(false);
      return;
    }

    const next = {
      viewerId,
      users: profiles.data.map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        bio: row.bio || "",
        avatarUrl: row.avatar_url || "",
        coverUrl: row.cover_url || "",
        role: row.role || "user",
        isSuspended: row.is_suspended || false,
        createdAt: row.created_at,
      })),
      posts: posts.data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        body: row.body,
        imageUrls: row.image_urls || [],
        quotedPostId: row.quoted_post_id,
        replyToPostId: row.reply_to_post_id,
        impressionCount: row.impression_count || 0,
        isHidden: row.is_hidden || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      follows: follows.data.map((row) => ({ followerId: row.follower_id, followingId: row.following_id, createdAt: row.created_at })),
      reactions: reactions.data.map((row) => ({ id: row.id, userId: row.user_id, postId: row.post_id, type: row.type, createdAt: row.created_at })),
      bookmarks: bookmarks.data.map((row) => ({ id: row.id, userId: row.user_id, postId: row.post_id, createdAt: row.created_at })),
      reports: reports.data.map((row) => ({ id: row.id, userId: row.user_id, postId: row.post_id, reason: row.reason, createdAt: row.created_at })),
      notifications: [],
    };
    setStore(next);
    setProfileUserId(viewerId || null);
    setLoading(false);
  }

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 2400);
  }

  function countsFor(postId) {
    return {
      replies: store.posts.filter((post) => post.replyToPostId === postId).length,
      quotes: store.posts.filter((post) => post.quotedPostId === postId).length,
      useful: store.reactions.filter((reaction) => reaction.postId === postId && reaction.type === "useful").length,
      noise: store.reactions.filter((reaction) => reaction.postId === postId && reaction.type === "noise").length,
      bookmarks: store.bookmarks.filter((bookmark) => bookmark.postId === postId).length,
    };
  }

  function scorePost(post) {
    const c = countsFor(post.id);
    const base = c.useful * 3 - c.noise * 2 + c.replies + c.quotes * 2 + c.bookmarks * 2;
    const hours = Math.max(1, (Date.now() - new Date(post.createdAt).getTime()) / 3600000);
    return base / Math.sqrt(hours);
  }

  const feedPosts = useMemo(() => {
    const followed = new Set(store.follows.filter((follow) => follow.followerId === store.viewerId).map((follow) => follow.followingId));
    let posts = store.posts.filter((post) => !post.replyToPostId && !post.isHidden);
    if (feedMode.startsWith("following")) posts = posts.filter((post) => followed.has(post.userId) || post.userId === store.viewerId);
    return [...posts].sort(feedMode.endsWith("Recommended") ? (a, b) => scorePost(b) - scorePost(a) : (a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [store, feedMode]);

  async function signUp(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get("email").trim();
    const password = data.get("password");
    const displayName = data.get("displayName").trim();
    const username = data.get("username").trim().replace(/^@/, "");

    if (!supabase) {
      const existing = store.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
      const nextUser = existing || { id: crypto.randomUUID(), username, displayName, bio: "株っくすに参加しました。", avatarUrl: "", createdAt: new Date().toISOString() };
      setStore((current) => ({ ...current, viewerId: nextUser.id, users: existing ? current.users : [...current.users, nextUser] }));
      showToast("ローカルユーザーで開始しました");
      return;
    }

    const { data: existingUsername } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (existingUsername) {
      setAuthMessage("そのユーザーIDは使われています。別のIDを選んでください。");
      return;
    }

    localStorage.setItem("kabux:pending-profile", JSON.stringify({ username, displayName }));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username, display_name: displayName },
      },
    });
    setAuthMessage(error ? error.message : "確認メールを送りました。メール内のリンクを開くと登録が完了します。");
  }

  async function signIn(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get("email").trim();
    const password = data.get("password");

    if (!supabase) return;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthMessage(error ? "メールまたはパスワードが違います。" : "");
  }

  async function sendPasswordReset(email) {
    if (!email) {
      setAuthMessage("メールを入力してください。");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?recovery=1` });
    setAuthMessage(error ? error.message : "パスワード再設定メールを送りました。メール内のリンクを開いてください。");
  }

  async function updatePassword(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = data.get("password");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return showToast(error.message);
    setPasswordRecovery(false);
    setPasswordRecoveryReady(false);
    window.history.replaceState({}, "", window.location.pathname);
    showToast("パスワードを更新しました");
  }

  async function ensureCloudProfile() {
    if (!supabase || !session) return;
    const pending = JSON.parse(localStorage.getItem("kabux:pending-profile") || "null");
    const metadata = session.user.user_metadata || {};
    const { data } = await supabase.from("profiles").select("id, username, display_name").eq("id", session.user.id).maybeSingle();
    if (!data) {
      const { error } = await supabase.from("profiles").insert({
        id: session.user.id,
        username: pending?.username || metadata.username || `user_${session.user.id.slice(0, 8)}`,
        display_name: pending?.displayName || metadata.display_name || "株っくすユーザー",
      });
      if (error) {
        showToast(error.message);
        return;
      }
      localStorage.removeItem("kabux:pending-profile");
      await loadCloud(session.user.id);
      return;
    }

    if (pending?.username && data.username !== pending.username) {
      const { data: existingUsername } = await supabase.from("profiles").select("id").eq("username", pending.username).neq("id", session.user.id).maybeSingle();
      if (!existingUsername) {
        const { error } = await supabase
          .from("profiles")
          .update({ username: pending.username, display_name: pending.displayName || data.display_name })
          .eq("id", session.user.id);
        if (error) {
          showToast(error.message);
          return;
        }
      }
    }
    localStorage.removeItem("kabux:pending-profile");
  }

  useEffect(() => {
    ensureCloudProfile();
  }, [session]);

  async function createPost({ body, files, quoteId = null, replyToId = null }) {
    if (!store.viewerId) return showToast("投稿するにはログインしてください");
    if (viewer.isSuspended) return showToast("このアカウントは停止中です");
    if (!body.trim() && files.length === 0) return showToast("本文または画像を追加してください");

    const imageUrls = await uploadImages(files);
    const post = {
      id: crypto.randomUUID(),
      userId: store.viewerId,
      body: body.trim(),
      imageUrls,
      quotedPostId: quoteId,
      replyToPostId: replyToId,
      impressionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (cloudMode) {
      const { error } = await supabase.from("posts").insert({
        id: post.id,
        user_id: post.userId,
        body: post.body,
        image_urls: post.imageUrls,
        quoted_post_id: post.quotedPostId,
        reply_to_post_id: post.replyToPostId,
        impression_count: post.impressionCount,
      });
      if (error) return showToast(error.message);
      await loadCloud(store.viewerId);
    } else {
      setStore((current) => ({ ...current, posts: [post, ...current.posts] }));
    }
    setModal(null);
    showToast(replyToId ? "返信しました" : quoteId ? "引用投稿しました" : "投稿しました");
  }

  async function uploadImages(files) {
    const limited = await Promise.all(files.slice(0, 4).map((file) => compressImage(file)));
    if (!cloudMode) return Promise.all(limited.map(readFile));

    const urls = [];
    for (const file of limited) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${store.viewerId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, file, { upsert: false });
      if (error) {
        showToast(`画像アップロード失敗: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function toggleReaction(postId, type) {
    if (!store.viewerId) return showToast("反応するにはログインしてください");
    if (viewer.isSuspended) return showToast("このアカウントは停止中です");
    const existing = store.reactions.find((reaction) => reaction.userId === store.viewerId && reaction.postId === postId && reaction.type === type);
    const other = type === "useful" ? "noise" : "useful";

    if (cloudMode) {
      await supabase.from("reactions").delete().eq("user_id", store.viewerId).eq("post_id", postId).eq("type", other);
      if (existing) await supabase.from("reactions").delete().eq("id", existing.id);
      else await supabase.from("reactions").insert({ user_id: store.viewerId, post_id: postId, type });
      await loadCloud(store.viewerId);
      return;
    }

    setStore((current) => {
      let reactions = current.reactions.filter((reaction) => !(reaction.userId === current.viewerId && reaction.postId === postId && reaction.type === other));
      reactions = existing ? reactions.filter((reaction) => reaction.id !== existing.id) : [...reactions, { id: crypto.randomUUID(), userId: current.viewerId, postId, type, createdAt: new Date().toISOString() }];
      return { ...current, reactions };
    });
  }

  async function toggleBookmark(postId) {
    if (!store.viewerId) return showToast("保存するにはログインしてください");
    const existing = store.bookmarks.find((bookmark) => bookmark.userId === store.viewerId && bookmark.postId === postId);
    if (cloudMode) {
      if (existing) await supabase.from("bookmarks").delete().eq("id", existing.id);
      else await supabase.from("bookmarks").insert({ user_id: store.viewerId, post_id: postId });
      await loadCloud(store.viewerId);
      return;
    }
    setStore((current) => ({
      ...current,
      bookmarks: existing
        ? current.bookmarks.filter((bookmark) => bookmark.id !== existing.id)
        : [...current.bookmarks, { id: crypto.randomUUID(), userId: current.viewerId, postId, createdAt: new Date().toISOString() }],
    }));
  }

  async function toggleFollow(userId) {
    if (!store.viewerId) return showToast("フォローするにはログインしてください");
    if (viewer.isSuspended) return showToast("このアカウントは停止中です");
    if (userId === store.viewerId) return;
    const existing = store.follows.find((follow) => follow.followerId === store.viewerId && follow.followingId === userId);
    if (cloudMode) {
      if (existing) await supabase.from("follows").delete().eq("follower_id", store.viewerId).eq("following_id", userId);
      else await supabase.from("follows").insert({ follower_id: store.viewerId, following_id: userId });
      await loadCloud(store.viewerId);
      return;
    }
    setStore((current) => ({
      ...current,
      follows: existing
        ? current.follows.filter((follow) => !(follow.followerId === current.viewerId && follow.followingId === userId))
        : [...current.follows, { followerId: current.viewerId, followingId: userId, createdAt: new Date().toISOString() }],
    }));
  }

  async function reportPost(postId) {
    if (!store.viewerId) return showToast("通報するにはログインしてください");
    const reason = window.prompt("通報理由: 詐欺誘導 / 風説の流布 / なりすまし / 誹謗中傷 / スパム");
    if (!reason) return;
    if (cloudMode) await supabase.from("reports").insert({ post_id: postId, user_id: store.viewerId, reason });
    else setStore((current) => ({ ...current, reports: [...current.reports, { id: crypto.randomUUID(), userId: current.viewerId, postId, reason, createdAt: new Date().toISOString() }] }));
    showToast("通報を受け付けました");
  }

  async function deletePost(post) {
    if (post.userId !== store.viewerId) return;
    if (!window.confirm("この投稿を削除しますか？")) return;
    if (cloudMode) {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) return showToast(error.message);
      await loadCloud(store.viewerId);
    } else {
      setStore((current) => ({ ...current, posts: current.posts.filter((item) => item.id !== post.id) }));
    }
    showToast("投稿を削除しました");
  }

  async function togglePostVisibility(post) {
    if (viewer.role !== "admin") return;
    if (cloudMode) {
      const { error } = await supabase.from("posts").update({ is_hidden: !post.isHidden }).eq("id", post.id);
      if (error) return showToast(error.message);
      await loadCloud(store.viewerId);
    } else {
      setStore((current) => ({
        ...current,
        posts: current.posts.map((item) => (item.id === post.id ? { ...item, isHidden: !item.isHidden } : item)),
      }));
    }
    showToast(post.isHidden ? "投稿を再表示しました" : "投稿を非表示にしました");
  }

  async function toggleUserSuspension(user) {
    if (viewer.role !== "admin" || user.id === viewer.id) return;
    if (cloudMode) {
      const { error } = await supabase.rpc("set_profile_suspension", { target_user_id: user.id, suspended: !user.isSuspended });
      if (error) return showToast(error.message);
      await loadCloud(store.viewerId);
    } else {
      setStore((current) => ({
        ...current,
        users: current.users.map((item) => (item.id === user.id ? { ...item, isSuspended: !item.isSuspended } : item)),
      }));
    }
    showToast(user.isSuspended ? "ユーザー停止を解除しました" : "ユーザーを停止しました");
  }

  async function updateProfile({ username, displayName, bio, avatarFile, coverFile }) {
    if (!store.viewerId) return;
    const avatarUrl = avatarFile ? await uploadProfileImage(avatarFile, "avatar") : viewer.avatarUrl;
    const coverUrl = coverFile ? await uploadProfileImage(coverFile, "cover") : viewer.coverUrl;
    if (cloudMode) {
      const { data: existingUsername } = await supabase.from("profiles").select("id").eq("username", username).neq("id", store.viewerId).maybeSingle();
      if (existingUsername) return showToast("そのユーザーIDは使われています");
      const { error } = await supabase.from("profiles").update({ username, display_name: displayName, bio, avatar_url: avatarUrl, cover_url: coverUrl }).eq("id", store.viewerId);
      if (error) return showToast(error.message);
      await loadCloud(store.viewerId);
    } else {
      setStore((current) => ({
        ...current,
        users: current.users.map((user) => (user.id === current.viewerId ? { ...user, username, displayName, bio, avatarUrl, coverUrl } : user)),
      }));
    }
    setEditingProfile(false);
    showToast("プロフィールを更新しました");
  }

  async function uploadProfileImage(file, kind) {
    const compressed = await compressImage(file);
    if (!cloudMode) return readFile(compressed);

    const path = `${store.viewerId}/${kind}-${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("post-images").upload(path, compressed, { upsert: false });
    if (error) {
      showToast(`画像アップロード失敗: ${error.message}`);
      return viewer.avatarUrl;
    }
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return data.publicUrl;
  }

  const profileUser = store.users.find((user) => user.id === profileUserId) || viewer;

  if (loading) {
    return <div className="loading-screen">株っくすを読み込み中...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="メインナビゲーション">
        <button className="brand as-button" type="button" onClick={() => setRoute("home")}>
          <span className="brand-mark">株</span>
          <span className="brand-name">株っくす</span>
        </button>
        <nav className="nav-stack">
          {[
            ["home", "⌂", "ホーム"],
            ["search", "⌕", "検索"],
            ["bookmarks", "▣", "保存"],
            ["notifications", "◌", "通知"],
            ["profile", "◉", "プロフィール"],
            ...(viewer.role === "admin" ? [["admin", "⚙", "管理"]] : []),
          ].map(([key, icon, label]) => (
            <button className={`nav-item ${route === key ? "active" : ""}`} key={key} type="button" onClick={() => setRoute(key)}>
              <span className="nav-icon" aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="primary-button nav-compose" type="button" onClick={() => setModal({})}>投稿する</button>
        <div className="viewer-card">
          <ViewerCard user={viewer} mode={supabase ? (session ? "クラウド" : "閲覧のみ") : "ローカル"} />
          {supabase && session ? <button className="ghost-button full" type="button" onClick={() => supabase.auth.signOut({ scope: "local" })}>ログアウト</button> : null}
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-brand as-button" type="button" onClick={() => setRoute("home")}>
            <span className="brand-mark">株</span>
            <span>株っくす</span>
          </button>
          <button className="ghost-button mobile-compose" type="button" onClick={() => setModal({})}>投稿</button>
        </header>

        {supabase && passwordRecovery && passwordRecoveryReady && session ? <PasswordRecoveryPanel onSubmit={updatePassword} /> : null}
        {supabase && passwordRecovery && (!passwordRecoveryReady || !session) ? <RecoveryLinkPanel /> : null}

        {supabase && !session && !passwordRecovery ? (
          <AuthPanel
            mode={authMode}
            onModeChange={setAuthMode}
            onSignIn={signIn}
            onSignUp={signUp}
            onPasswordReset={sendPasswordReset}
            message={authMessage}
            supabaseEnabled={Boolean(supabase)}
          />
        ) : null}

        <section className={`view ${route === "home" ? "active" : ""}`}>
          <SectionHead eyebrow="日本株SNS" title="ホーム" onCompose={() => setModal({})} />
          <div className="tab-bar" role="tablist" aria-label="タイムライン">
            {feedOptions.map(([key, label]) => (
              <button className={`tab ${feedMode === key ? "active" : ""}`} key={key} type="button" onClick={() => setFeedMode(key)}>{label}</button>
            ))}
          </div>
          <label className="mobile-feed-select">
            タイムライン
            <select value={feedMode} onChange={(event) => setFeedMode(event.target.value)}>
              {feedOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <Composer viewer={viewer} onSubmit={createPost} />
          <div className="feed">{feedPosts.length ? feedPosts.map((post) => renderPost(post)) : <Empty>表示できる投稿がありません。</Empty>}</div>
        </section>

        <section className={`view ${route === "search" ? "active" : ""}`}>
          <SectionHead eyebrow="投稿・ユーザー・タグ" title="検索" />
          <label className="search-box">
            <span>検索</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="#7203、トヨタ、ユーザーID" />
          </label>
          <div className="search-grid">
            {[
              ["all", "すべて"],
              ["posts", "投稿"],
              ["users", "ユーザー"],
              ["tags", "ハッシュタグ"],
            ].map(([key, label]) => (
              <button className={`filter-chip ${searchKind === key ? "active" : ""}`} key={key} type="button" onClick={() => setSearchKind(key)}>{label}</button>
            ))}
          </div>
          <SearchResults store={store} query={query} kind={searchKind} renderPost={renderPost} onFollow={toggleFollow} />
        </section>

        <section className={`view ${route === "bookmarks" ? "active" : ""}`}>
          <SectionHead eyebrow="あとで読む" title="ブックマーク" />
          <div className="feed">
            {store.posts.filter((post) => store.bookmarks.some((bookmark) => bookmark.userId === store.viewerId && bookmark.postId === post.id)).map((post) => renderPost(post))}
          </div>
        </section>

        <section className={`view ${route === "notifications" ? "active" : ""}`}>
          <SectionHead eyebrow="簡易通知" title="通知" />
          <div className="notice-list">
            {store.notifications.length ? store.notifications.map((item) => <div className="notice" key={item.id}>{item.text}<div className="meta">{relativeTime(item.createdAt)}</div></div>) : <Empty>通知はまだありません。</Empty>}
          </div>
        </section>

        <section className={`view ${route === "profile" ? "active" : ""}`}>
          <Profile
            user={profileUser}
            store={store}
            renderPost={renderPost}
            onFollow={toggleFollow}
            editing={editingProfile}
            onEdit={() => setEditingProfile(true)}
            onCancel={() => setEditingProfile(false)}
            onSave={updateProfile}
            onSignOut={() => supabase?.auth.signOut({ scope: "local" })}
          />
        </section>

        {viewer.role === "admin" ? (
          <section className={`view ${route === "admin" ? "active" : ""}`}>
            <AdminPanel store={store} renderPost={renderPost} onTogglePostVisibility={togglePostVisibility} onToggleUserSuspension={toggleUserSuspension} />
          </section>
        ) : null}
      </main>

      <RightRail store={store} countsFor={countsFor} />

      <button className="mobile-fab" type="button" aria-label="投稿を作成" onClick={() => setModal({})}>＋</button>

      {modal ? (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <header className="modal-head">
              <h2 id="modalTitle">{modal.quoteId ? "引用投稿" : modal.replyToId ? "返信" : "投稿を作成"}</h2>
              <button className="icon-button" type="button" aria-label="閉じる" onClick={() => setModal(null)}>×</button>
            </header>
            <Composer viewer={viewer} context={modal} onSubmit={createPost} />
          </section>
        </div>
      ) : null}

      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );

  function renderPost(post, compact = false) {
    const user = store.users.find((item) => item.id === post.userId);
    if (!user) return null;
    const c = countsFor(post.id);
    const quote = post.quotedPostId ? store.posts.find((item) => item.id === post.quotedPostId) : null;
    const replies = store.posts.filter((item) => item.replyToPostId === post.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const useful = store.reactions.some((reaction) => reaction.userId === store.viewerId && reaction.postId === post.id && reaction.type === "useful");
    const noise = store.reactions.some((reaction) => reaction.userId === store.viewerId && reaction.postId === post.id && reaction.type === "noise");
    const saved = store.bookmarks.some((bookmark) => bookmark.userId === store.viewerId && bookmark.postId === post.id);

    return (
      <article className={`post-card ${compact ? "compact-quote" : ""}`} key={post.id}>
        <Avatar user={user} />
        <div>
          <div className="post-head">
            <div className="post-author">
              <span className="display-name">{user.displayName}</span>{" "}
              <span className="user-id">@{user.username}</span>{" "}
              <span className="post-time">{relativeTime(post.createdAt)}</span>
            </div>
            {!compact ? (
              <div className="menu-inline">
                {post.userId === store.viewerId ? <button className="mini-link" type="button" onClick={() => deletePost(post)}>削除</button> : null}
                <button className="icon-button" type="button" aria-label="通報" onClick={() => reportPost(post.id)}>...</button>
              </div>
            ) : null}
          </div>
          <p className="post-body">{post.body}</p>
          {post.imageUrls?.length ? <div className="post-images">{post.imageUrls.map((src) => <img src={src} alt="投稿画像" key={src} />)}</div> : null}
          {quote ? renderPost(quote, true) : null}
          {!compact ? (
            <>
              <div className="post-actions">
                <button className="action-button" type="button" onClick={() => setModal({ replyToId: post.id })}>返信 {c.replies}</button>
                <button className="action-button" type="button" onClick={() => setModal({ quoteId: post.id })}>引用 {c.quotes}</button>
                <button className={`action-button ${useful ? "active" : ""}`} data-action="useful" type="button" onClick={() => toggleReaction(post.id, "useful")}>有益 {c.useful}</button>
                <button className={`action-button ${noise ? "active" : ""}`} data-action="noise" type="button" onClick={() => toggleReaction(post.id, "noise")}>ノイズ {c.noise}</button>
                <button className={`action-button ${saved ? "active" : ""}`} data-action="bookmark" type="button" onClick={() => toggleBookmark(post.id)}>保存 {c.bookmarks}</button>
              </div>
              {replies.map((reply) => <div className="reply-box" key={reply.id}>{renderPost(reply, true)}</div>)}
            </>
          ) : null}
        </div>
      </article>
    );
  }
}

function AuthPanel({ mode, onModeChange, onSignIn, onSignUp, onPasswordReset, message, supabaseEnabled }) {
  const [resetEmail, setResetEmail] = useState("");
  return (
    <section className="auth-panel" aria-label="ユーザー登録とログイン">
      {supabaseEnabled ? (
        <div className="auth-tabs" role="tablist" aria-label="認証モード">
          <button className={`tab ${mode === "signup" ? "active" : ""}`} type="button" onClick={() => onModeChange("signup")}>新規登録</button>
          <button className={`tab ${mode === "signin" ? "active" : ""}`} type="button" onClick={() => onModeChange("signin")}>ログイン</button>
        </div>
      ) : null}
      <form className={`auth-form ${mode}`} onSubmit={mode === "signup" ? onSignUp : onSignIn}>
        {supabaseEnabled ? <label className="field">メール<input name="email" type="email" required placeholder="you@example.com" onChange={(event) => setResetEmail(event.target.value)} /></label> : null}
        {supabaseEnabled ? <label className="field">パスワード<input name="password" type="password" required minLength="8" placeholder="8文字以上" /></label> : null}
        {mode === "signup" ? <label className="field">表示名<input name="displayName" required maxLength="32" placeholder="例: 決算メモ" /></label> : null}
        {mode === "signup" ? <label className="field">ユーザーID<input name="username" required maxLength="24" pattern="[a-zA-Z0-9_]+" placeholder="kessan_note" /></label> : null}
        <button className="primary-button" type="submit">{supabaseEnabled ? (mode === "signup" ? "登録する" : "ログイン") : "ローカルで試す"}</button>
      </form>
      {supabaseEnabled && mode === "signin" ? (
        <button className="mini-link auth-reset" type="button" onClick={() => onPasswordReset(resetEmail)}>
          パスワード再設定
        </button>
      ) : null}
      {message ? <p className="meta">{message}</p> : null}
      {!supabaseEnabled ? <p className="meta">Supabase環境変数を設定すると、共有DB/Auth/画像保存で動きます。</p> : null}
    </section>
  );
}

function RecoveryLinkPanel() {
  return (
    <section className="auth-panel" aria-label="パスワード再設定">
      <p>パスワード再設定メール内のリンクから開いてください。</p>
    </section>
  );
}

function PasswordRecoveryPanel({ onSubmit }) {
  return (
    <section className="auth-panel" aria-label="パスワード再設定">
      <form className="auth-form signin" onSubmit={onSubmit}>
        <label className="field">
          新しいパスワード
          <input name="password" type="password" minLength="8" required placeholder="8文字以上" />
        </label>
        <button className="primary-button" type="submit">更新する</button>
      </form>
    </section>
  );
}

function Composer({ viewer, context = {}, onSubmit }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  return (
    <form
      className="inline-composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ body, files, quoteId: context.quoteId || null, replyToId: context.replyToId || null });
        setBody("");
        setFiles([]);
      }}
    >
      <div className="composer-row">
        <Avatar user={viewer} />
        <div className="composer">
          {context.quoteId ? <div className="meta">引用投稿として作成中</div> : null}
          {context.replyToId ? <div className="meta">返信として作成中</div> : null}
          <label className="field">
            投稿本文
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={MAX_BODY_LENGTH} placeholder="銘柄、根拠、リスク、需給などを書いてください" />
          </label>
          {previews.length ? <div className="image-preview">{previews.map((src) => <img src={src} alt="添付画像プレビュー" key={src} />)}</div> : null}
          <div className="composer-actions">
            <label className="file-label">画像を追加<input type="file" accept="image/*" multiple onChange={(event) => setFiles([...event.target.files].slice(0, 4))} /></label>
            <span className="meta">最大4枚 / 10,000文字まで</span>
            <button className="primary-button compact" type="submit">投稿する</button>
          </div>
        </div>
      </div>
    </form>
  );
}

function SearchResults({ store, query, kind, renderPost, onFollow }) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return <div className="feed"><Empty>キーワードを入力すると検索できます。</Empty></div>;
  const tagQuery = normalized.startsWith("#") ? normalized : `#${normalized}`;
  const users = store.users.filter((user) => user.displayName.toLowerCase().includes(normalized) || user.username.toLowerCase().includes(normalized));
  const posts = store.posts.filter((post) => {
    const user = store.users.find((item) => item.id === post.userId);
    return post.body.toLowerCase().includes(normalized) || post.body.toLowerCase().includes(tagQuery) || user?.displayName.toLowerCase().includes(normalized) || user?.username.toLowerCase().includes(normalized);
  });
  return (
    <div className="feed">
      {["all", "users"].includes(kind) ? users.map((user) => <UserRow key={user.id} user={user} viewerId={store.viewerId} follows={store.follows} onFollow={onFollow} />) : null}
      {["all", "posts", "tags"].includes(kind) ? posts.map((post) => renderPost(post)) : null}
    </div>
  );
}

function Profile({ user, store, renderPost, onFollow, editing, onEdit, onCancel, onSave, onSignOut }) {
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const avatarPreview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : ""), [avatarFile]);
  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : ""), [coverFile]);
  const posts = store.posts.filter((post) => post.userId === user.id && !post.replyToPostId);
  const following = store.follows.filter((follow) => follow.followerId === user.id).length;
  const followers = store.follows.filter((follow) => follow.followingId === user.id).length;
  const isFollowing = store.follows.some((follow) => follow.followerId === store.viewerId && follow.followingId === user.id);
  return (
    <>
      <div className="profile-cover" style={coverPreview || user.coverUrl ? { backgroundImage: `url(${coverPreview || user.coverUrl})` } : undefined}></div>
      <div className="profile-head">
        <div>
          <Avatar user={avatarPreview ? { ...user, avatarUrl: avatarPreview } : user} />
          <h1>{user.displayName}</h1>
          <div className="user-id">@{user.username}</div>
        </div>
        {user.id !== store.viewerId ? <button className="follow-button" type="button" onClick={() => onFollow(user.id)}>{isFollowing ? "フォロー中" : "フォロー"}</button> : <button className="follow-button" type="button" onClick={onEdit}>編集</button>}
      </div>
      <div className="post-card profile-summary">
        {editing && user.id === store.viewerId ? (
          <form
            className="profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              onSave({
                username: data.get("username").trim().replace(/^@/, ""),
                displayName: data.get("displayName").trim(),
                bio: data.get("bio").trim(),
                avatarFile,
                coverFile,
              });
            }}
          >
            <label className="field">
              カバー画像
              <input type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} />
            </label>
            <label className="field">
              プロフィール画像
              <input type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} />
            </label>
            <label className="field">ユーザーID<input name="username" defaultValue={user.username} maxLength="24" pattern="[a-zA-Z0-9_]+" required /></label>
            <label className="field">表示名<input name="displayName" defaultValue={user.displayName} maxLength="32" required /></label>
            <label className="field">自己紹介<textarea name="bio" defaultValue={user.bio} maxLength="160" /></label>
            <div className="inline-actions">
              <button className="primary-button compact" type="submit">保存</button>
              <button className="ghost-button" type="button" onClick={onCancel}>キャンセル</button>
            </div>
          </form>
        ) : (
          <p>{user.bio}</p>
        )}
        <div className="profile-meta">
          <span>フォロー {following}</span>
          <span>フォロワー {followers}</span>
          <span>投稿 {posts.length}</span>
        </div>
        {user.id === store.viewerId ? (
          <div className="profile-actions">
            <button className="ghost-button" type="button" onClick={onSignOut}>ログアウト</button>
          </div>
        ) : null}
      </div>
      <div className="feed profile-feed">{posts.map((post) => renderPost(post))}</div>
    </>
  );
}

function AdminPanel({ store, renderPost, onTogglePostVisibility, onToggleUserSuspension }) {
  const reportedPosts = store.reports
    .map((report) => ({ report, post: store.posts.find((post) => post.id === report.postId), reporter: store.users.find((user) => user.id === report.userId) }))
    .filter((item) => item.post);
  return (
    <>
      <SectionHead eyebrow="管理者専用" title="管理" />
      <div className="admin-stats">
        <div><strong>{store.users.length}</strong><span>ユーザー</span></div>
        <div><strong>{store.posts.length}</strong><span>投稿</span></div>
        <div><strong>{store.reports.length}</strong><span>通報</span></div>
        <div><strong>{store.users.filter((user) => user.isSuspended).length}</strong><span>停止中</span></div>
      </div>

      <section className="admin-block">
        <h2>通報</h2>
        {reportedPosts.length ? reportedPosts.map(({ report, post, reporter }) => (
          <div className="admin-item" key={report.id}>
            <div className="meta">通報者 @{reporter?.username || "unknown"} / {report.reason}</div>
            {renderPost(post, true)}
            <button className="ghost-button" type="button" onClick={() => onTogglePostVisibility(post)}>{post.isHidden ? "再表示" : "非表示"}</button>
          </div>
        )) : <Empty>通報はありません。</Empty>}
      </section>

      <section className="admin-block">
        <h2>ユーザー</h2>
        <div className="admin-users">
          {store.users.map((user) => (
            <div className="admin-user-row" key={user.id}>
              <div>
                <strong>{user.displayName}</strong>
                <div className="meta">@{user.username} {user.role === "admin" ? "/ admin" : ""}</div>
              </div>
              {user.role !== "admin" ? (
                <button className="ghost-button" type="button" onClick={() => onToggleUserSuspension(user)}>{user.isSuspended ? "停止解除" : "停止"}</button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function RightRail({ store, countsFor }) {
  const tags = new Map();
  store.posts.forEach((post) => {
    [...post.body.matchAll(/#[\w一-龠ぁ-んァ-ヶー]+/g)].forEach(([tag]) => tags.set(tag, (tags.get(tag) || 0) + 1));
  });
  const ranking = store.posts.map((post) => ({ post, useful: countsFor(post.id).useful })).sort((a, b) => b.useful - a.useful).slice(0, 4);
  return (
    <aside className="right-rail" aria-label="市場トピック">
      <div className="rail-block">
        <h2>注目タグ</h2>
        <div className="tag-cloud">{[...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => <span className="tag-pill" key={tag}>{tag} {count}</span>)}</div>
      </div>
      <div className="rail-block">
        <h2>有益ランキング</h2>
        {ranking.map(({ post, useful }) => <div className="ranking-row" key={post.id}><span>{store.users.find((user) => user.id === post.userId)?.displayName}</span><strong>{useful}</strong></div>)}
      </div>
      <div className="rail-block market-card">
        <h2>市場メモ</h2>
        <div className="mini-chart" aria-hidden="true">{[34, 48, 42, 66, 58, 79, 72].map((height) => <span style={{ height: `${height}%` }} key={height}></span>)}</div>
        <p>リポストより引用、いいねより有益。短期の煽りより、根拠ある分析を上に出す設計です。</p>
      </div>
    </aside>
  );
}

function SectionHead({ eyebrow, title, onCompose }) {
  return (
    <div className="section-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {onCompose ? <button className="primary-button compact" type="button" onClick={onCompose}>投稿</button> : null}
    </div>
  );
}

function UserRow({ user, viewerId, follows, onFollow }) {
  const followed = follows.some((follow) => follow.followerId === viewerId && follow.followingId === user.id);
  return (
    <article className="post-card">
      <Avatar user={user} />
      <div>
        <div className="post-head">
          <div><div className="display-name">{user.displayName}</div><div className="user-id">@{user.username}</div></div>
          {user.id !== viewerId ? <button className="follow-button" type="button" onClick={() => onFollow(user.id)}>{followed ? "フォロー中" : "フォロー"}</button> : null}
        </div>
        <p>{user.bio}</p>
      </div>
    </article>
  );
}

function ViewerCard({ user, mode }) {
  return (
    <>
      <div className="viewer-mini">
        <Avatar user={user} />
        <div>
          <div className="display-name">{user.displayName}</div>
          <div className="user-id">@{user.username}</div>
        </div>
      </div>
      <div className="mode-pill">{mode}</div>
    </>
  );
}

function Avatar({ user }) {
  return <span className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.displayName.slice(0, 1)}</span>;
}

function Empty({ children }) {
  return <div className="empty-state">{children}</div>;
}

function readFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  if (!file.type.startsWith("image/") || file.size <= 700000) return file;
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  bitmap.close();
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg", lastModified: Date.now() });
}

function ago(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function relativeTime(date) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

function chartImage(label, color, values) {
  const bars = values
    .map((value, index) => `<rect x="${28 + index * 37}" y="${136 - value * 3}" width="22" height="${value * 3}" rx="3" fill="${color}"/>`)
    .join("");
  const line = values.map((value, index) => `${39 + index * 37},${128 - value * 3}`).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#f8fafc"/><path d="M28 138H292M28 98H292M28 58H292" stroke="#d9e0ea"/><text x="24" y="28" font-family="Arial" font-size="18" font-weight="700" fill="#111827">${label}</text>${bars}<polyline points="${line}" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
