const HISTORY_SIZE = 100;
const history: any[] = [];

export function addToHistory(record: any) {
    history.unshift(record);
    if (history.length > HISTORY_SIZE) {
        history.pop();
    }
}

export function getHistory() {
    return history;
}

export function clearHistory() {
    history.length = 0;
}
