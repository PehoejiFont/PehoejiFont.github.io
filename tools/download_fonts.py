import os,sys,urllib.request,concurrent.futures as cf
def get(line):
  d,fn=line.rstrip('\n').split('\t'); p='fontfiles/'+(d+'/'+fn).replace('/','_')
  if os.path.exists(p) and os.path.getsize(p)>0: return 0
  u='https://raw.githubusercontent.com/google/fonts/main/'+urllib.request.quote(d+'/'+fn)
  try:
    data=urllib.request.urlopen(u,timeout=120).read(); open(p,'wb').write(data); return 0
  except Exception as e: print('FAIL',d,fn,e); return 1
lines=open(sys.argv[1]).readlines()
with cf.ThreadPoolExecutor(16) as ex: print('failures',sum(ex.map(get,lines)))
