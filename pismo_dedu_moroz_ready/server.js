require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "12kb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Слишком много попыток. Попробуйте немного позже." }
});

app.use(express.static(path.join(__dirname, "public")));

function clean(value, max) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/letter", limiter, async (req, res) => {
  try {
    // Простая ловушка для автоматического спама.
    if (req.body.website) return res.json({ ok: true });

    const name = clean(req.body.name, 40);
    const age = Number(req.body.age);
    const wish = clean(req.body.wish, 500);
    const message = clean(req.body.message, 1500);
    const parentConsent = req.body.parentConsent === true;

    if (!name || !Number.isInteger(age) || age < 3 || age > 17 ||
        !wish || !parentConsent) {
      return res.status(400).json({
        error: "Проверьте имя, возраст, желание и подтверждение родителя."
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.MAIL_TO || "osipoveriko@gmail.com";
    const from = process.env.MAIL_FROM || "onboarding@resend.dev";

    if (!apiKey || apiKey.startsWith("re_xxx")) {
      return res.status(503).json({
        error: "Отправка ещё не настроена. Организатору нужно добавить ключ почты."
      });
    }

    const text = [
      "Новое письмо Деду Морозу",
      "",
      `Имя: ${name}`,
      `Возраст: ${age}`,
      `Желание: ${wish}`,
      "",
      "Пожелания:",
      message || "Не указаны",
      "",
      "На сайте отмечено подтверждение разрешения родителя/опекуна."
    ].join("\n");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Письмо Деду Морозу от ${name}`,
        text
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Resend API error:", response.status, result);
      return res.status(502).json({
        error: "Письмо не отправилось. Проверьте настройки почты и попробуйте позже."
      });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Ошибка отправки:", error.message);
    return res.status(500).json({ error: "Временная ошибка. Попробуйте позже." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Сайт запущен на порту ${PORT}`));
