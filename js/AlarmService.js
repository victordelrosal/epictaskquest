export class AlarmService {
    constructor() {
        this.alarms = new Map();
        this.initializeNotifications();
    }

    async initializeNotifications() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
        }
    }

    parseAlarmPattern(text) {
        const standardMatch = text.match(/!(\d{2})(\d{2})(\d{2})(\d{2})/);
        const simpleMatch = text.match(/!(\d{2})(\d{2})/);

        if (standardMatch) {
            const [_, day, month, hours, minutes] = standardMatch;
            return this.createAlarmDate(day, month, hours, minutes);
        } else if (simpleMatch) {
            const [_, hours, minutes] = simpleMatch;
            return this.createSimpleAlarmDate(hours, minutes);
        }
        return null;
    }

    createAlarmDate(day, month, hours, minutes) {
        const now = new Date();
        let alarmDate = new Date(
            now.getFullYear(),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes)
        );

        // If date has passed, set for next year
        if (alarmDate < now) {
            alarmDate.setFullYear(alarmDate.getFullYear() + 1);
        }

        return this.validateAlarmDate(alarmDate) ? alarmDate : null;
    }

    createSimpleAlarmDate(hours, minutes) {
        const now = new Date();
        let alarmDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            parseInt(hours),
            parseInt(minutes)
        );

        // If time has passed today, set for tomorrow
        if (alarmDate < now) {
            alarmDate.setDate(alarmDate.getDate() + 1);
        }

        return this.validateAlarmDate(alarmDate) ? alarmDate : null;
    }

    validateAlarmDate(date) {
        if (!(date instanceof Date) || isNaN(date)) return false;
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
    }

    scheduleAlarm(taskId, taskText, alarmDate) {
        if (!alarmDate || alarmDate < new Date()) return null;

        const timeoutId = setTimeout(() => {
            this.triggerAlarm(taskText);
        }, alarmDate.getTime() - Date.now());

        const alarm = {
            id: taskId,
            text: taskText,
            date: alarmDate,
            timeoutId
        };

        this.alarms.set(taskId, alarm);
        this.persistAlarms();
        return alarm;
    }

    async triggerAlarm(taskText) {
        // Visual notification
        if (Notification.permission === 'granted') {
            new Notification('Task Reminder', {
                body: taskText,
                icon: '/icon.png',
                requireInteraction: true
            });
        }

        // Audio notification
        const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAsAABIAAEBAwUHBwkLDQ0PERMVFRcZGx0dHyEjJSUnKSstLS8xMzU1Nzk7PT0/QUNGR0hKTE5OUFJUVlZYWlxeXmBiZGZmaGpsb29xc3V3d3l7fX9/gYOFh4eJi42NjpCSlJSWmJqcnJ6goqSkpqisrq6ws7W1t7m7vb2/wcPFxcfJy83Nz9HT1dXX2dzd3d/h4+Xl5+nr7e3v8fP19ff5+/39AAAAOUxBTUUzLjEwMACwBQAAKwkgJCHhABYAAAFYAAAAAUpTdGVyZW8AAA8AAAADAAAEAAABAAAAAAA=');
        await audio.play().catch(console.error);

        // Show overlay
        this.showAlarmOverlay(taskText);
    }

    showAlarmOverlay(taskText) {
        const overlay = document.createElement('div');
        overlay.className = 'alarm-overlay';
        overlay.innerHTML = `
            <div class="alarm-message">
                <div class="alarm-title">⏰ Task Reminder</div>
                <div class="alarm-text">${taskText}</div>
                <button class="alarm-dismiss">Dismiss</button>
            </div>
        `;

        document.body.appendChild(overlay);
        
        overlay.querySelector('.alarm-dismiss').addEventListener('click', () => {
            overlay.remove();
        });
    }

    persistAlarms() {
        const alarmData = Array.from(this.alarms.values()).map(alarm => ({
            id: alarm.id,
            text: alarm.text,
            date: alarm.date.getTime()
        }));
        localStorage.setItem('alarms', JSON.stringify(alarmData));
    }

    restoreAlarms() {
        try {
            const saved = localStorage.getItem('alarms');
            if (!saved) return;

            const alarmData = JSON.parse(saved);
            alarmData.forEach(data => {
                const alarmDate = new Date(data.date);
                if (alarmDate > new Date()) {
                    this.scheduleAlarm(data.id, data.text, alarmDate);
                }
            });
        } catch (error) {
            console.error('Error restoring alarms:', error);
        }
    }

    clearAlarm(taskId) {
        const alarm = this.alarms.get(taskId);
        if (alarm) {
            clearTimeout(alarm.timeoutId);
            this.alarms.delete(taskId);
            this.persistAlarms();
        }
    }
}
