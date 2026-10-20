"""Build-time only: shared neutral speech plus one opening/nudge per expansion case.
Never overwrites immutable delivery. Uses the same documented stock Piper model.
Usage: python scripts/generate-expansion-voice.py /absolute/model.onnx /absolute/masters
"""
import hashlib,json,pathlib,subprocess,sys,wave,zipfile
from piper import PiperVoice,SynthesisConfig
from piper.config import PiperConfig
import onnxruntime
onnxruntime.disable_telemetry_events()
root=pathlib.Path(__file__).resolve().parents[1]
model=pathlib.Path(sys.argv[1]);masters=pathlib.Path(sys.argv[2]);masters.mkdir(parents=True,exist_ok=True)
source=root/'src/expansion/audio';shared=json.loads((source/'shared-cues.json').read_text())
ids=['m02','m03','m05','m06','m08','m09','m10','m11','m12']
for group in ['expansion-shared',*ids]:
 out=root/'public/audio'/group
 if out.exists() and list(out.glob('*.mp3')):raise ValueError('Immutable delivery exists: '+group)
archive_paths=[root/'production'/(group+'-voice-masters-v1.zip') for group in ['expansion-shared',*ids]]
if any(p.exists() for p in archive_paths):raise ValueError('Immutable master archive exists')
opts=onnxruntime.SessionOptions();opts.intra_op_num_threads=2;opts.inter_op_num_threads=1
voice=PiperVoice(config=PiperConfig.from_dict(json.loads(pathlib.Path(str(model)+'.json').read_text())),session=onnxruntime.InferenceSession(str(model),sess_options=opts,providers=['CPUExecutionProvider']))
config=SynthesisConfig(length_scale=1.05,noise_scale=0.45,noise_w_scale=0.55)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
entries={};records=[]
def generate(group,cue,data):
 out=root/'public/audio'/group;out.mkdir(parents=True,exist_ok=True)
 work=masters/group;work.mkdir(parents=True,exist_ok=True)
 wav=work/(cue+'.wav');flac=work/(cue+'.flac');path=out/(cue+'-v1.mp3')
 with wave.open(str(wav),'wb') as f:voice.synthesize_wav(data['text'],f,syn_config=config)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-20:TP=-2:LRA=7','-codec:a','libmp3lame','-b:a','48k','-ar','22050',str(path)],check=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','flac',str(flac)],check=True)
 with wave.open(str(wav),'rb') as f:pcm=f.readframes(f.getnframes())
 decoded=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(flac),'-f','s16le','-acodec','pcm_s16le','-'])
 assert pcm==decoded
 duration=round(float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],text=True))*1000)
 entry={'id':cue,**data,'speaker':'Morgan (synthetic)','language':'en-US','audioPath':'/audio/'+group+'/'+path.name,'durationMs':duration,'bytes':path.stat().st_size,'sha256':sha(path)}
 entries[group+':'+cue]=entry;records.append({'path':group+'/'+flac.name,'wavSha256':sha(wav),'flacSha256':sha(flac),'pcmSha256':hashlib.sha256(pcm).hexdigest(),'deliveryPath':entry['audioPath'],'deliverySha256':entry['sha256']})
 print(group,cue,duration,flush=True)
for cue,data in shared.items():generate('expansion-shared',cue,data)
base=json.loads((root/'src/presentation/voice/manifest.json').read_text())
for mid in ids:
 scripts=json.loads((source/mid/'cues.json').read_text())
 for cue in ['briefing','morgan-1']:generate(mid,cue,scripts[cue])
 pack=[]
 for cue in scripts:pack.append(entries[('expansion-shared' if cue in shared else mid)+':'+cue])
 pack.extend(c for c in base['cues'] if not c['text'])
 manifest={k:v for k,v in base.items() if k!='cues'};manifest.update(packId=mid.upper()+'-voice-en-US-v1',generationDate='2026-10-20',cues=pack)
 (source/mid/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
archives=[]
for group,archive in zip(['expansion-shared',*ids],archive_paths):
 with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED) as z:
  for r in records:
   if r['path'].startswith(group+'/'):z.write(masters/r['path'],r['path'])
 archives.append({'path':str(archive.relative_to(root)),'bytes':archive.stat().st_size,'sha256':sha(archive)})
master={'date':'2026-10-20','reviewStatus':'pending-human-listening','method':'Piper 1.8.0; stock en_US-ljspeech-high; no cloning. Shared neutral scripts are literal shared deliveries, not hidden-branch subsets. Existing M01 interface sounds reused unchanged.','modelSha256':sha(model),'archives':archives,'files':records}
(root/'production/expansion-MASTERS.json').write_text(json.dumps(master,indent=2)+'\n')
print('Expansion packs generated; listening and physical-device review remain pending',flush=True)
