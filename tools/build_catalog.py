import os,re,sys,json
root=sys.argv[1]; out=[]
for lic in ('ofl','apache','ufl'):
  for fam in sorted(os.listdir(os.path.join(root,lic))):
    d=os.path.join(root,lic,fam); m=os.path.join(d,'METADATA.pb')
    meta=open(m,encoding='utf-8').read() if os.path.exists(m) else ''
    g=lambda k:(re.search(r'^%s: "(.*)"'%k,meta,re.M) or [None,''])[1]
    repo=(re.search(r'repository_url: "(.*)"',meta) or [None,''])[1].replace('://www.github','://github')
    rfn=''; lf=os.path.join(d,'OFL.txt')
    if os.path.exists(lf):
      hdr=open(lf,encoding='utf-8-sig',errors='replace').read().split('This Font Software is licensed')[0]
      mm=re.search(r'[Rr]eserved [Ff]ont [Nn]ames?\s*(.*)',hdr)
      if mm and not re.search(r'\bno [Rr]eserved',hdr):
        rfn=re.sub(r'^(is|are|of)\s+','',mm.group(1).strip()).strip(' .,') or 'yes'
    licn={'APACHE2':'Apache 2.0','APACHE':'Apache 2.0','OFL':'OFL 1.1','UFL':'UFL 1.0'}.get(g('license') or lic.upper(),g('license'))
    rename = bool(rfn) or licn=='UFL 1.0'
    subsets=re.findall(r'^subsets: "(.*)"',meta,re.M)
    axes=re.findall(r'tag: "(.*)"',meta.split('source {')[0])
    nfiles=len(re.findall(r'^fonts \{',meta,re.M))
    out.append(dict(n=g('name') or fam,dir=f'{lic}/{fam}',lic=licn,rfn=rfn,ren=rename,cat=g('category').replace('_',' ').title(),des=g('designer'),add=g('date_added'),repo=repo,ext='latin-ext' in subsets,vf=bool(axes),ax=' '.join(axes),files=nfiles,lf=os.path.exists(lf) or licn!='OFL 1.1'))
open('site/fonts.json','w').write('[\n'+',\n'.join(json.dumps(r,ensure_ascii=False) for r in out)+'\n]\n')
print(len(out)); print(out[1])
