import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const L = 3; // max strikes
const D = 86400000; // 24h in ms
const P = "11212012m@#"; // admin password
const U = new Map();

function getClientIP(req) {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
}

// Ban check
app.post("/check", (req, res) => {
  const { id } = req.body;
  const ip = getClientIP(req);
  const key = id ? id + "_" + ip : ip;
  const now = Date.now();
  let record = U.get(key) || { count: 0, firstTime: now };
  if (now - record.firstTime > D) {
    record.firstTime = now;
    record.count = 0;
  }
  record.count++;
  U.set(key, record);
  res.json({ banned: record.count >= L, strikes: record.count });
});

// API to list all users
app.get("/api/all", (req, res) => {
  const arr = [];
  U.forEach((v, k) => arr.push({ key: k, ...v, banned: v.count >= L }));
  res.json(arr);
});

// Admin update
app.post("/admin/update", (req, res) => {
  const { key, count, password } = req.body;
  if (password !== P) return res.status(403).json({ error: "Invalid admin password" });
  if (!key || typeof count !== "number") return res.status(400).json({ error: "Invalid payload" });
  U.set(key, { count, firstTime: Date.now() });
  res.json({ success: true, key, count });
});

// Embedded HTML dashboard
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SDSG Ban Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0d1117;--panel:#161b22;--accent:#58a6ff;--accent-2:#f78166;--muted:#c9d1d9;--soft:#79c0ff}
html,body{height:100%}body,html{margin:0;padding:0;font-family:'Courier New',monospace;background-color:var(--bg);color:var(--muted);display:flex;justify-content:center;align-items:center;height:100vh;overflow:hidden;user-select:none}
.container{max-width:900px;width:100%;padding:30px;text-align:center;background-color:var(--panel);border-radius:12px;border:1px solid #21262d;backdrop-filter:blur(4px);position:relative;z-index:1;box-shadow:0 6px 30px rgb(0 0 0 / .6);transform:translateZ(0);will-change:transform,opacity;overflow:visible;animation:glitchBox 8s infinite ease-in-out}
.container::after{content:"";position:absolute;inset:-18px;border-radius:16px;pointer-events:none;background:radial-gradient(closest-side,rgb(88 166 255 / .12),transparent 50%);z-index:-1;opacity:.9;transform:translateZ(0);will-change:opacity,transform;animation:pulse 6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:.5;transform:scale(1.02)}}
@keyframes glitchBox{0%{transform:translateY(0) translateX(0)}25%{transform:translateY(-1px) translateX(1px)}50%{transform:translateY(1px) translateX(-1px)}75%{transform:translateY(-.5px) translateX(.5px)}100%{transform:translateY(0) translateX(0)}}
h1{color:var(--accent-2);font-family:'Orbitron',sans-serif;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;position:relative}
h1::after{content:"";position:absolute;left:50%;transform:translateX(-50%);bottom:-6px;width:60%;height:6px;background:radial-gradient(ellipse at center,rgb(247 129 102 / .14),transparent 60%);filter:blur(6px);opacity:.85;will-change:opacity;animation:headingPulse 7.5s ease-in-out infinite}
@keyframes headingPulse{0%,100%{opacity:.9}50%{opacity:.5}}
table{margin:auto;border-collapse:collapse;width:100%;transition:all 0.1s ease}
th,td{border:1px solid #444;padding:10px;transition:all 0.1s ease}
th{background:#222}td{color:var(--muted);transition:all 0.2s ease}td.banned{color:red;font-weight:700}td.ok{color:lime;font-weight:700}
tr{transition:all 0.1s ease;transform:translateX(0)}tr.animate{animation:rowPulse 0.5s ease-in-out}
@keyframes rowPulse{0%{transform:translateX(-5px)}50%{transform:translateX(5px)}100%{transform:translateX(0)}}
#adminPanel{margin-top:20px;background:#111;border:1px dashed var(--accent);padding:15px;border-radius:8px}
input,button{padding:8px 12px;margin:4px;font-family:'Courier New',monospace;font-weight:700;color:var(--accent-2);background:var(--panel);border:2px dashed var(--accent);border-radius:6px}
button:hover{cursor:pointer;transform:scale(1.05);background:var(--accent-2);color:var(--bg)}
</style>
</head>
<body>
<div class="container">
<h1>SDSG Ban Dashboard</h1>
<p>Total Users: <span id="total">0</span></p>
<table>
<thead><tr><th>ID + IP</th><th>Strikes</th><th>Status</th></tr></thead>
<tbody id="userTable"><tr><td colspan="3">Loading...</td></tr></tbody>
</table>
<div id="adminPanel">
<h2>Admin Panel</h2>
<p>Modify user strikes (admin password required)</p>
<input id="adminKey" placeholder="User ID + IP">
<input id="adminCount" type="number" placeholder="Strikes count">
<input id="adminPass" type="password" placeholder="Password">
<button id="updateBtn">Update User</button>
<p id="adminMsg"></p>
</div>
</div>
<script>
const API="/api/all";
async function f(){
try{
const t=await fetch(API),n=await t.json(),e=document.getElementById("userTable");
e.innerHTML="",document.getElementById("total").innerText=n.length;
0===n.length?e.innerHTML="<tr><td colspan='3'>No users yet</td></tr>":n.forEach(t=>{
const r=document.createElement("tr");r.classList.add("animate");
const a=document.createElement("td");a.textContent=t.key;
const c=document.createElement("td");c.textContent=t.count;
const s=document.createElement("td");s.textContent=t.banned?"BANNED":"OK";
s.className=t.banned?"banned":"ok";r.append(a,c,s);
document.getElementById("userTable").appendChild(r);
});
}catch(t){console.error(t),document.getElementById("userTable").innerHTML="<tr><td colspan='3'>Failed to load users</td></tr>"}
}
setInterval(f,50);
document.getElementById("updateBtn").addEventListener("click",async()=>{
const key=document.getElementById("adminKey").value;
const count=parseInt(document.getElementById("adminCount").value);
const password=document.getElementById("adminPass").value;
const msg=document.getElementById("adminMsg");
if(!key||isNaN(count)||!password){msg.innerText="Fill all fields";return;}
try{
const res=await fetch("/admin/update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key,count,password})});
const data=await res.json();
if(data.success){msg.innerText="User updated!";f();}else{msg.innerText=data.error||"Failed"}}
catch(t){console.error(t);msg.innerText="Error updating user"}})
</script>
</body></html>`);
});

// Start server
app.listen(process.env.PORT || 3000, ()=>console.log("Ban system running"));