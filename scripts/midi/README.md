# MIDI → Tone.js 変換

DAW で書き出した `.mid` から、フロントエンドがそのまま読める JSON を作る。

- 元データ(手で編集するもの): `assets/music/*.mid`
- 生成物(コミットするが手で編集しないもの): `public/music/*.json`

`public/music/` の JSON は、下のコマンドでいつでも作り直せる。変換の過程を変えたときは、
生成し直した JSON も一緒にコミットする。

## 使い方

```bash
# 中身を調べる(トラック構成・楽器名メタ・Program Change / Control Change)
npx tsx scripts/midi/inspect-midi.ts assets/music/karawapo-breeze-zero.mid

# 変換(既定でノート以外のイベントは捨て、変換後に MIDI と突き合わせて検証する)
npx tsx scripts/midi/mid-to-tonejs.ts assets/music/karawapo-breeze-zero.mid \
  -o public/music/karawapo-breeze-zero.json --trim-clip-overlap \
  --title "Breeze Zero" --artist karawapo --license "CC BY 4.0"

# 書き出さずに検証だけする
npx tsx scripts/midi/mid-to-tonejs.ts <input.mid> --verify-only
```

主なオプション:

| オプション | 既定 | 意味 |
| --- | --- | --- |
| `-o, --output` | 入力と同じ名前の `.json` | 出力先 |
| `--title` | 入力のファイル名 | 作品名。JSON に入り、再生画面のクレジットに使う |
| `--artist` | なし | 制作者の名義。**CC BY 4.0 の帰属表示に必要** |
| `--license` | なし | ライセンス表記。**CC BY 4.0 の帰属表示に必要** |
| `--quantize 1/16` | なし | ノートの開始位置だけをグリッドに丸める。**この曲では不要**(下記) |
| `--bars N` | 最後のノート開始位置から算出 | 素材全体の長さ |
| `--loop-bars N` | `--bars` と同じ | ループの折り返し位置 |
| `--name 'source=logical'` | `808=drums` | 音源名から論理トラック名への読み替え |
| `--percussion <source>` | `808` | GM ドラムマップとして扱う音源 |
| `--trim-clip-overlap` | なし | クリップの長さを超えて鳴り出す音を捨てる(最後のクリップも切る) |
| `--no-percussion` | – | 打楽器の指定をすべて外す |

## 出力する JSON

```jsonc
{
  "title": "Breeze Zero",
  "artist": "karawapo",     // CC BY 4.0 は帰属表示が条件なので、再生する画面で出す
  "license": "CC BY 4.0",
  "bpm": 134,
  "timeSignature": [4, 4],
  "toneTimeSignature": 4,   // Tone.getTransport().timeSignature に渡す値
  "ppq": 480,
  "lengthBars": 29,          // 素材の長さ(最後の解決和音を含む)
  "loopBars": 28,            // ループの折り返し位置
  "loop": { "start": "0:0:0", "end": "28:0:0" },
  "tracks": [
    {
      "name": "drums",
      "sourceName": "808",
      "isPercussion": true,        // note は音程ではなく打楽器の指定
      "drumMap": { "C2": "bassDrum" },
      "events": [{ "time": "0:0:0", "note": "C2", "duration": "0:0:2", "velocity": 1 }]
    }
  ]
}
```

`time` と `duration` は Tone.js の `bars:beats:sixteenths`。テンポを変えても位置関係が崩れない。

## 聴いて確かめる

```bash
# 1) ブラウザ(Tone.js で再生。CDN は使わず node_modules の Tone.js を読む)
python3 -m http.server 4173      # リポジトリのルートで実行
open http://localhost:4173/scripts/midi/preview.html

# 2) WAV に書き出す(ブラウザなしで確認する場合)
npx tsx scripts/midi/render-wav.ts public/music/karawapo-breeze-zero.json -o /tmp/breeze-zero.wav
```

どちらの音色も確認用の簡易シンセで、本番の音源ではない。

## この曲(Breeze Zero / karawapo)について

- 134 BPM / 4/4 / 480 ppq、4小節のクリップを7回並べた28小節。
- トラックは `ePiano` / `lead` / `bass` / `drums`(元の音源名は `e piano` / `lead` / `bass` / `808`)。
  DAW 上ではクリップごとに別トラックへ書き出されていたので、楽器ごとに1本へまとめている。
- `drums` は GM のドラムマップ(36 バスドラム、40 スネア、42/46 ハイハットなど)。音程として鳴らさないこと。
- `ePiano` の本来の形は **4和音 x 8打 x 3音 = 96音/クリップ**。1小節に1和音(Dm → F → Em → G)を
  8分音符で8回、すべてグリッド上(ずれ0)。
- ところが書き出された各クリップには **9音の余りが含まれる。** 4小節目を越えた位置に E4 G4 B4 が3打
  あり、これらだけグリッドから -57 / -43 tick ずれ、和音の3音すらそろっていない(7863 / 7864 / 7866)。
  7クリップすべてに tick 単位で同じものが入っているので、演奏ではなくクリップごと複製された残骸。
  **書き出し元ではリージョンが4小節で切っていたため鳴らず、MIDI書き出しでクリップの中身が
  そのまま出たものと考えられる。**
- 1本にまとめるとこの残骸が次のクリップの頭(D4 F4 A4)と重なり、6音のクラスタになって和音が濁る
  (7.16 / 14.33 / 21.49 / 28.66 / 35.82 / 42.99 秒)。**`--trim-clip-overlap` で63音すべてを削る。**
  はみ出しがあるのは `ePiano` だけで、他の3トラックは変わらない。
- 残骸を削ると素材はちょうど28小節になり、`--loop-bars` を指定しなくてもループが閉じる。
- 残骸を削ったあと、`ePiano` `bass` `lead` は量子化なしで16分グリッドに完全に乗る。
  グリッド外に残るのは `drums` の35音だけで、これはキット側の意図的なずれ。
- 捨てたイベント: Program Change は0件、Control Change は CC1(モジュレーション、23件)のみで、
  いずれも音源固有の設定なので JSON には含めていない。
- `ePiano` と `drums` は元の演奏の揺れを残している(16分グリッドから最大 57 tick ずれる)。
  機械的に揃えたい場合は `--quantize 1/16` を付けて再生成する。
