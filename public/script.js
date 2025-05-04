let offset = 0;
let arr_offsets = [];

// Ініціалізація timesync
const ts = timesync.create({
    server: '/timesync',
    repeat: 0
});

// Подія синхронізації
ts.on('sync', function () {
    if (typeof ts.offset !== 'number' || isNaN(ts.offset)) {
        console.error("Помилка: timesync повернув NaN!");
        document.getElementById('syncError').innerText = `Помилка: timesync повернув NaN!`;
        document.getElementById('syncError').className = 'status-box error-box';
        return;
    }

    const error = Math.abs(offset - ts.offset);
    console.log("Похибка методу:", error);

    document.getElementById('syncError').innerText = `Похибка методу: ${error.toFixed(2)} мс`;
    document.getElementById('syncError').className = 'status-box error-box';
});

// Отримання статистики
function fetchData() {
    try {
        const stats = calculateStats(arr_offsets);
        document.getElementById('output').innerHTML = formatStats(stats);
    } catch (error) {
        document.getElementById('output').innerHTML = '<div class="metric-card"><div class="metric-title">Помилка</div><div class="metric-value">0</div></div>';
        console.error('Помилка:', error);
    }
}

// Функція для синхронізації часу
async function syncTime() {
    try {
        const start = performance.now();
        const response = await fetch('/time', { method: 'GET' });
        const end = performance.now();

        if (!response.ok) throw new Error(`HTTP помилка: ${response.status}`);

        const { result: serverTime } = await response.json();
        const roundTripTime = end - start;
        const estimatedClientTime = serverTime + roundTripTime / 2;
        offset = estimatedClientTime - Date.now();

        if (arr_offsets.length > 100) arr_offsets = [];
        arr_offsets.push(offset);

        ts.sync();

        document.getElementById('timeOutput').innerText = `Поточна поправка часу: ${offset.toFixed(2)} мс`;
        document.getElementById('timeOutput').className = 'status-box';
        fetchData();

        await new Promise(resolve => setTimeout(resolve, 1000));
        syncTime();
    } catch (error) {
        document.getElementById('timeOutput').innerText = 'Помилка синхронізації';
        document.getElementById('timeOutput').className = 'status-box error-box';
        console.error('Помилка:', error);
    }
}

// Обчислення статистичних показників
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

// Пошук моди (найчастішого значення)
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

// Форматування статистики для виводу
function formatStats(stats) {
    if (arr_offsets.length === 0) {
        return `
            <div class="metric-card">
                <div class="metric-title">Немає даних</div>
                <div class="metric-value">0</div>
                <span class="metric-unit">мс</span>
            </div>
        `;
    }
    
    return `
        <div class="metric-card">
            <div class="metric-title">Кількість вимірів</div>
            <div class="metric-value">${arr_offsets.length}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">Поточна поправка</div>
            <div class="metric-value">${offset.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
        <div class="metric-card">
            <div class="metric-title">Мінімум</div>
            <div class="metric-value">${stats.min.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
        <div class="metric-card">
            <div class="metric-title">Q1</div>
            <div class="metric-value">${stats.q1.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
        <div class="metric-card">
            <div class="metric-title">Медіана</div>
            <div class="metric-value">${stats.median.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
        <div class="metric-card">
            <div class="metric-title">Середнє</div>
            <div class="metric-value">${stats.avg.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
        <div class="metric-card">
            <div class="metric-title">Мода</div>
            <div class="metric-value">${stats.mode.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
        <div class="metric-card">
            <div class="metric-title">Q3</div>
            <div class="metric-value">${stats.q3.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
        <div class="metric-card">
            <div class="metric-title">Максимум</div>
            <div class="metric-value">${stats.max.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
        <div class="metric-card">
            <div class="metric-title">Стандартне відхилення</div>
            <div class="metric-value">${stats.stddev.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
        <div class="metric-card">
            <div class="metric-title">IQR</div>
            <div class="metric-value">${stats.iqr.toFixed(2)}</div>
            <span class="metric-unit">мс</span>
        </div>
    `;
}

// Ініціалізація інтерфейсу
document.addEventListener('DOMContentLoaded', function() {
    fetchData();
});