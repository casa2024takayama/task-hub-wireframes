# CLAUDE.md

このリポジトリの AI エージェント共通ルールは **[`AGENTS.md`](./AGENTS.md)** に集約しています。
Claude Code もまず `AGENTS.md` を読んでから作業を開始してください。

作業ログ・申し送り事項: **[`docs/WORKLOG.md`](./docs/WORKLOG.md)**
MVP 仕様の一次情報: **[`mvp-spec.md`](./mvp-spec.md)**

---

## クイックリファレンス（詳細は AGENTS.md）

- スタック: Vite + React 19 + TypeScript + Tailwind v3 + Zustand v5（`persist`）
- 開発: `npm run dev` / ビルド: `npm run build`
- 状態は `src/store/index.ts` の `useAppStore` に集約
- 型は `src/types/index.ts` に集約
- スタイルは Tailwind クラスのみ（別 CSS を作らない）
- コミット前に **`npm run build` を必ず通す**
- セッション終了時に **`docs/WORKLOG.md` の末尾に作業記録を追記**
- ユーザーへの応答は日本語
