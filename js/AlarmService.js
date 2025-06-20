export class AlarmService {
    constructor() {
        this.alarms = new Map();
        this.alarmSound = new Audio('alert.mp3'); // Use the local alert.mp3 file
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
        const simpleMatch = text.match(/!(\d{2}):?(\d{2})/);

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
        const alarmTime = alarmDate.getTime();
        const now = Date.now();
        const delay = alarmTime - now;

        if (delay > 0) {
            const timeoutId = setTimeout(() => {
                this.triggerAlarm(taskText);
            }, delay);

            this.alarms.set(taskId, { timeoutId, alarmTime });
        }
    }

    async triggerAlarm(taskText) {
        // Play alarm sound immediately
        this.alarmSound.play().catch(error => {
            console.error('Error playing alarm sound:', error);
        });

        // Make window pulse
        document.body.classList.add('alarm-overlay');
        setTimeout(() => {
            document.body.classList.remove('alarm-overlay');
        }, 3000); // Pulse duration

        // Show alert
        alert(`Alarm for task: ${taskText}`);

        // Visual notification
        if (Notification.permission === 'granted') {
            new Notification('Task Reminder', {
                body: taskText,
                icon: '/icon.png',
                requireInteraction: true
            });
        }

        // Show overlay
        this.showAlarmOverlay(taskText);

        // Make browser tab blink
        this.blinkTabTitle();
    }

    blinkTabTitle() {
        const originalTitle = document.title;
        let blinkInterval = setInterval(() => {
            document.title = document.title === '🚨 Alarm! 🚨' ? originalTitle : '🚨 Alarm! 🚨';
        }, 1000);

        // Stop blinking after 10 seconds
        setTimeout(() => {
            clearInterval(blinkInterval);
            document.title = originalTitle;
        }, 10000);
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
