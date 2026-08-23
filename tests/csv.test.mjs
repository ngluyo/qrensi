// Uji parser CSV impor pegawai (logika direplika dari src/lib/csv.ts).
import test from "node:test";
import assert from "node:assert/strict";

function deteksiPemisah(teks){const b=teks.split(/\r?\n/,1)[0]??"";let q=false;const j={",":0,";":0,"\t":0};
for(const c of b){if(c==='"')q=!q;else if(!q&&(c===","||c===";"||c==="\t"))j[c]++;}
if(j[";"]>j[","]&&j[";"]>=j["\t"])return ";";if(j["\t"]>j[","]&&j["\t"]>j[";"])return "\t";return ",";}
function parseCsv(t0){const t=t0.replace(/^\uFEFF/,"");const p=deteksiPemisah(t);const rows=[];let col=[],v="",q=false;
for(let i=0;i<t.length;i++){const c=t[i];
if(q){if(c==='"'){if(t[i+1]==='"'){v+='"';i++;}else q=false;}else v+=c;continue;}
if(c==='"')q=true;else if(c===p){col.push(v.trim());v="";}
else if(c==="\n"){col.push(v.trim());if(col.some(x=>x!==""))rows.push(col);col=[];v="";}
else if(c==="\r"){}else v+=c;}
col.push(v.trim());if(col.some(x=>x!==""))rows.push(col);return rows;}

test("koma standar", ()=>{
  const r=parseCsv("nama,nip\nBudi,123\n");
  assert.deepEqual(r,[["nama","nip"],["Budi","123"]]);
});
test("titik-koma (Excel lokal Indonesia)", ()=>{
  const r=parseCsv("nama;nip;unit\nBudi;123;Dinas A\n");
  assert.deepEqual(r,[["nama","nip","unit"],["Budi","123","Dinas A"]]);
});
test("BOM dari Excel dibuang", ()=>{
  const r=parseCsv("\uFEFFnama,nip\nBudi,123");
  assert.equal(r[0][0],"nama");
});
test("koma di dalam tanda kutip", ()=>{
  const r=parseCsv('nama,alamat\n"Budi, S.Kom","Jl. A, No. 5"\n');
  assert.deepEqual(r[1],["Budi, S.Kom","Jl. A, No. 5"]);
});
test("escape kutip ganda", ()=>{
  const r=parseCsv('nama\n"Budi ""Bud"" Santoso"\n');
  assert.equal(r[1][0],'Budi "Bud" Santoso');
});
test("CRLF Windows", ()=>{
  const r=parseCsv("nama,nip\r\nBudi,123\r\n");
  assert.deepEqual(r,[["nama","nip"],["Budi","123"]]);
});
test("baris kosong dilewati", ()=>{
  const r=parseCsv("nama\nBudi\n\n\nSiti\n");
  assert.equal(r.length,3);
});
test("baris terakhir tanpa newline", ()=>{
  const r=parseCsv("nama,nip\nBudi,123");
  assert.deepEqual(r[1],["Budi","123"]);
});
test("pemisah tidak salah deteksi krn koma dlm kutip di header", ()=>{
  assert.equal(deteksiPemisah('"nama, lengkap";nip'),";");
});
