// Ініціалізація змінних для зсуву та статистики
let offset = 0; // Зсув часу, обчислений власним методом
let arr_offsets = []; // Масив зсувів, отриманих власним методом
let arr_timesync_offsets = []; // Масив зсувів, отриманих бібліотекою timesync
let methodError = 0; // Похибка між нашим методом та timesync
let isCollecting = true; // Прапорець, що вказує, чи триває збір даних

// Створення об'єкта timesync з сервером і без повторної синхронізації
const ts = timesync.create({
    server: '/timesync',
    repeat: 0
});

// Обробник події синхронізації бібліотеки timesync
ts.on('sync', function() {
    // Перевірка, чи значення зсуву коректне
    if (typeof ts.offset !== 'number' || isNaN(ts.offset)) {
        console.error("Помилка: timesync повернув NaN!");
        document.getElementById('syncError').innerText = `Помилка: timesync повернув NaN!`;
        return;
    }

    // Додавання зсуву до масиву, якщо ще триває збір і не перевищено ліміт
    if (isCollecting && arr_timesync_offsets.length < 60) {
        arr_timesync_offsets.push(ts.offset);
    }

    // Розрахунок поточної похибки між методами
    const currentError = Math.abs(offset - ts.offset);
    console.log("Поточна похибка методу:", currentError);

    // Виведення поточної похибки та загальної похибки методу в інтерфейс
    document.getElementById('currentErrorStat').textContent = `${currentError.toFixed(2)} мс`;
    document.getElementById('syncError').innerHTML = `
        <strong>Поточна похибка методу:</strong> ${currentError.toFixed(2)} мс<br>
        <strong>Похибка методу:</strong> ${methodError.toFixed(2)} мс
    `;
});

// Основна функція синхронізації часу за власним методом
async function syncTime() {
    try {
        // Якщо починається новий збір — скидаємо попередні дані
        if (!isCollecting) {
            arr_offsets = [];
            arr_timesync_offsets = [];
            isCollecting = true;
            document.getElementById('timeOutput').textContent = "Початок нового збору даних...";
            document.getElementById('syncError').textContent = "";
        }

        // Замір часу перед і після запиту до сервера
        const start = performance.now();
        const response = await fetch('/time', { method: 'GET' });
        const end = performance.now();

        // Обробка помилки відповіді сервера
        if (!response.ok) throw new Error(`HTTP помилка: ${response.status}`);

        // Отримання серверного часу з відповіді
        const { result: serverTime } = await response.json();
        const roundTripTime = end - start; // Час на запит у дві сторони
        const estimatedClientTime = serverTime + roundTripTime / 2; // Оцінка поточного клієнтського часу
        offset = estimatedClientTime - Date.now(); // Розрахунок зсуву

        // Якщо ще збираємо дані — додаємо зсув до масиву
        if (isCollecting) {
            if (arr_offsets.length < 60) {
                arr_offsets.push(offset);
            } else {
                isCollecting = false;
                document.getElementById('timeOutput').textContent = `Збір даних завершено. Натисніть кнопку для нового збору.`;
                document.getElementById('syncError').textContent = "Досягнуто максимальної кількості даних (30). Натисніть кнопку для нового збору.";
            }
        }

        // Оновлення статистичних показників
        updateStats();

        // Виклик синхронізації бібліотеки timesync
        ts.sync();

        // Виведення останнього зсуву, якщо ще йде збір
        if (isCollecting) {
            document.getElementById('offsetStat').textContent = `${offset.toFixed(2)} мс`;
        }

        // Коли обидва масиви заповнені — обчислюємо похибку методу
        if (arr_offsets.length === 60 && arr_timesync_offsets.length === 60) {
            const yourStats = calculateStats(arr_offsets);
            const timesyncStats = calculateStats(arr_timesync_offsets);
            methodError = Math.abs(yourStats.mode - timesyncStats.mode);
            document.getElementById('methodErrorStat').textContent = `${methodError.toFixed(2)} мс`;
        }

        // Повторний запуск функції через 1 секунду, якщо ще збираємо
        if (isCollecting) {
            setTimeout(syncTime, 1000);
        }

    } catch (error) {
        // Обробка помилки запиту
        document.getElementById('timeOutput').textContent = 'Помилка синхронізації';
        document.getElementById('syncError').textContent = error.message;
        console.error('Помилка:', error);
    }
}

// Оновлення статистики в інтерфейсі
function updateStats() {
    const stats = calculateStats(arr_offsets);
    document.getElementById('countStat').textContent = arr_offsets.length;
    document.getElementById('output').textContent = formatStats(stats);
}

// Розрахунок статистичних характеристик з масиву значень
function calculateStats(arr) {
    if (!arr.length) return {};

    arr.sort((a, b) => a - b);
    const min = arr[0];
    const max = arr[arr.length - 1];
    const avg = arr.reduce((sum, num) => sum + num, 0) / arr.length;
    const median = arr.length % 2 === 0 ?
        (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2 :
        arr[Math.floor(arr.length / 2)];
    const q1 = arr[Math.floor(arr.length * 0.25)];
    const q3 = arr[Math.floor(arr.length * 0.75)];
    const iqr = q3 - q1;
    const mode = findMode(arr);
    const variance = arr.reduce((sum, num) => sum + (num - avg) ** 2, 0) / arr.length;
    const stddev = Math.sqrt(variance);

    return { min, q1, median, q3, max, avg, mode, stddev, iqr };
}

// Пошук моди (найчастіше зустрічаємого значення) в масиві
function findMode(arr) {
    const freq = {};
    arr.forEach(num => freq[num] = (freq[num] || 0) + 1);
    let maxFreq = 0, mode = null;

    for (const num in freq) {
        if (freq[num] > maxFreq) {
            maxFreq = freq[num];
            mode = Number(num);
        }
    }
    return mode;
}

// Форматування статистики для виводу на екран
function formatStats(stats) {
    return `Min: ${stats.min.toFixed(2)} мс
Q1: ${stats.q1.toFixed(2)} мс
Медіана: ${stats.median.toFixed(2)} мс
Середнє: ${stats.avg.toFixed(2)} мс
Мода: ${stats.mode.toFixed(2)} мс
Q3: ${stats.q3.toFixed(2)} мс
Max: ${stats.max.toFixed(2)} мс
Стандартне відхилення: ${stats.stddev.toFixed(2)} мс
IQR: ${stats.iqr.toFixed(2)} мс`;
}

// Обробник події завантаження сторінки — оновлює статистику при старті
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
});