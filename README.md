# Rhythm Stage
GitHub Pages で動く 7レーン音ゲー。Settings → Pages → main / root を公開するだけ。
ローカル確認: `python -m http.server` → http://localhost:8000

- 操作: S D F Space J K L / タッチ（フリックは上へスワイプ）/ Esc で中断
- 判定幅・速度・音ズレは ⚙設定 で変更（ブラウザに保存）
- 楽曲追加: mp3/mp4 をアップロード → 譜面自動生成（キャンセルで自作）。**端末内(IndexedDB)に保存**されます
- 全員の公式にする方法: クリエイトの「書出」でJSON → `songs/<id>.json` の `charts` に追記、mp3 を `songs/` に置き `songs/index.json` に追加
- 公式曲の再生成: `node tools/make_charts.js`
