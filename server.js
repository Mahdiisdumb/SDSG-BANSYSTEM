import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const users = new Map();

const LIMIT = 3;
const DAY = 86400000;

function getIP(req) {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
}

app.post("/check", (req, res) => {
  const { id } = req.body;
  const ip = getIP(req);

  const key = id ? `${id}_${ip}` : ip;

  const now = Date.now();
  let user = users.get(key);

  if (!user) {
    user = { count: 0, firstTime: now };
  }

  if (now - user.firstTime > DAY) {
    user.firstTime = now;
    user.count = 0;
  }

  user.count++;

  users.set(key, user);

  res.json({
    banned: user.count >= LIMIT
  });
});

app.listen(3000, () => {
  console.log("Running");
});