"""Additive, fail-closed public GameWith character-list update.

Requires requests and beautifulsoup4; only publishes verified new rows.
Does not remove characters and does not alter saved decks.
"""
import json, os, re, sys
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

URL='https://gamewith.jp/kotodaman/article/show/99665'
OUT=Path(__file__).resolve().parents[1]/'characters-auto.json'
ATTRS={'火','水','木','光','闇','冥','天','虹'}
# Common zero-length formatting characters can be in listing text.
def clean(x): return re.sub(r'\s+',' ',x).strip()
def main():
    r=requests.get(URL,timeout=25,headers={'User-Agent':'Mozilla/5.0 (compatible; PersonalKotodamanDictionary/1.0)'})
    r.raise_for_status()
    soup=BeautifulSoup(r.text,'html.parser')
    found={}
    for row in soup.select('tr'):
        cells=row.find_all('td',recursive=False)
        if len(cells)<3: continue
        # Table is name | attribute | letters | counters | ratings.
        name=clean(cells[0].get_text(' ',strip=True)).split('（評価')[0].strip()
        attr=clean(cells[1].get_text(' ',strip=True))
        chars=re.findall(r'[ぁ-ゖ]',cells[2].get_text(' ',strip=True))
        chars=list(dict.fromkeys(chars))
        if not name or len(name)>90 or attr not in ATTRS or not chars or len(chars)>24:continue
        link=cells[0].find('a',href=True)
        url=urljoin(URL,link['href']) if link else ''
        # Without stable detail URL we cannot safely distinguish same-name versions.
        if not re.match(r'^https://gamewith\.jp/kotodaman/article/show/\d+(?:[/?#].*)?$',url):continue
        m=re.search(r'/show/(\d+)',url)
        if not m:continue
        id_=m.group(1)
        found[id_]={'name':name,'attribute':attr,'letters':chars,'url':url,
                    'image':f'https://img.gamewith.jp/article_tools/kotodaman/gacha/{id_}.png'}
    # A suspiciously small scrape is not a reliable update; leave data untouched.
    if len(found)<50:
        print(f'Skipped: only {len(found)} verified character rows. Source layout/access may have changed.',file=sys.stderr)
        return 0
    old={}
    if OUT.exists():
        for item in json.loads(OUT.read_text(encoding='utf-8')):
            m=re.search(r'/show/(\d+)',item.get('url',''))
            if m:old[m.group(1)]=item
    changes=0
    for id_,c in found.items():
        if id_ not in old:
            old[id_]=c;changes+=1
        else:
            # Do not overwrite existing data blindly; list may contain malformed values.
            pass
    if changes:
        OUT.write_text(json.dumps(list(old.values()),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(f'Parsed {len(found)}, new {changes}, stored {len(old)}')
    return 0
if __name__=='__main__':raise SystemExit(main())
