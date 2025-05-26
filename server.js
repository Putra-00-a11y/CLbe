const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
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

// Register user baru
app.post("/register", (req, res) => {
  const { username } = req.body;
  if (!username || username.length < 3) {
    return res.status(400).json({ error: "Username harus minimal 3 karakter" });
  }

  const users = readUsers();

  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: "Username sudah terdaftar" });
  }

  const password = generateRandomPassword();
  const ip = req.ip;

  const newUser = {
    username,
    password,
    ip,
    subscriptionActive: false, // default belum aktif
  };

  users.push(newUser);
  saveUsers(users);

  return res.json({ message: "Akun berhasil dibuat", username, password });
});

// Login user
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi" });
  }

  const users = readUsers();
  const user = users.find((u) => u.username === username);

  if (!user) return res.status(401).json({ error: "User tidak ditemukan" });

  if (user.password === password && user.ip === req.ip) {
    return res.json({ message: "Login berhasil", username, subscriptionActive: user.subscriptionActive });
  } else {
    return res.status(401).json({ error: "Username/password salah atau IP tidak cocok" });
  }
});

// DELETE akun (logout + hapus akun)
app.delete("/api/users/:username", (req, res) => {
  const username = req.params.username;
  const ip = req.ip;

  const users = readUsers();
  const userIndex = users.findIndex((u) => u.username === username && u.ip === ip);

  if (userIndex === -1) {
    return res.status(404).json({ error: "User gak ditemukan atau IP gak cocok" });
  }

  users.splice(userIndex, 1); // hapus user
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
