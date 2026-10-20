"""Produce shorter, immutable v2 first-guidance clips; retain all v1 deliveries/masters.
Usage: python scripts/revise-expansion-nudges.py /absolute/model.onnx /absolute/masters
"""
import hashlib,json,pathlib,subprocess,sys,wave,zipfile
from piper import PiperVoice,SynthesisConfig
from piper.config import PiperConfig
import onnxruntime
onnxruntime.disable_telemetry_events()
root=pathlib.Path(__file__).resolve().parents[1];model=pathlib.Path(sys.argv[1]);masters=pathlib.Path(sys.argv[2]);masters.mkdir(parents=True,exist_ok=True)
lines={
'M02':'Compare business consequence with alert severity. Choose which known scope deserves investigation first; a louder alert is not automatically more important.',
'M03':'Test the task, destination and actual session action. A familiar account or a trusted colleague does not establish current authorisation.',
'M05':'Separate credential use from person attribution. Check the specific session and task; a credential label alone does not identify the operator.',
'M06':'Follow the acquired management path. Compare its actual target with the approved task before calling a cross-system connection suspicious.',
'M08':'Follow the application’s acquired workload relationship. Choose a source that can observe the cloud action; a quiet endpoint has a different boundary.',
'M09':'Compare the emergency grant’s task, target and interval with the recorded action. Technical privilege alone does not establish authorisation.',
'M10':'Establish the behaviour and approval boundary. Keep motive and person identity separate from what a source can actually record.',
'M11':'Test each causal explanation separately. Join observations only when an acquired relationship supports the link, rather than relying on shared timing.',
'M12':'Prioritise the supported scope and preserve the separate collection gap. A useful handoff names owners and follow-ups without requiring certainty about every system.'}
archive=root/'production/expansion-nudge-masters-v2.zip'
if archive.exists() or any((root/'public/audio'/mid.lower()/'morgan-1-v2.mp3').exists() for mid in lines):raise ValueError('Immutable v2 revision exists')
opts=onnxruntime.SessionOptions();opts.intra_op_num_threads=2;opts.inter_op_num_threads=1
voice=PiperVoice(config=PiperConfig.from_dict(json.loads(pathlib.Path(str(model)+'.json').read_text())),session=onnxruntime.InferenceSession(str(model),sess_options=opts,providers=['CPUExecutionProvider']))
config=SynthesisConfig(length_scale=1.05,noise_scale=.45,noise_w_scale=.55)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();records=[]
for mid,text in lines.items():
 group=mid.lower();source=root/'src/expansion/audio'/group;manifest=json.loads((source/'manifest.json').read_text());old=next(c for c in manifest['cues'] if c['id']=='morgan-1');work=masters/group;work.mkdir(parents=True,exist_ok=True);wav=work/'morgan-1-v2.wav';flac=work/'morgan-1-v2.flac';out=root/'public/audio'/group/'morgan-1-v2.mp3'
 with wave.open(str(wav),'wb') as f:voice.synthesize_wav(text,f,syn_config=config)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-20:TP=-2:LRA=7','-codec:a','libmp3lame','-b:a','48k','-ar','22050',str(out)],check=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','flac',str(flac)],check=True)
 with wave.open(str(wav),'rb') as f:pcm=f.readframes(f.getnframes())
 assert pcm==subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(flac),'-f','s16le','-acodec','pcm_s16le','-'])
 duration=round(float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(out)],text=True))*1000)
 entry={**old,'text':text,'audioPath':'/audio/'+group+'/morgan-1-v2.mp3','durationMs':duration,'bytes':out.stat().st_size,'sha256':sha(out)};manifest['cues']=[entry if c['id']=='morgan-1' else c for c in manifest['cues']];manifest['productionMethod']+='; first guidance shortened in immutable v2 clip'
 scripts=json.loads((source/'cues.json').read_text());scripts['morgan-1']['text']=text;(source/'cues.json').write_text(json.dumps(scripts,indent=2)+'\n');(source/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 records.append({'missionId':mid,'path':group+'/'+flac.name,'previousCue':old,'activeCue':entry,'wavSha256':sha(wav),'flacSha256':sha(flac),'pcmSha256':hashlib.sha256(pcm).hexdigest()});print(mid,duration,flush=True)
with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED) as z:
 for r in records:z.write(masters/r['path'],r['path'])
(root/'production/expansion-nudge-v2-MASTERS.json').write_text(json.dumps({'date':'2026-10-20','reviewStatus':'pending-human-listening','modelSha256':sha(model),'archive':str(archive.relative_to(root)),'archiveBytes':archive.stat().st_size,'archiveSha256':sha(archive),'files':records},indent=2)+'\n')
