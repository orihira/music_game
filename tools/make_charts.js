// 使い方: node tools/make_charts.js   (ffmpegが必要)  songs/*.mp3 から songs/*.json を生成
const fs=require('fs'),cp=require('child_process'),G=require('../chartgen.js');
const list=JSON.parse(fs.readFileSync('songs/index.json'));
for(const s of list){
  const buf=cp.execSync(`ffmpeg -v error -i songs/${s.file} -ac 1 -ar 22050 -f f32le -`,{maxBuffer:1<<30});
  const x=new Float32Array(buf.buffer,buf.byteOffset,buf.length/4);
  const charts={};for(const[k,g]of Object.entries(G.DIFFS))charts[k]=G.generate(x,22050,g);
  s.duration=+(x.length/22050).toFixed(1);
  fs.writeFileSync(`songs/${s.id}.json`,JSON.stringify({id:s.id,title:s.title,artist:s.artist,official:true,charts}));
  console.log(s.id,s.duration+'s',Object.entries(charts).map(([k,v])=>k+':'+v.length).join(' '));
}
fs.writeFileSync('songs/index.json',JSON.stringify(list,null,1));
