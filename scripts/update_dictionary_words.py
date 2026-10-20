#!/usr/bin/env python3
"""Refresh general Japanese readings from CC BY-SA 4.0 JMdict_e.

The generated file words-jmdict.txt is a derivative of EDRDG JMdict and is
redistributed under CC BY-SA 4.0. It does NOT assert Kotodaman acceptance.
Source: https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project
Licence: https://www.edrdg.org/edrdg/licence.html
"""
from __future__ import annotations

import argparse
import gzip
import io
import os
from pathlib import Path
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET

DEFAULT_SOURCE = 'https://www.edrdg.org/pub/Nihongo/JMdict_e.gz'
KANA = re.compile(r'^[ぁ-ゖー]{2,12}$')


def hiragana(text: str) -> str:
    # Convert fullwidth katakana to hiragana (do NOT normalize ー or remove mora).
    return ''.join(chr(ord(char) - 0x60) if 'ァ' <= char <= 'ヶ' else char for char in text)


def parse_jmdict(xml_bytes: bytes) -> set[str]:
    result: set[str] = set()
    n_entries = 0
    # JMdict contains XML DTD entities used in gloss/parts of speech. The
    # stdlib parser expands internal DTD entities; only <reb> text is retained.
    for event, element in ET.iterparse(io.BytesIO(xml_bytes), events=('end',)):
        if element.tag != 'entry':
            continue
        n_entries += 1
        for reading in element.findall('./r_ele/reb'):
            word = hiragana((reading.text or '').strip())
            if KANA.fullmatch(word):
                result.add(word)
        element.clear()
    if n_entries < 10000:
        raise ValueError(f'Unexpectedly few JMdict entries: {n_entries}')
    if len(result) < 10000:
        raise ValueError(f'Unexpectedly few JMdict readings: {len(result)}')
    return result


def fetch_gzip(url: str) -> bytes:
    request = urllib.request.Request(url, headers={'User-Agent':'Kotodaman-vocabulary-updater/1.0 (EDRDG JMdict attribution in app)'})
    err = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=100) as r:
                payload = r.read(120 * 1024 * 1024 + 1)
            if len(payload) > 120 * 1024 * 1024:
                raise ValueError('Download exceeds size limit')
            if len(payload) < 1_000_000:
                raise ValueError('JMdict archive looks too small')
            return gzip.decompress(payload)
        except Exception as exc:
            err = exc
            print(f'Download attempt {attempt+1} failed: {exc}',file=sys.stderr)
            if attempt < 2:
                time.sleep((attempt + 1) * 5)
    raise RuntimeError(f'Cannot download JMdict: {err}')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--xml', type=Path, help='Use a locally downloaded XML file')
    parser.add_argument('--source', default=DEFAULT_SOURCE)
    parser.add_argument('--output', type=Path, default=Path('words-jmdict.txt'))
    parser.add_argument('--base', type=Path, default=Path('words-local.txt'))
    parser.add_argument('--min-words', type=int, default=10000)
    args = parser.parse_args()
    data = args.xml.read_bytes() if args.xml else fetch_gzip(args.source)
    general = parse_jmdict(data)
    original = set(args.base.read_text(encoding='utf-8').splitlines()) if args.base.exists() else set()
    new = sorted(general - original)
    # A sudden collapse indicates a broken parse/download and must not overwrite.
    if len(new) < args.min_words:
        raise ValueError(f'New candidate vocabulary too small: {len(new)}')
    if args.output.exists():
        old_count = len([w for w in args.output.read_text(encoding='utf8').splitlines() if KANA.fullmatch(w)])
        if old_count > 10000 and len(new) < old_count * 0.9:
            raise ValueError(f'Candidate count decreased >10%: old={old_count}, new={len(new)}')
    text = '\n'.join(new) + '\n'
    tmp = args.output.with_suffix(args.output.suffix+'.tmp')
    tmp.write_text(text,encoding='utf8')
    os.replace(tmp,args.output)
    print(f'JMdict readings {len(general)}, existing {len(original)}, general-only {len(new)}, saved {args.output}')
    print('いこうき:', 'included' if 'いこうき' in general else 'not found')
    print('いとうき:', 'included' if 'いとうき' in general else 'not found (website has reported fallback)')


if __name__ == '__main__':
    main()
