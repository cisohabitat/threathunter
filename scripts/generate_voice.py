"""Build-time only. Requires piper-tts==1.8.0, numpy==2.5.4 and ffmpeg.
Usage: python scripts/generate_voice.py /absolute/model.onnx /absolute/masters [M01|M04|M07]
Model and lossless source audio remain outside the web/public tree.
"""
import hashlib,json,pathlib,subprocess,sys,wave
import numpy as np
from piper import PiperVoice,SynthesisConfig
from piper.config import PiperConfig
import onnxruntime
root=pathlib.Path(__file__).resolve().parents[1]
model=pathlib.Path(sys.argv[1]); masters=pathlib.Path(sys.argv[2]);masters.mkdir(parents=True,exist_ok=True)
mission=sys.argv[3].upper() if len(sys.argv)>3 else 'M01'
if mission not in ['M01','M04','M07']:raise ValueError('Unknown mission')
source=root/'src/presentation/voice' if mission=='M01' else root/('src/campaign/audio/'+mission.lower())
out=root/('public/audio/'+mission.lower())
if out.exists() and list(out.glob('*.mp3')):raise ValueError('Immutable delivery version already exists; author a new version instead of replacing it')
out.mkdir(parents=True,exist_ok=True)
opts=onnxruntime.SessionOptions();opts.intra_op_num_threads=2;opts.inter_op_num_threads=1
voice=PiperVoice(config=PiperConfig.from_dict(json.loads(pathlib.Path(str(model)+".json").read_text())),session=onnxruntime.InferenceSession(str(model),sess_options=opts,providers=["CPUExecutionProvider"]))
config=SynthesisConfig(length_scale=1.05,noise_scale=0.45,noise_w_scale=0.55)
cues=json.loads((source/'cues.json').read_text())
def delivery_duration(path):
 return round(float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)],text=True))*1000)
entries=[]
for cue,data in cues.items():
 wav=masters/(cue+'.wav')
 path=out/(cue+'-v1.mp3')
 with wave.open(str(wav),'wb') as f:voice.synthesize_wav(data['text'],f,syn_config=config)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-20:TP=-2:LRA=7','-codec:a','libmp3lame','-b:a','48k','-ar','22050',str(path)],check=True)
 duration=delivery_duration(path)
 entries.append({'id':cue,**data,'speaker':'Morgan (synthetic)','language':'en-US','audioPath':'/audio/'+mission.lower()+'/'+path.name,'durationMs':duration,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 print(cue,duration,path.stat().st_size,flush=True)
# Original, quiet UI effects. No cue contains hidden world information.
sr=22050
for name,freq in [('effect-select',440),('effect-acquire',554),('effect-check',660),('effect-submit',392)]:
 t=np.arange(int(sr*.15))/sr;x=.09*np.sin(2*np.pi*freq*t)*np.sin(np.pi*t/.15)**2
 wav=masters/(name+'.wav')
 with wave.open(str(wav),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((x*32767).astype('<i2').tobytes())
 path=out/(name+'-v1.mp3');subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','32k',str(path)],check=True)
 entries.append({'id':name,'text':'','speaker':'Interface','language':'en-US','when':'public_interface_event','audioPath':'/audio/'+mission.lower()+'/'+path.name,'durationMs':delivery_duration(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
t=np.arange(sr*12)/sr
x=.018*(np.sin(2*np.pi*110*t)+.35*np.sin(2*np.pi*165*t))*(.85+.15*np.sin(2*np.pi*t/12))
wav=masters/'ambience.wav'
with wave.open(str(wav),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((x*32767).astype('<i2').tobytes())
path=out/'ambience-v1.mp3';subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','32k',str(path)],check=True)
entries.append({'id':'ambience','text':'','speaker':'Environment','language':'en-US','when':'player_enabled_ambience','audioPath':'/audio/'+mission.lower()+'/'+path.name,'durationMs':delivery_duration(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
manifest={'packId':mission+'-voice-en-US-v1','schemaVersion':1,'reviewStatus':'pending-human-listening','reviewer':None,'generationDate':'2026-10-20' if mission!='M01' else '2026-10-19','productionMethod':'Piper 1.8.0, en_US-ljspeech-high, stock synthetic voice; no voice cloning','modelSource':'https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/ljspeech/high','modelSha256':hashlib.sha256(model.read_bytes()).hexdigest(),'datasetLicense':'Public domain per model card; LJSpeech/LibriVox recordings','delivery':'MP3, 22.05 kHz mono; voice 48 kbit/s; effects/ambience 32 kbit/s','cues':entries}
(source/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Total bytes',sum(e['bytes'] for e in entries),flush=True)
