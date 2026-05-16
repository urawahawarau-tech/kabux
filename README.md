# 株っくす

日本株投資家向けのXライクなWeb SNSプロトタイプです。

無料で小さく始める前提で、Next.js + Supabase + Vercelに載せられる構成にしています。

## できること

- メールリンク認証による登録 / ログイン
- 投稿作成
- 画像投稿
- 全体 / フォロー中タイムライン
- おすすめ / 時系列並び替え
- 返信
- 引用投稿
- 有益 / ノイズ
- ブックマーク
- 検索
- フォロー
- 通報

Supabase環境変数が未設定の場合は、ローカルデモとしてブラウザ内保存で動きます。

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## Supabase無料枠で始める手順

1. Supabaseで無料プロジェクトを作る
2. SQL Editorで `supabase/schema.sql` を実行する
3. Project Settings > API から以下を取得する
   - Project URL
   - anon public key
4. `.env.example` を `.env.local` にコピーする
5. `.env.local` に値を入れる

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

6. `npm run dev` でログインリンク認証と投稿保存を確認する

## Vercel無料枠で公開する手順

1. GitHubにこの `kabux` ディレクトリをpushする
2. VercelでNew Projectからimportする
3. Framework PresetはNext.js
4. Environment Variablesに以下を入れる
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
5. Deployする
6. 発行されたVercel URLをSupabase AuthのRedirect URLに追加する

Supabase側の設定場所:

- Authentication > URL Configuration > Site URL
- Authentication > URL Configuration > Redirect URLs

設定例:

- Site URL: `https://your-project.vercel.app`
- Redirect URLs:
  - `http://localhost:3000/**`
  - `https://your-project.vercel.app/**`
  - 必要ならVercel Preview用URL

## 無料運用で最初に入れておく制限

- 画像は1枚1MBまで
- ブラウザ側で長辺1600pxまで圧縮
- 投稿は10,000文字まで
- 動画なし
- 招待した知り合いだけでβ運用
- 通報テーブルは作成済み
- 投稿非表示用の `posts.is_hidden` はDBに用意済み

## 次に作るとよいもの

- 管理者だけが `is_hidden` を変更できる簡易管理画面
- 招待コード制
- 本文検索のPostgreSQL全文検索化
