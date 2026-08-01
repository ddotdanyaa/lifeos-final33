// tools/audit-liveness.mjs — ПЕРЕПИСЬ ЖИВОГО.
//
// Владелец 2026-07-30: «до сих пор весь сайт какой-то странный, не работает… очень много лишних
// кнопок, нажимаешь — ничего не работает, нажимаешь — никуда не проваливаешься».
//
// Это не оценка вкуса — это ОТСУТСТВИЕ КАРТЫ. Ни владелец, ни я, ни 40 аудитов, ни 149 спек не
// могут сказать, какие из 30 экранов работают. Доказательство: строка «Найти» не искала вообще,
// и все 189 проверок были при этом зелёными, потому что они проверяют НАЛИЧИЕ элемента, а не
// его ЭФФЕКТ.
//
// Этот аудит проверяет эффект. Для каждого экрана он открывает его, находит все интерактивные
// контролы с `data-testid`, нажимает каждый и смотрит, изменилось ли хоть что-нибудь: разметка,
// адрес, активный экран. Контрол, после которого не меняется ничего, — мёртвый, и он получает имя.
//
// Дисциплина взята из скилла `doubt-driven-development` (Addy Osmani, MIT): проверяющий должен
// быть настроен ОПРОВЕРГАТЬ. Поэтому по умолчанию контрол считается мёртвым, и только доказанное
// изменение переводит его в живые.
//
// Аудит ничего не чинит и ничего не коммитит. Он делает карту.
import { chromium } from "@playwright/test";
import { writeFileSync, readFileSync } from "node:fs";

const APP = process.env.LIFEOS_URL || "http://127.0.0.1:4173";
const REPORT = "docs/LIVENESS.md";
const VIEWPORT = { width: 1440, height: 1000 };
// Сколько контролов одного экрана меряем. Потолок держит время прогона конечным; экранов с
// бо́льшим числом кнопок сейчас нет, кроме «Провайдеров» (25).
const PER_SURFACE_LIMIT = 40;

// ОБРАТНАЯ ПРОВЕРКА ПРИБОРА. Прибор, который никого не ловит, выглядит точно так же, как прибор,
// у которого всё хорошо. Отличить их можно только одним способом: подсунуть заведомо мёртвую
// кнопку и убедиться, что он её назовёт.
//
//   LIFEOS_LIVENESS_MUTANT="widget-down,graph-zoom-in" node tools/audit-liveness.mjs capture graph
//
// Перечисленные контролы теряют обработчик: клик по ним гасится в фазе перехвата, до того как до
// него доберётся приложение. Продукт при этом НЕ ТРОГАЕТСЯ — порча живёт только в этом прогоне.
// Прибор обязан назвать их мёртвыми; если он назовёт их живыми — врёт он, а не продукт.
const MUTANTS = (process.env.LIFEOS_LIVENESS_MUTANT || "").split(",").map((s) => s.trim()).filter(Boolean);

function swallowClicks(ids) {
  const swallow = (event) => {
    const el = event.target && event.target.closest ? event.target.closest("[data-testid]") : null;
    if (el && ids.includes(el.getAttribute("data-testid"))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  };
  window.addEventListener("click", swallow, true);
  document.addEventListener("click", swallow, true);
}

// Каждый сеанс — свой контекст браузера: чистое IndexedDB, чистый localStorage, чистая страница.
async function openSession(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  if (MUTANTS.length) await context.addInitScript(swallowClicks, MUTANTS);
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-action="set-surface"]', { timeout: 30000 });
  return { context, page };
}

// Экраны берём из навигации самого продукта, а не из списка в голове: список в голове устаревает
// молча, а навигация — это то, что владелец реально видит.
async function surfacesFrom(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-action="set-surface"]')]
      .map((el) => el.getAttribute("data-id"))
      .filter((id, index, all) => id && all.indexOf(id) === index)
  );
}

// Отпечаток экрана. Берём разметку главной области, активный экран и адрес: любого из трёх
// изменения достаточно, чтобы признать контрол живым.
async function fingerprint(page) {
  return page.evaluate(() => {
    const hashOf = (text) => {
      let sum = 0;
      for (let i = 0; i < text.length; i += 1) sum = (sum * 31 + text.charCodeAt(i)) >>> 0;
      return sum;
    };
    const main = document.querySelector("main") || document.body;
    // Третья ошибка прибора (2026-07-30): отпечаток снимался только с `main.innerHTML`. Из-за
    // этого кнопки графа `graph-zoom-in/out/fit/reheat` считались мёртвыми — они меняют ПИКСЕЛИ
    // холста, а пиксели в HTML не попадают. Теперь холсты меряются отдельно.
    let canvasSum = 0;
    for (const canvas of document.querySelectorAll("canvas")) {
      try {
        canvasSum = (canvasSum + hashOf(canvas.toDataURL().slice(0, 4096)) + canvas.width + canvas.height) >>> 0;
      } catch {
        canvasSum = (canvasSum + canvas.width + canvas.height) >>> 0;
      }
    }
    // Четвёртая: тосты, диалоги и подтверждения живут ВНЕ `main`. Кнопка, которая показывает
    // «Сохранено», меняла только тело документа — и тоже считалась мёртвой.
    const outside = document.body.querySelectorAll("dialog[open], [role='status'], [role='alert'], .human-toast, .toast");
    return {
      hash: hashOf(main.innerHTML),
      canvas: canvasSum,
      outside: outside.length + hashOf([...outside].map((el) => el.textContent || "").join("|")),
      nodes: document.body.getElementsByTagName("*").length,
      surface: document.querySelector("[data-active-surface]")?.getAttribute("data-active-surface") || "",
      url: location.hash + location.search
    };
  });
}

function changed(before, after) {
  return before.hash !== after.hash
    || before.canvas !== after.canvas
    || before.outside !== after.outside
    || before.nodes !== after.nodes
    || before.surface !== after.surface
    || before.url !== after.url;
}

// ОДИННАДЦАТАЯ ошибка прибора (2026-07-31). Он ни разу не спросил, стоит ли экран на месте САМ ПО
// СЕБЕ. А экраны стоят не всегда: граф после открытия ещё пять секунд раскладывает узлы (меняются
// пиксели холста), а статусная строка на десятке экранов гаснет примерно через полторы секунды
// после открытия. Пустой замер это показал: на графе отпечаток менялся каждые 350 мс БЕЗ единого
// клика. На таком экране «после клика что-то изменилось» не доказывает ничего — живым становится
// что угодно, включая кнопку без обработчика.
//
// Поэтому перед каждым замером ждём тишины: два одинаковых отпечатка подряд. Не дождались — замер
// не засчитывается ни в живые, ни в мёртвые: «неустойчив» честнее, чем «жив» наугад.
//
// Потолок в шесть секунд выбран замером, а не на глаз: спокойные экраны укладываются в 310 мс
// (один отсчёт), граф после перекладки узлов — в 4,8 с. Потолок в 1,8 с делал одиннадцать кнопок
// графа «неустойчивыми», то есть неизмеренными.
async function settle(page, cap = 6000, sample = 300) {
  let previous = await fingerprint(page);
  for (let waited = 0; waited < cap; waited += sample) {
    await page.waitForTimeout(sample);
    const now = await fingerprint(page);
    if (!changed(previous, now)) return true;
    previous = now;
  }
  return false;
}

const activeSurface = (page) =>
  page.evaluate(() => document.querySelector("[data-active-surface]")?.getAttribute("data-active-surface") || "");

// ДВЕНАДЦАТАЯ ошибка прибора (2026-08-01) — и первая, из-за которой он врал В ОБЕ стороны.
//
// Перепись открывала экран один раз и нажимала все его кнопки ПОДРЯД, на одной странице. Значит
// каждый следующий контрол мерился из состояния, которое ему оставили предыдущие:
//
//   • ложная смерть: `widget-down` на «Захвате» двигает виджет вниз, но к своей очереди виджет уже
//     стоял внизу — двигать некуда, разметка не менялась, кнопка объявлялась мёртвой. Прямой замер
//     в браузере показал обратное: 11 087 → 11 054 символа, кнопка живая. То же с `note-row`;
//   • ложная жизнь: `focus-v34-node` на «Маркетплейсе» один прогон называл живым, другой — мёртвым;
//   • ложный охват: одному и тому же экрану два соседних прогона насчитывали то 3 контрола, то 13
//     (`builder`), то 13, то 3 (`projects`) — потому что видимость кнопок тоже зависела от того,
//     что успели нажать до них.
//
// Прибор с такими числами не измеряет продукт, он измеряет порядок обхода. Храповик
// `docs/LIVENESS_BASELINE.json` брал минимум по прогонам и после первой же удачной случайности
// краснел навсегда.
//
// Девятая попытка лечения (очная ставка в свежем браузере с ПУСТЫМ хранилищем) промахивалась:
// пустое хранилище — это не то же состояние, в котором шёл замер, там половины контролов просто
// нет на экране. Обвинение снималось наугад, а часть экранов теряла охват.
//
// Лечение здесь другое и прямое: у каждого экрана есть СЕМЯ — снимок хранилища, снятый в тот
// момент, когда экран открылся. Перед КАЖДЫМ контролом семя восстанавливается и страница
// перезагружается. Все контролы одного экрана меряются из одного и того же состояния, и оно
// одинаково от прогона к прогону.
const SNAPSHOT_DB = "lifeos-liveness-snapshot";

// Снимок живёт ВНУТРИ браузера. Наружу, в Node, записи не выносятся: в хранилище лежат Blob'ы
// медиатеки и упакованные `fflate` куски, и любая передача через протокол их бы испортила.
// Структурное клонирование из базы продукта в служебную базу и обратно переносит их как есть.
async function captureState(page, slot) {
  return page.evaluate(async ([snapshotDb, key]) => {
    const request = (req) => new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const openDb = (name, makeSlots) => new Promise((resolve, reject) => {
      const req = makeSlots ? indexedDB.open(name, 1) : indexedDB.open(name);
      req.onupgradeneeded = () => {
        if (makeSlots && !req.result.objectStoreNames.contains("slots")) req.result.createObjectStore("slots");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const names = (await indexedDB.databases()).map((info) => info.name).filter((name) => name && name !== snapshotDb);
    const dump = [];
    for (const name of names) {
      const db = await openDb(name, false);
      for (const store of [...db.objectStoreNames]) {
        const objectStore = db.transaction(store, "readonly").objectStore(store);
        dump.push({
          db: name,
          store,
          keyPath: objectStore.keyPath,
          rows: await request(objectStore.getAll()),
          keys: await request(objectStore.getAllKeys())
        });
      }
      db.close();
    }
    const local = {};
    for (const name of Object.keys(localStorage)) local[name] = localStorage.getItem(name);
    const snapshot = await openDb(snapshotDb, true);
    await request(snapshot.transaction("slots", "readwrite").objectStore("slots").put({ dump, local }, key));
    snapshot.close();
    return dump.reduce((sum, part) => sum + part.rows.length, 0);
  }, [SNAPSHOT_DB, slot]);
}

async function restoreState(page, slot) {
  return page.evaluate(async ([snapshotDb, key]) => {
    const request = (req) => new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const openDb = (name, makeSlots) => new Promise((resolve, reject) => {
      const req = makeSlots ? indexedDB.open(name, 1) : indexedDB.open(name);
      req.onupgradeneeded = () => {
        if (makeSlots && !req.result.objectStoreNames.contains("slots")) req.result.createObjectStore("slots");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const snapshot = await openDb(snapshotDb, true);
    const saved = await request(snapshot.transaction("slots", "readonly").objectStore("slots").get(key));
    snapshot.close();
    if (!saved) return false;
    for (const part of saved.dump) {
      const db = await openDb(part.db, false);
      if (!db.objectStoreNames.contains(part.store)) {
        db.close();
        continue;
      }
      const tx = db.transaction(part.store, "readwrite");
      const objectStore = tx.objectStore(part.store);
      objectStore.clear();
      for (let index = 0; index < part.rows.length; index += 1) {
        if (part.keyPath) objectStore.put(part.rows[index]);
        else objectStore.put(part.rows[index], part.keys[index]);
      }
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    }
    localStorage.clear();
    for (const [name, value] of Object.entries(saved.local)) localStorage.setItem(name, value);
    return true;
  }, [SNAPSHOT_DB, slot]).catch(() => false);
}

// Вернуть экран в состояние семени: восстановить хранилище, перезагрузить страницу (в памяти
// приложения тоже живёт состояние — без перезагрузки оно переживёт подмену) и снова открыть экран.
//
// Возврат не удался — замера НЕ БУДЕТ. Молча померить из чужого состояния значит вернуться ровно
// к той болезни, ради которой всё это написано, поэтому неудача возвращается наверх и портит
// числа экрана целиком, а не прячется в «ноль мёртвых».
async function resetToSeed(page, slot, surface) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await restoreState(page, slot)) {
      await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
      const booted = await page.waitForSelector('[data-action="set-surface"]', { timeout: 30000 }).then(() => true).catch(() => false);
      if (booted) {
        const how = await openSurface(page, surface);
        if (how) return how;
      }
    }
    await page.goto(APP, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForSelector('[data-action="set-surface"]', { timeout: 30000 }).catch(() => {});
  }
  return "";
}

// ДЕСЯТАЯ ошибка прибора (2026-07-31), и самая дорогая. Открытие экрана делалось так:
// `locator(...).first().click().catch(() => {})` — то есть первым попавшимся элементом с нужным
// `data-id` и с проглатыванием любой ошибки. А первый попавшийся — не всегда тот: у `habits` это
// карточка на домашнем экране, у десяти «черновых» экранов — кнопка мобильного меню размером 0×0,
// по которой на десктопе нельзя кликнуть в принципе. Клик падал по таймауту, ошибка глоталась,
// прибор оставался на ПРЕДЫДУЩЕМ экране и переписывал его повторно.
//
// Так восемь экранов из двадцати шести (`habits`, `screen`, `projects`, `marketplace`, `builder`,
// `databases`, `design`, `smart-home`) ни разу не были открыты, а в карте у них стояли чужие
// цифры. Гейт при этом был доволен: числа-то были.
//
// Теперь: перебираем ВСЕХ кандидатов, раскрываем свёрнутых предков, а главное — ПРОВЕРЯЕМ по
// `data-active-surface`, что экран действительно сменился. Не сменился — это не «ноль мёртвых»,
// это отказ измерения, и он должен быть виден.
async function openSurface(page, id, mayStay = true) {
  // После восстановления семени приложение просыпается уже на нужном экране: тогда открывать
  // нечего, и лишний клик по пункту меню только испортил бы состояние. В первый раз экран так
  // не засчитываем: иначе экран, до которого мышью не дойти, тихо получил бы отметку «клик».
  if (mayStay && (await activeSurface(page).catch(() => "")) === id) return "клик";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const handles = await page.locator(`[data-action="set-surface"][data-id="${id}"]`).elementHandles();
    for (const handle of handles) {
      await page.evaluate((el) => {
        for (let node = el.parentElement; node; node = node.parentElement) if (node.tagName === "DETAILS") node.open = true;
        el.scrollIntoView({ block: "center" });
      }, handle).catch(() => {});
      const landed = () =>
        page
          .waitForFunction((want) => document.querySelector("[data-active-surface]")?.getAttribute("data-active-surface") === want, id, { timeout: 2000 })
          .then(() => true)
          .catch(() => false);
      // Сначала как человек — настоящим кликом. Не вышло (кнопка скрыта, нулевого размера или
      // перекрыта) — зовём обработчик напрямую и ЗАПОМИНАЕМ это: экран измерен, но мышью до него
      // не дойти, и владелец должен узнать про это отдельной строкой, а не из тишины.
      if (await handle.boundingBox().catch(() => null)) {
        await handle.click({ timeout: 2000 }).catch(() => {});
        if (await landed()) return "клик";
      }
      await page.evaluate((el) => el.click(), handle).catch(() => {});
      if (await landed()) return "программно";
    }
    // Вход на экран может жить только на стартовом (у `habits` это карточка домашнего экрана).
    // Возвращаемся туда и пробуем ещё раз — но ровно один раз, чтобы не крутиться вечно.
    if (attempt === 0) {
      await page.goto(APP, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForSelector('[data-action="set-surface"]', { timeout: 30000 }).catch(() => {});
    }
  }
  return "";
}

// Контролы, которые трогать нельзя: они уводят со страницы, стирают данные или открывают
// системный диалог — после них перепись пришлось бы начинать заново.
const SKIP = /(archive|delete|remove|clear|reset|wipe|export|import-file|import-audio|logout|theme-toggle|install)/i;

// Пятая и шестая ошибки прибора. Кнопка может «ничего не менять» по трём совершенно разным
// причинам, и валить их в одну кучу — это и есть враньё измерения:
//
//   • ОТКРЫВАЕТ СИСТЕМНЫЙ ДИАЛОГ — выбор файла, запрос микрофона. Браузер в headless их закрывает,
//     разметка не меняется. Проверить автоматически нельзя ВООБЩЕ — это не смерть, это слепая зона.
//   • ТРЕБУЕТ ВНЕШНЕЙ СЛУЖБЫ — Ollama, whisper.cpp, почта. Служба не запущена → честный отказ без
//     видимого следа. Это не дефект продукта, это состояние среды.
//   • ДЕЙСТВИТЕЛЬНО НИЧЕГО НЕ ДЕЛАЕТ — вот только это дефект.
//
// Первый прогон смешал все три и дал 59 «мёртвых» вместо примерно восьми.
const BLIND = /(import|upload|record|photo|camera|microphone|scan|pick|choose-file)/i;
const EXTERNAL = /(probe|prepare-provider|prepare-whisper|prepare-vosk|prepare-mail|test-provider|build-semantic-index|ollama|whispercpp|semantic)/i;

function classify(testId, didChange) {
  if (didChange) return "alive";
  if (BLIND.test(testId)) return "blind";
  if (EXTERNAL.test(testId)) return "external";
  return "dead";
}

// Первый прогон дал 38% мёртвых — и это оказалось неправдой ПРИБОРА, а не продукта. Экраны
// «Деньги», «Чтение» и «Цели» показали 100% смерти, потому что их кнопки (`add-finance`,
// `add-task`, `add-goal-entry`) читают соседнее поле ввода: при пустом поле обработчик честно
// ничего не делает, и разметка не меняется. Мерить так — значит объявить мёртвым работающий код.
//
// Поэтому перед нажатием «добавляющих» контролов заполняем поля рядом. Это ровно то, что делает
// человек, и только после этого нажатие что-то значит. Дисциплина из `doubt-driven-development`:
// прибор обязан доказывать не меньше, чем продукт.
const NEEDS_INPUT = /^(add|set|save|update|create|apply|run|probe|prepare|recognize|link|merge)-/i;

async function fillNearbyInputs(page, testId) {
  return page.evaluate((id) => {
    const control = document.querySelector(`[data-testid="${id}"]`);
    if (!control) return 0;
    const scope = control.closest("section, form, .card, article, div");
    if (!scope) return 0;
    let filled = 0;
    for (const field of scope.querySelectorAll("input, textarea, select")) {
      if (field.disabled || field.type === "hidden" || field.value) continue;
      if (field.tagName === "SELECT") {
        if (field.options.length > 1) { field.selectedIndex = 1; filled += 1; }
      } else if (field.type === "number") {
        field.value = "100"; filled += 1;
      } else if (field.type === "date") {
        field.value = new Date().toISOString().slice(0, 10); filled += 1;
      } else if (field.type === "time") {
        field.value = "12:30"; filled += 1;
      } else if (field.type === "checkbox" || field.type === "radio") {
        continue;
      } else {
        field.value = "проверка живости"; filled += 1;
      }
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return filled;
  }, testId);
}

// Все контролы экрана — включая те, которых сейчас не видно: их отсутствие на глазах тоже число,
// и оно попадает в отчёт отдельной строкой «до контрола не добрались».
const controlsOf = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("main [data-testid]")]
      .filter((el) => el.tagName === "BUTTON" || el.getAttribute("role") === "button")
      .map((el) => el.getAttribute("data-testid"))
      .filter((v, i, all) => v && all.indexOf(v) === i)
  );

// Контролы, по которым прямо сейчас можно кликнуть. Разница с `controlsOf` — ровно та, из-за
// которой на «Захвате» шестнадцать кнопок из тридцати не мерились: они есть в разметке, но
// показываются только после нажатия соседа.
const visibleControls = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("main [data-testid]")]
      .filter((el) => el.tagName === "BUTTON" || el.getAttribute("role") === "button")
      .filter((el) => !el.disabled && el.getClientRects().length > 0)
      .map((el) => el.getAttribute("data-testid"))
      .filter((v, i, all) => v && all.indexOf(v) === i)
  );

// Один замер одного контрола. Возвращает `reachable: false`, если до контрола не добрались —
// это НЕ приговор, а отсутствие замера, и путать их нельзя.
async function measureControl(page, testId) {
  const control = page.getByTestId(testId).first();
  if (!(await control.isVisible().catch(() => false))) return { reachable: false, why: "невидим" };
  if (await control.isDisabled().catch(() => false)) return { reachable: false, why: "выключен" };
  // Заполняем ПЕРЕД снятием отпечатка: само заполнение меняет разметку, и если снять отпечаток
  // после него, изменение от заполнения зачтётся кнопке. Тогда прибор объявил бы живым что угодно.
  if (NEEDS_INPUT.test(testId)) await fillNearbyInputs(page, testId);
  const quiet = await settle(page);
  const before = await fingerprint(page);
  await control.click({ timeout: 4000 }).catch(() => {});
  // Седьмая ошибка: 320 мс. Часть обработчиков пишет в IndexedDB и перерисовывает экран уже
  // после этого срока — они успевали «умереть» до собственного ответа. Меряем дважды: сразу и
  // через секунду, и засчитываем изменение по любому из двух замеров.
  await page.waitForTimeout(350);
  let after = await fingerprint(page);
  if (!changed(before, after)) {
    await page.waitForTimeout(1200);
    after = await fingerprint(page);
  }
  return { reachable: true, quiet, alive: changed(before, after), before, after };
}

// РАЗВЕДКА. Первый проход по экрану ничего не судит: он собирает список контролов и — главное —
// ПУТЬ ПОКАЗА для тех, кого на свежем экране не видно. Путь это рецепт: «восстанови семя, нажми
// вот эти кнопки по порядку — и контрол появится». Рецепт записан, значит воспроизводим, значит
// от прогона к прогону охват один и тот же.
//
// Полная изоляция без такого рецепта сделала бы прибор быстрее на язык и слепее на глаз: треть
// кнопок «Захвата» показывается только после нажатия соседей, и без разведки они бы просто
// исчезли из переписи.
async function exploreSurface(page, id) {
  const paths = new Map();
  const queue = [];
  for (const testId of await visibleControls(page)) {
    paths.set(testId, []);
    queue.push(testId);
  }
  let clicks = 0;
  for (let index = 0; index < queue.length && clicks < PER_SURFACE_LIMIT; index += 1) {
    const testId = queue[index];
    if (SKIP.test(testId)) continue;
    const control = page.getByTestId(testId).first();
    if (!(await control.isVisible().catch(() => false))) continue;
    const seen = new Set(await visibleControls(page));
    await control.click({ timeout: 2000 }).catch(() => {});
    clicks += 1;
    await page.waitForTimeout(300);
    // Клик мог увести на другой экран: разведка продолжается только здесь.
    if ((await activeSurface(page)) !== id && !(await openSurface(page, id))) break;
    for (const appeared of await visibleControls(page)) {
      if (seen.has(appeared) || paths.has(appeared)) continue;
      paths.set(appeared, [...paths.get(testId), testId]);
      queue.push(appeared);
    }
  }
  // Контролы, которые есть в разметке, но так и не показались: путь у них неизвестен, и это
  // честно попадёт в «до контрола не добрались», а не в «мёртв».
  const all = await controlsOf(page);
  const order = [...new Set([...all, ...paths.keys()])].slice(0, PER_SURFACE_LIMIT);
  // Состояние ПОСЛЕ разведки — с данными, которые она успела наделать. Оно достаётся следующему
  // экрану вместо пустого профиля: половина списков и карточек продукта показывается только при
  // непустых данных, и без этого наследства перепись видела бы заметно меньше кнопок, чем есть.
  await captureState(page, id + "::explored").catch(() => {});
  return { order, paths };
}

// ПРИГОВОР. Контрол меряется из семени экрана: хранилище восстановлено, страница перезагружена,
// экран открыт заново, путь показа воспроизведён. Дальше — обычный замер.
async function judgeControl(page, surface, testId, path) {
  if (!(await resetToSeed(page, surface, surface))) return { reachable: false, reset: false, why: "экран не вернулся к семени" };
  for (const step of path) {
    const opener = page.getByTestId(step).first();
    if (!(await opener.isVisible().catch(() => false))) return { reachable: false, why: "путь показа не повторился" };
    await opener.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    if ((await activeSurface(page)) !== surface && !(await openSurface(page, surface))) {
      return { reachable: false, why: "путь показа увёл с экрана" };
    }
  }
  return measureControl(page, testId);
}

async function censusSurface(page, id) {
  const how = await openSurface(page, id, false);
  const row = { id, how, alive: [], dead: [], blind: [], external: [], unstable: [], skipped: [], prepared: [], flaky: [], order: [] };
  if (!how) {
    row.error = "экран не открылся";
    return row;
  }
  await settle(page, 6000, 300);
  // Семя экрана: состояние, из которого будет мериться КАЖДЫЙ его контрол.
  if (!(await captureState(page, id).then(() => true).catch(() => false))) {
    row.error = "не снялся снимок состояния";
    return row;
  }
  const { order, paths } = await exploreSurface(page, id);
  row.order = order;
  for (const testId of order) {
    if (SKIP.test(testId)) continue;
    const path = paths.get(testId) || [];
    let measured = await judgeControl(page, id, testId, path);
    if (measured.reset === false) {
      // Сломался сам механизм возврата к семени. Тогда неизвестно НИЧЕГО об этом экране: ни
      // сколько тут мёртвых, ни сколько живых. Экран уходит в «без измерения», и его прежние
      // числа в карте остаются нетронутыми — иначе поломка прибора выглядела бы как здоровье.
      row.error = "не удалось вернуть экран к семени перед " + testId;
      return row;
    }
    if (!measured.reachable) {
      row.skipped.push(testId + " (" + measured.why + ")");
      continue;
    }
    // Приговор выносится только после ДВУХ одинаковых замеров. Второй замер — тот же рецепт из
    // того же семени: мёртвая кнопка не оживёт от повтора, а вот редкий асинхронный ответ, не
    // успевший в первый раз, будет виден. Расхождение записывается в отчёт, а не заминается.
    if (measured.quiet && !measured.alive && classify(testId, false) === "dead") {
      const again = await judgeControl(page, id, testId, path);
      if (again.reachable && again.quiet && again.alive) {
        row.flaky.push(testId);
        measured = again;
      }
    }
    if (!measured.quiet) row.unstable.push(testId);
    else row[classify(testId, measured.alive)].push(testId);
    if (path.length) row.prepared.push(testId + " ← " + path.join(" → "));
  }
  // Следующему экрану достаётся состояние после разведки, а не после последнего приговора:
  // приговоры откатываются, и без этого наследство было бы пустым.
  await resetToSeed(page, id + "::explored", id);
  return row;
}

const checkedOf = (row) => row.alive.length + row.dead.length + row.blind.length + row.external.length + row.unstable.length;

async function main() {
  const started = Date.now();
  const browser = await chromium.launch();
  const { context, page } = await openSession(browser);
  if (MUTANTS.length) console.log("ОБРАТНАЯ ПРОВЕРКА: обработчики сняты у", MUTANTS.join(", "));

  const only = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const all = await surfacesFrom(page);
  const surfaces = only.length ? all.filter((id) => only.includes(id)) : all;
  console.log("Экранов в навигации:", all.length, "· переписываю:", surfaces.length);

  const rows = [];
  for (const id of surfaces) {
    const row = await censusSurface(page, id).catch((error) => ({
      id, how: "", alive: [], dead: [], blind: [], external: [], unstable: [], skipped: [], prepared: [], flaky: [], order: [], error: error.message
    }));
    rows.push(row);
    console.log(
      String(id).padEnd(18),
      "всего " + String(checkedOf(row)).padStart(3),
      "· живых " + String(row.alive.length).padStart(3),
      "· МЁРТВЫХ " + String(row.dead.length).padStart(3),
      "· внешних " + String(row.external.length).padStart(2),
      "· слепых " + String(row.blind.length).padStart(2),
      "· неустойчивых " + String(row.unstable.length).padStart(2),
      "· пропущено " + String(row.skipped.length).padStart(2),
      row.prepared.length ? "· с подготовкой " + row.prepared.length : "",
      row.how === "программно" ? "· вход только программный" : "",
      row.error ? "· ОШИБКА: " + row.error : ""
    );
  }
  await context.close().catch(() => {});
  await browser.close();

  const measured = rows.filter((row) => !row.error);
  const lost = rows.filter((row) => row.error);
  const totalChecked = measured.reduce((sum, row) => sum + checkedOf(row), 0);
  const totalDead = measured.reduce((sum, row) => sum + row.dead.length, 0);
  const seconds = Math.round((Date.now() - started) / 1000);

  const lines = [
    "# Перепись живого — какие контролы продукта что-то делают",
    "",
    "Сгенерировано `tools/audit-liveness.mjs`. Контрол считается ЖИВЫМ, только если после нажатия",
    "изменилась разметка, активный экран или адрес. По умолчанию контрол мёртв — доказывать должен он.",
    "",
    "Пять исходов, а не два. «Ничего не изменилось» бывает по разным причинам, и смешивать",
    "их — то же враньё, что зелёный гейт при мёртвом экране:",
    "**мёртв** — дефект · **внешний** — нужна незапущенная служба · **слепой** — системный диалог,",
    "автоматически не проверяется вообще · **неустойчив** — экран менялся сам по себе, замер",
    "ничего не доказывает ни в одну сторону.",
    "",
    "Каждый контрол меряется из СЕМЕНИ экрана: хранилище возвращается к тому состоянию, в котором",
    "экран открылся, страница перезагружается, экран открывается заново. Поэтому соседи по экрану",
    "друг другу больше не мешают, а числа повторяются от прогона к прогону.",
    "",
    "| Экран | Всего | Живых | Мёртвых | Внешних | Слепых | Неустойчивых |",
    "|---|---|---|---|---|---|---|"
  ];
  for (const row of [...measured].sort((a, b) => b.dead.length - a.dead.length)) {
    lines.push(`| ${row.id} | ${checkedOf(row)} | ${row.alive.length} | **${row.dead.length}** | ${row.external.length} | ${row.blind.length} | ${row.unstable.length} |`);
  }
  lines.push("", "## Мёртвые контролы по экранам", "");
  for (const row of measured) {
    if (!row.dead.length) continue;
    lines.push(`### ${row.id}`, "", "`" + row.dead.join("` · `") + "`", "");
  }
  const skippedTotal = measured.reduce((sum, row) => sum + row.skipped.length, 0);
  if (skippedTotal) {
    lines.push(
      "## Не измерены: до контрола не добрались",
      "",
      "Контрол есть в разметке экрана, но в момент замера он был не виден или выключен. Это не",
      "приговор и не оправдание — это дыра в охвате, и она должна быть видна числом.",
      ""
    );
    for (const row of measured) {
      if (!row.skipped.length) continue;
      lines.push(`- **${row.id}** (${row.skipped.length}): ` + row.skipped.join(" · "));
    }
    lines.push("");
  }
  const preparedTotal = measured.reduce((sum, row) => sum + row.prepared.length, 0);
  if (preparedTotal) {
    lines.push(
      "## Измерены после подготовки",
      "",
      "Этих контролов на свежем экране не видно — они показываются только после нажатия соседей.",
      "Путь показа записан и повторяется в каждом прогоне, но начальное состояние у них не",
      "«чистое семя», а семя плюс перечисленные нажатия. Это честнее скрыть нельзя.",
      ""
    );
    for (const row of measured) {
      if (!row.prepared.length) continue;
      lines.push(`- **${row.id}**: ` + row.prepared.join(" · "));
    }
    lines.push("");
  }
  const flaky = measured.flatMap((row) => row.flaky.map((testId) => row.id + " · " + testId));
  if (flaky.length) {
    lines.push(
      "## Разошлись два замера",
      "",
      "Первый замер не увидел эффекта, повторный из того же семени — увидел. Контрол засчитан живым",
      "(мёртвая кнопка от повтора не оживает), но такой разброс сам по себе стоит посмотреть.",
      "",
      "`" + flaky.join("` · `") + "`",
      ""
    );
  }
  const onlyByCode = measured.filter((row) => row.how === "программно").map((row) => row.id);
  if (onlyByCode.length) {
    lines.push(
      "## Экраны без входа мышью",
      "",
      "До этих экранов на десктопе (1440×1000) нельзя добраться кликом: в ленте навигации у них нет",
      "кнопки, есть только мобильная размером 0×0. Перепись открыла их программно — но владелец так не может.",
      "",
      "`" + onlyByCode.join("` · `") + "`",
      ""
    );
  }
  if (lost.length) {
    lines.push("## Экраны без измерения", "", "Прибор до них не добрался — их прежние числа в карте НЕ обновлялись.", "");
    for (const row of lost) lines.push("- `" + row.id + "` — " + row.error);
    lines.push("");
  }
  writeFileSync(REPORT, lines.join("\n") + "\n", "utf8");

  // Второй выход — модуль для самого продукта. Владелец 2026-07-30: «нажимаешь — ничего не
  // работает, никуда не проваливаешься», и главная беда не в том, что часть кнопок мертва, а в
  // том, что ЭТО НЕ ВИДНО ЗАРАНЕЕ: один мёртвый экран отравляет доверие ко всем остальным.
  // Продукт обязан честно сказать про себя сам, и сказать ИЗМЕРЕННЫМ числом, а не обещанием.
  // Файл генерируется — руками не править, перегенерировать прогоном этого аудита.
  // Восьмая ошибка прибора: частичный прогон (`node tools/audit-liveness.mjs graph player`)
  // перезаписывал карту целиком, и у двадцати одного экрана пометка в меню молча исчезала —
  // продукт начинал врать, что там всё в порядке. Частичный прогон обязан ДОПОЛНЯТЬ карту.
  let map = {};
  try {
    const previous = readFileSync("ui/liveness-map.js", "utf8").match(/export const LIVENESS = ([\s\S]*?);\n/);
    if (previous) map = JSON.parse(previous[1]);
  } catch { /* карты ещё нет — это первый прогон */ }
  // Экран, который не открылся, своих чисел не обновляет: выдумать ему ноль мёртвых — ровно та
  // ошибка, из-за которой восемь экранов год стояли зелёными, ни разу не будучи открытыми.
  for (const row of measured) map[row.id] = { checked: checkedOf(row), dead: row.dead.length };
  writeFileSync(
    "ui/liveness-map.js",
    "// СГЕНЕРИРОВАНО tools/audit-liveness.mjs — не править руками.\n" +
      "// Перепись от " + new Date().toISOString().slice(0, 10) + ": проверено " + totalChecked +
      " контролов, мёртвых " + totalDead + ".\n" +
      "export const LIVENESS = " + JSON.stringify(map, null, 2) + ";\n" +
      "export const LIVENESS_DATE = \"" + new Date().toISOString().slice(0, 10) + "\";\n",
    "utf8"
  );
  console.log("");
  if (MUTANTS.length) {
    const caught = MUTANTS.filter((id) => measured.some((row) => row.dead.includes(id)));
    const escaped = MUTANTS.filter((id) => !caught.includes(id));
    console.log("ОБРАТНАЯ ПРОВЕРКА: пойманы " + (caught.join(", ") || "—") + " · ВЫЖИЛИ " + (escaped.join(", ") || "—"));
    if (escaped.length) console.log("Выживший мутант — это ложь прибора: кнопка без обработчика названа живой.");
  }
  if (lost.length) console.log("НЕ ИЗМЕРЕНЫ (числа в карте оставлены прежними): " + lost.map((row) => row.id).join(", "));
  console.log("ИТОГО: проверено " + totalChecked + " контролов, мёртвых " + totalDead + " (" + Math.round((totalDead / Math.max(1, totalChecked)) * 100) + "%) за " + seconds + " с");
  console.log("Карта:", REPORT);
}

main();
