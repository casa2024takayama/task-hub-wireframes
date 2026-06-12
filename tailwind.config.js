/** @type {import('tailwindcss').Config} */
// アプリ全体をペーパー調テーマに統一（2026-06 リデザイン）。
// 既存コードの slate / indigo / white クラスを書き換えずに済むよう、
// パレット自体を紙とインクの色に再定義している。
// - slate → 温かみのあるインク系グレー（紙に合う）
// - indigo → コダック調アンバーレッド（旧カンバンの accent #BD4B2A）
// - white → カード紙色 #FBF8F1
// amber / rose / emerald / purple は意味色（警告・危険・成功・ルーチン）としてそのまま。
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        white: '#FBF8F1',
        slate: {
          50: '#F7F2E7',
          100: '#F2ECDF',
          200: '#D8CDB8',
          300: '#C7BBA3',
          400: '#A99C86',
          500: '#8A7D68',
          600: '#6B6256',
          700: '#4A4339',
          800: '#2B2620',
          900: '#1F1B16',
        },
        indigo: {
          50: '#FBEEE8',
          100: '#F6DCD0',
          200: '#E9C9B5',
          300: '#DCA68C',
          400: '#CE7A55',
          500: '#BD4B2A',
          600: '#BD4B2A',
          700: '#A84324',
          800: '#8C381E',
          900: '#702D18',
        },
      },
      fontFamily: {
        sans: [
          'Zen Kaku Gothic New',
          '-apple-system',
          'BlinkMacSystemFont',
          'Hiragino Kaku Gothic ProN',
          'Yu Gothic',
          'sans-serif',
        ],
        serif: ['Zen Old Mincho', 'serif'],
      },
    },
  },
  plugins: [],
}
