// Конфигурация API.
// В продакшене укажи адрес бэкенда через переменную окружения при сборке:
//   EXPO_PUBLIC_API_URL=https://api.твойдомен.ru
// Для локальной разработки: эмулятор Android -> 10.0.2.2 (компьютер внутри эмулятора),
// реальный телефон -> IP компьютера в локальной сети (ipconfig).
const DEFAULT_URL = "http://10.0.2.2:8020";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;
