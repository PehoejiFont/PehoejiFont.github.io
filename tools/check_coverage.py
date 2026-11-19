import sys,json,re,os,collections
from fontTools.ttLib import TTFont
d={r['dir']:r for r in json.load(open('site/fonts.json'))}
NEED={'030D':0x30D,'0358':0x358,'207F':0x207F}
BASE={'0300':0x300,'0301':0x301,'0302':0x302,'0304':0x304,'0306':0x306}
res=[]
for line in open('dl.txt'):
  dd,fn=line.rstrip('\n').split('\t'); p='fontfiles/'+(dd+'/'+fn).replace('/','_')
  try:
    f=TTFont(p,lazy=True,fontNumber=0); cm=f.getBestCmap() or {}
    feats=set()
    if 'GPOS' in f and f['GPOS'].table.FeatureList: feats={fr.FeatureTag for fr in f['GPOS'].table.FeatureList.FeatureRecord}
  except Exception as e: print('ERR',p,e); continue
  latin=all(c in cm for c in range(0x61,0x7B))
  r=d[dd]
  res.append(dict(name=r['n'],dir=dd,license=r['lic'],category=r['cat'],designer=r['des'],repo=r['repo'],file=fn,variable=bool(r['vf']),axes=r['ax'],
    latin=latin,missing_poj=[k for k,v in NEED.items() if v not in cm],missing_tone=[k for k,v in BASE.items() if v not in cm],mark='mark' in feats,glyphs=len(cm)))
for x in res:
  if not x['latin']: x['status']='not-latin'
  elif not x['missing_poj'] and not x['missing_tone']: x['status']='has-poj-chars'
  else: x['status']='needs-work'
json.dump(res,open('shortlist.json','w'),ensure_ascii=False,indent=0)
c=collections.Counter(x['status'] for x in res); print(c)
nw=[x for x in res if x['status']=='needs-work']
print('needs-work missing breakdown',collections.Counter(tuple(x['missing_poj']) for x in nw).most_common(6))
print('needs-work also missing tone marks',sum(1 for x in nw if x['missing_tone']))
print('needs-work w/o mark feature',sum(1 for x in nw if not x['mark']))
print('has-poj:',', '.join(sorted(x['name'] for x in res if x['status']=='has-poj-chars')))
print('needs-work unique repos',len({x['repo'].lower().rstrip('/') for x in nw}))
print('legacy hg repo in needs-work',sum(1 for x in nw if 'googlefontdirectory-hg' in x['repo']))
