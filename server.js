// Імпортуємо необхідні модулі
const express = require('express'); // Фреймворк для створення веб-сервера
const path = require('path'); // Модуль для роботи з файловими шляхами
const timesyncServer = require('timesync/server'); // Серверна частина бібліотеки timesync

const app = express(); // Створюємо додаток Express
const PORT = process.env.PORT || 3000; // Встановлюємо порт (змінна середовища або 3000 за замовчуванням)

// Налаштування Express для обслуговування статичних файлів з папки "public"
app.use(express.static(path.join(__dirname, 'public')));

// Налаштування маршруту для обробки запитів на синхронізацію часу через timesync
app.use('/timesync', timesyncServer.requestHandler);

// Маршрут GET /time – повертає поточний час сервера у форматі JSON
app.get('/time', (req, res) => {
    console.log("Запит GET /time");
    res.json({ result: Date.now(), id: Date.now() }); // Повертається час у мілісекундах
});

// Обробка всіх інших маршрутів – повертається головна HTML-сторінка
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера на заданому порту
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});