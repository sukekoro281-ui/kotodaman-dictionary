# コトダマン辞書：不足語の一括補完（JMdict）

## 更新するファイル（フォルダも含む）
- `index.html`：サイトに一般辞書候補を表示。既存画面、手札、共通デッキ機能は維持。
- `words-jmdict.txt`：初期状態は空。GitHub Actionsの初回手動実行で大量の不足語を生成。
- `dictionary-sources.html`：利用条件・出典。
- `scripts/update_dictionary_words.py`：JMdictの読みを抽出、既存21万語との重複を除外。
- `.github/workflows/update-dictionary.yml`：週1回の自動更新。Actionsから手動実行もできる。

## 最初のセットアップ
1. GitHubへZIP内5ファイルをフォルダごとアップロード。既存の `public-decks.js` `characters-auto.json` `words-local.txt` は変更しない。
2. GitHubの Actions → Update JMdict vocabulary → Run workflow → Run workflow を実行。
3. 実行完了後、`words-jmdict.txt` の行数が1万語以上あることを確認。
4. サイトを再読み込みして「一般辞書の候補も表示」にチェックを入れる。

## 注意
一般辞書の候補はコトダマン内で成立未確認です。候補を絞るには「一般辞書の候補も表示」をOFFにします。
`いとうき`・`いこうき` は初回更新前から暫定候補に入っています。
`words-jmdict.txt` は JMdict © EDRDG, CC BY-SA 4.0 に基づく派生データです。著作権表示・利用条件は dictionary-sources.html を参照。
取得元の停止・エラーではファイルを消さず、GitHub Actions を失敗として停止します。
