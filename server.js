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
    return []; // kalau file belum ada, return array kosong
  }
}

// Simpan data user ke file
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Generate random password (kalau mau generate backend)
function generateRandomPassword(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// Register endpoint
app.post("/register", (req, res) => {
  const { username } = req.body;
  if (!username || username.length < 3) {
    return res.status(400).json({ error: "Username harus minimal 3 karakter" });
  }

  const users = readUsers();

  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: "Username sudah terdaftar" });
  }

  // Generate credential password
  const password = generateRandomPassword();

  // Simpan IP client
  const ip = req.ip;

  const newUser = {
    username,
    password,
    ip,
    subscriptionActive: false, // default belum subscribe
  };

  users.push(newUser);
  saveUsers(users);

  return res.json({ message: "Akun berhasil dibuat", username, password });
});

// Login endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password wajib diisi" });
  }

  const users = readUsers();

  const user = users.find((u) => u.username === username);

  if (!user) {
    return res.status(401).json({ error: "User tidak ditemukan" });
  }

  // Cek password & IP
  if (user.password === password && user.ip === req.ip) {
    return res.json({ message: "Login berhasil", username, subscriptionActive: user.subscriptionActive });
  } else {
    return res.status(401).json({ error: "Username atau password salah, atau IP tidak cocok" });
  }
});

// Server jalan
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
