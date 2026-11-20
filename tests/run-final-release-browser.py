"""Repeatable local acceptance. Fixtures are never Preview/Production/real provider success."""
from pathlib import Path
import os,subprocess,json,time,urllib.request
root=Path.cwd();work=root/'work/final-execution-browser';work.mkdir(exist_ok=True);out=root/'docs/release-20261201/evidence/final-execution-browser';out.mkdir(parents=True,exist_ok=True)
source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();servers=[];logs=[];results=[]
def start(name,command,port,path='/',env=None):
 log=open(work/f'{name}-server.log','w');logs.append(log);server=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT,env=env);servers.append(server)
 for _ in range(80):
  if server.poll() is not None:break
  try:
   with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}',timeout=2) as r:
    if r.status==200:return
  except Exception:pass
  time.sleep(.25)
 raise RuntimeError(name+' fixture did not start')
def run(name,sourcePath,oldPort,newPort,oldOutput=None):
 folder=out/name;folder.mkdir(exist_ok=True);s=Path(sourcePath).read_text().replace(str(oldPort),str(newPort)).replace("Path('docs/release-20261201/evidence')",f"Path('{folder}')").replace("Path('docs/release-20261201/evidence/billing-management')",f"Path('{folder}')").replace("'source':'145aa5d'",f"'source':'{source}'")
 if oldOutput:s=s.replace(oldOutput,str(folder))
 target=work/f'{name}.py';target.write_text(s)
 with open(work/f'{name}.log','w') as log:r=subprocess.run(['python',str(target)],stdout=log,stderr=subprocess.STDOUT,env={**os.environ,'CAMELLIA_BROWSER_OUTPUT':str(folder),'CAMELLIA_BROWSER_ORIGIN':f'http://127.0.0.1:{newPort}'},timeout=420)
 results.append({'feature':name,'exitCode':r.returncode});print(name,r.returncode,flush=True)
 (out/'summary.json').write_text(json.dumps({'source':source,'dateUTC':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'kind':__doc__,'results':results},indent=2)+'\n')
 if r.returncode:raise RuntimeError(name+' local browser test failed; inspect '+str(work/f'{name}.log'))
try:
 start('main',['node','tests/ux-preview.mjs'],4210,env={**os.environ,'UX_FIXTURE_PORT':'4210','FREE_USE_FIXTURE':'on','CHECK_FIRST_FIXTURE':'on','CHOICE_FLOW_FIXTURE':'on','VITE_PLACE_ENABLED':'off','VITE_CIRCLE_ENABLED':'off'})
 for name,path,port,oldOutput in [('free','tests/free-experience-browser.py',4173,None),('recovery','tests/free-id-recovery-browser.py',4173,'/workspace/outputs/camellia-free-id-20261117/recovery'),('conversation','tests/browser/integration-conversation.py',4191,None),('trial-lanes','tests/browser/referral-ai-lanes.py',4191,None),('billing-management','tests/browser/billing-management.py',4191,None),('slow-recovery','tests/browser/final-slow.py',4210,None)]:run(name,path,port,4210,oldOutput)
 for i,(name,port) in enumerate([('stripe-checkout',4181),('share',4182),('referral',4183),('push',4184),('place-intake',4185),('billing-analytics',4188)]):
  new=4211+i;s=Path(f'tests/browser/{name}-server.mjs').read_text().replace(str(port),str(new)).replace("cacheDir:'work/","cacheDir:'work/final-execution/");target=work/f'{name}-server.mjs';target.write_text(s);start(name,['node',str(target)],new,'/fixture');run(name,f'tests/browser/{name}.py',port,new)
finally:
 for server in servers:server.terminate()
 for server in servers:
  try:server.wait(timeout=8)
  except subprocess.TimeoutExpired:server.kill();server.wait()
 for log in logs:log.close()
