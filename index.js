require("dotenv").config();
const { Bot } = require("grammy");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const bot = new Bot(process.env.BOT_TOKEN);

// Слухаємо всі повідомлення — оновлюємо дату останнього повідомлення від людини
bot.on("message", (ctx) => {
  // Ігноруємо повідомлення від ботів
  if (ctx.from.is_bot) return;

  const chatId = String(ctx.chat.id);
  const data = loadData();
  data[chatId] = { lastMessageAt: Date.now(), chatId };
  saveData(data);
});

// Щодня о 10:00 (Київ = UTC+2, зимою UTC+3 — використаємо Europe/Kyiv)
cron.schedule(
  "0 10 * * *",
  async () => {
    const data = loadData();
    const now = Date.now();

    for (const [chatId, info] of Object.entries(data)) {
      if (!info.lastMessageAt) continue;

      const diffMs = now - info.lastMessageAt;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 1) {
        try {
          await bot.api.sendMessage(
            chatId,
            `Нічого не відбувається: день ${diffDays}`
          );
        } catch (err) {
          console.error(`Помилка відправки в чат ${chatId}:`, err.message);
        }
      }
    }
  },
  { timezone: "Europe/Kyiv" }
);

bot.start();
console.log("Бот запущено!");
