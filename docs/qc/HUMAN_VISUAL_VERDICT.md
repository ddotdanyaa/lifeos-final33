# Human Visual Verdict

Дата: 2026-06-27

## Короткий вердикт

Интерфейс больше не выглядит как внутренняя audit/admin-панель на первом экране. Home стал chat-first: один главный ввод, один человеческий ответ LifeOS и одна основная кнопка. Product Brain, ledger/evidence/release-state и provider passports убраны из обычного пользовательского слоя и доступны только в разрешённых местах: Control Dev State, Graph filter/dev context и Chat `/dev`.

## Проверка глазами

1. Это выглядит как продукт или как админка?  
   Продукт. Остались рабочие шероховатости в плотных местах Graph/Control, но первый экран больше не cockpit.

2. Новый пользователь поймёт за 5 секунд, куда писать?  
   Да. Центр экрана занят вопросом “Что добавить в LifeOS?” и большим полем ввода.

3. Есть ли одна главная кнопка?  
   Да. Для простого ввода видна одна primary-кнопка, вторичные действия не равны ей по весу.

4. Нет ли wall of cards?  
   На Home нет. Workspaces используют разные поверхности: calendar grid, finance dashboard, reader surface, player surface, flow canvas, graph canvas.

5. Нет ли Product Brain в обычном UI?  
   Нет на Home/Today/Calendar/Finance/Reader/Player/Chat/Agents. Он спрятан в Control Dev State и Graph dev context.

6. Каждая страница визуально отличается?  
   Да. Calendar, Finance, Reader, Player, Chat, Agents/Flows, Graph и Control имеют разные root layouts и разные рабочие сценарии.

7. Chat похож на чат?  
   Да. Chat начинается с conversation thread, active artifact context и локального deterministic ответа без Ollama.

8. Flow похож на canvas?  
   Да. Agents/Flows показывает Trigger -> Condition -> Action -> Approval -> Audit и dry-run history.

9. Graph похож на workspace?  
   Да. Graph занимает тёмный canvas, имеет фильтры, global/local mode, search, inspector и edge reasons.

10. Calendar похож на календарь?  
    Да. Есть time grid, agenda strip, unscheduled bucket и overload/status detector.

11. Finance похож на деньги?  
    Да. Есть баланс, расходы, счета, операции, категории, подписки и сценарий скрина чека.

12. Reader похож на чтение?  
    Да. Есть reading surface, progress, highlights, notes и честный форматный fallback.

13. Player похож на плеер?  
    Да. Есть audio cards, controls, transcript editor, checkpoints и ручной STT fallback.

## Оставшиеся внешние границы

- Ollama: реальная модель зависит от локального `localhost:11434`; UI даёт probe/model list и proposal-only flow.
- OCR/STT/PDF/EPUB/Gmail/external calendar: без владельческих ключей/локальных движков работают честные setup states и ручные fallback flows.
- GitHub Pages может требовать public repo/hosting settings; local `public-demo/` build уже создаётся без пользовательских данных.
