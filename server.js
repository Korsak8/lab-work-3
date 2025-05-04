const express = require('express');
const path = require('path');
const timesyncServer = require('timesync/server');

const app = express();
const PORT = process.env.PORT || 3000;

// Функція для генерації випадкового числа за Гаусівським (нормальним) розподілом
function gaussianRandom(mean, stdDev) {
    let u = 1 - Math.random();
    let v = 1 - Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + stdDev * z;
}

// Налаштування сервера для обслуговування статичних файлів з папки "public"
app.use(express.static(path.join(__dirname, 'public')));

// Обробка запитів на синхронізацію часу через бібліотеку timesync
app.use('/timesync', timesyncServer.requestHandler);

// 📌 GET /time – повертає поточний серверний час
app.get('/time', (req, res) => {
    console.log("Запит GET /time");
    res.json({ result: Date.now(), id: Date.now() });
});

// 📌 Обробка всіх інших маршрутів – повернення index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на http://localhost:${PORT}`);
});
