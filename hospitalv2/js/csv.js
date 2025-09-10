
// Lightweight CSV + Local Demo DB
window.CsvDB = (function(){
  const KEY='csvdb.v1';
  let db = JSON.parse(localStorage.getItem(KEY) || '{}');

  function save(){ localStorage.setItem(KEY, JSON.stringify(db)); }
  function clear(){ db={}; save(); }

  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(',').map(h=>h.trim());
    return lines.map(line=>{
      const cells = []; let cur='', inQ=false;
      for(let i=0;i<line.length;i++){
        const ch=line[i];
        if(ch=='"'){ inQ=!inQ; continue; }
        if(ch==',' && !inQ){ cells.push(cur); cur=''; continue; }
        cur+=ch;
      }
      cells.push(cur);
      const row={}; headers.forEach((h,i)=> row[h] = (cells[i]||'').trim());
      return row;
    });
  }

  async function loadFromUrl(table, url){
    const res = await fetch(url, {cache:'no-store'});
    const txt = await res.text();
    db[table] = parseCSV(txt);
    save();
    return db[table];
  }

  function insert(table, row){
    db[table] = db[table] || [];
    db[table].push(row);
    save(); return row;
  }

  function all(table){ return db[table] || []; }

  function filter(table, pred){ return all(table).filter(pred); }

  function sum(table, col, pred=()=>true){
    return all(table).filter(pred).reduce((s,r)=> s + (parseFloat(r[col])||0), 0);
  }

  return { parseCSV, loadFromUrl, insert, all, filter, sum, clear };
})();
