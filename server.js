const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const webpush = require("web-push");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, "users.json");

app.use(cors());
app.use(bodyParser.json());

// Baca data user dari file, return array user
function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

const vapidKeys = webpush.generateVAPIDKeys(); // Generate sekali saja
webpush.setVapidDetails(
  "mailto:psoputt@gmail.com",
  "BKPDh5hHI56Ws4cT6wLg_4zmmsZjWPfvo5dwtFfnxr6rXH14Jf1BDMG2So_6JjDE-QuG3oW_DSiM-RBu9-MEu6k",
  "Oy6fWtZXL1wLl8dhNaoNBBGfAvm-EymZO9xs1XEIgPQ"
);

// Simpan ke file atau DB
const notifys = [];

app.post("/subscribe", (req, res) => {
  const sub = req.body;
  notifys.push(sub);
  res.status(201).json({});
});

app.post("/sendNotification", (req, res) => {
  const payload = JSON.stringify({
    title: req.body.title,
    body: req.body.body
  });

  notifys.forEach(sub => {
    webpush.sendNotification(sub, payload).catch(err => {
      console.error("Notif gagal:", err);
    });
  });

  res.json({ status: "OK" });
});

app.get("/notifys", (req, res) => {
  res.json(notifys);
});


// Simpan data user ke file
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Generate random password (credential)
function generateRandomPassword(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

app.post("/register", (req, res) => {
  const { username } = req.body;
  if (!username || username.length < 3) {
    return res.status(400).json({ error: "Username minimal 3 karakter" });
  }

  const users = readUsers();

  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: "Username sudah ada" });
  }

  const password = generateRandomPassword();

  const newUser = {
    username,
    password,
    ip: req.ip,
    subscriptionActive: false,
  };

  users.push(newUser);
  saveUsers(users);

  res.json({ message: "Akun berhasil dibuat", username, password });
});

// login endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Login gagal" });

  // SIMPAN deviceInfo KE DALAM DATA USER:
  user.deviceInfo = {
    userAgent: req.headers['user-agent'],
    platform: req.body.platform, // kirim platform dari FE kalau perlu
    loginTime: new Date().toISOString()
  };

  saveUsers(users);

  return res.json({ subscriptionActive: user.subscriptionActive });
});

// Simpan info device publik saat login
app.post("/api/public-device", (req, res) => {
  const { username, platform, userAgent, loginTime } = req.body;

  if (!username || !platform || !userAgent) {
    return res.status(400).json({ error: "Data device kurang lengkap" });
  }

  const devices = readPublicDevices(); // ambil dari public-device.json
  devices.push({ username, platform, userAgent, loginTime });
  savePublicDevices(devices);

  res.json({ message: "Device info tersimpan" });
});

app.delete("/api/users/delete", (req, res) => {
  const { username, password, deviceInfo } = req.body;

  const users = readUsers();
  const userIndex = users.findIndex((u) =>
    u.username === username &&
    u.password === password &&
    u.deviceInfo?.userAgent === deviceInfo.userAgent &&
    u.deviceInfo?.platform === deviceInfo.platform
  );  

  if (userIndex === -1) {
    return res.status(404).json({ error: "User gak valid atau device gak cocok" });
  }

  users.splice(userIndex, 1);
  saveUsers(users);
  return res.json({ message: "Akun berhasil dihapus" });
});

// Update status subscription user (aktif/nonaktif)
app.put("/subscription/:username", (req, res) => {
  const username = req.params.username;
  const { subscriptionActive } = req.body;

  const users = readUsers();
  const userIndex = users.findIndex(u => u.username === username);

  if (userIndex === -1) return res.status(404).json({ error: "User tidak ditemukan" });

  users[userIndex].subscriptionActive = !!subscriptionActive;
  saveUsers(users);

  res.json({ message: `Subscription untuk ${username} telah diperbarui`, subscriptionActive: users[userIndex].subscriptionActive });
});

// Cek IP user (opsional)
app.get("/check-ip/:username", (req, res) => {
  const username = req.params.username;
  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

  res.json({ username, ip: user.ip });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
