// core/donor-intake.mjs — ДОНОР ПРИХОДИТ САМ.
//
// Владелец сформулировал сценарий дословно: «нашёл репозиторий, где граф работает лучше,
// добавил его как файл; вечером пришёл после работы — загруженное обработано, определено, что
// это репозиторий, который можно изучить; дальше вопросник: у кого лучше — у нас или у них,
// можем ли мы сделать себе лучше; если можем — постановка в очередь на внедрение».
//
// Что здесь есть и чего здесь нет.
//
// ЕСТЬ: распознавание ссылки на репозиторий в любом тексте, лицензионный фильтр, стек-фильтр,
// сверка с тем, что у нас уже сделано, и вердикт с причиной.
//
// НЕТ: генерации кода. Продукт не пишет свой код — это инвариант, а не недоделка. Система,
// которая правит собственные проверки, перестаёт быть проверяемой: она сама решает, что стала
// лучше. Поэтому конвейер заканчивается ОЧЕРЕДЬЮ, а код по очереди пишется в прогоне, где есть
// гейты и внешний судья.
//
// Слой чистый: на входе строки, на выходе решения. Ни сети, ни хранилища, ни DOM — сеть живёт в
// `app.js`, потому что она требует подтверждения владельца и оставляет receipt.
import { cleanLine, shorten } from "./text.mjs";

// ─── 1. РАСПОЗНАВАНИЕ ─────────────────────────────────────────────────────────────────────
//
// Ссылка на репозиторий — это не заметка. Владелец кидает её в тот же поток, что и мысли, и
// продукт обязан отличить одно от другого сам, иначе «кинуть и забыть» не работает.

const REPO_HOSTS = ["github.com", "gitlab.com", "codeberg.org", "bitbucket.org"];

export function extractRepoRefs(text) {
  const source = String(text || "");
  const found = new Map();
  for (const host of REPO_HOSTS) {
    // Владелец, работающий с телефона, кидает ссылку как придётся: с https, без него, с
    // хвостом /tree/main, в скобках markdown. Ловим все формы, а не одну красивую.
    const pattern = new RegExp("(?:https?://)?(?:www\\.)?" + host.replace(".", "\\.") + "/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)", "gi");
    for (const match of source.matchAll(pattern)) {
      const owner = match[1];
      const repo = String(match[2] || "").replace(/\.git$/i, "");
      if (!owner || !repo) continue;
      // Служебные страницы хостинга репозиториями не являются.
      if (/^(orgs|topics|search|about|features|pricing|explore|settings|sponsors)$/i.test(owner)) continue;
      const id = host + "/" + owner + "/" + repo;
      if (found.has(id)) continue;
      found.set(id, {
        id,
        host,
        owner,
        repo,
        slug: owner + "/" + repo,
        url: "https://" + host + "/" + owner + "/" + repo
      });
    }
  }
  return [...found.values()];
}

// ─── 2. ЛИЦЕНЗИОННЫЙ ФИЛЬТР ───────────────────────────────────────────────────────────────
//
// Правило владельца: код берём только MIT/Apache-2.0/BSD, читаем LICENSE, не верим памяти.
// Это правило дважды спасало проект (tldraw оказался не MIT, originui — AGPL), и оно должно
// исполняться кодом, а не силой воли.

const CODE_OK = [
  { spdx: "MIT", test: /\bMIT License\b/i },
  { spdx: "Apache-2.0", test: /Apache License[\s\S]{0,80}Version 2\.0/i },
  { spdx: "BSD-3-Clause", test: /Redistribution and use in source and binary forms[\s\S]{0,600}name of the copyright holder/i },
  { spdx: "BSD-2-Clause", test: /Redistribution and use in source and binary forms/i },
  { spdx: "ISC", test: /\bISC License\b/i },
  { spdx: "Unlicense", test: /This is free and unencumbered software released into the public domain/i }
];

const IDEAS_ONLY = [
  { spdx: "AGPL-3.0", test: /GNU AFFERO GENERAL PUBLIC LICENSE/i },
  { spdx: "GPL-3.0", test: /GNU GENERAL PUBLIC LICENSE[\s\S]{0,120}Version 3/i },
  { spdx: "GPL-2.0", test: /GNU GENERAL PUBLIC LICENSE[\s\S]{0,120}Version 2/i },
  { spdx: "LGPL", test: /GNU LESSER GENERAL PUBLIC LICENSE/i },
  { spdx: "MPL-2.0", test: /Mozilla Public License Version 2\.0/i },
  { spdx: "SSPL", test: /Server Side Public License/i },
  { spdx: "BUSL", test: /Business Source License/i }
];

export function classifyLicense(licenseText) {
  const text = String(licenseText || "");
  // ИЗУЧАТЬ МОЖНО ВСЕГДА, и это не оговорка, а основа конвейера. Лицензия ограничивает
  // копирование и распространение кода — не чтение, не разбор, не описание того, как проект
  // решил задачу. Аудит, список возможностей и сравнение «как у них / как у нас» законны для
  // любого проекта, включая коммерческий. Поэтому `studyAllowed` здесь всегда true, а лицензия
  // решает РОВНО ОДИН вопрос: берём код дословно или пишем своё по итогам разбора.
  if (!cleanLine(text)) {
    return { spdx: "", codeAllowed: false, studyAllowed: true, why: "LICENSE не прочитан — разбираем и пишем своё, дословный код не берём" };
  }
  // Порядок важен: AGPL содержит слова «GENERAL PUBLIC LICENSE», а BSD-2 — подстроку BSD-3.
  for (const row of IDEAS_ONLY) {
    if (row.test.test(text)) {
      return { spdx: row.spdx, codeAllowed: false, studyAllowed: true, why: row.spdx + ": разбираем свободно, свою реализацию пишем сами" };
    }
  }
  for (const row of CODE_OK) {
    if (row.test.test(text)) {
      return { spdx: row.spdx, codeAllowed: true, studyAllowed: true, why: row.spdx + ": код можно брать с указанием авторства" };
    }
  }
  return { spdx: "неизвестна", codeAllowed: false, studyAllowed: true, why: "Лицензия не опознана — разбираем и пишем своё, пока её не прочитает человек" };
}

// ─── 3. СТЕК-ФИЛЬТР ───────────────────────────────────────────────────────────────────────
//
// LifeOS грузится браузером напрямую, без сервера и без шага сборки. Донор, которому нужен
// Python, сервер или бандлер, не встаёт — сколько бы звёзд у него ни было. Это не вкус: сервер
// отменяет локальность, а локальность и есть продукт.

const STACK_RULES = [
  { stack: "Python", usable: false, test: /\b(requirements\.txt|pyproject\.toml|pip install|import torch|networkx|numpy|pandas|asyncio)\b/i, why: "Python: в браузере не исполняется без сервера" },
  { stack: "Java/JVM", usable: false, test: /\b(pom\.xml|gradlew|\bmaven\b|import java\.)\b/i, why: "JVM: требует сервера" },
  { stack: "Rust→WASM", usable: true, test: /\b(wasm-pack|wasm-bindgen)\b/i, why: "Собран в WASM: в браузере исполняется" },
  { stack: "Go", usable: false, test: /\b(go\.mod|package main)\b/i, why: "Go: требует сервера" },
  { stack: "React/сборка", usable: false, test: /\b(react-dom|next\.js|nextjs|vite\.config|webpack\.config|\.tsx\b)\b/i, why: "Требует шага сборки — у LifeOS его нет; берём паттерны и CSS" },
  { stack: "Node-only", usable: false, test: /\b(require\('fs'\)|require\("fs"\)|node:fs|process\.env)\b/i, why: "Написан под Node, не под браузер: нужен порт, а не подключение" },
  { stack: "Vanilla JS/ESM", usable: true, test: /\b(es modules|esm|<script type="module">|browser-ready|works in the browser)\b/i, why: "Чистый JS: подключается напрямую" }
];

export function classifyStack(text) {
  const source = String(text || "");
  const hits = STACK_RULES.filter((rule) => rule.test.test(source));
  if (!hits.length) {
    return { stack: "не определён", usableInBrowser: false, why: "Стек не опознан по описанию — считаем неподходящим, пока не проверено" };
  }
  // Если донор одновременно и браузерный, и серверный — решает ЗАПРЕТ. Ошибка в эту сторону
  // стоит потерянного вечера, ошибка в другую — сломанного продукта.
  const blocked = hits.find((rule) => !rule.usable);
  const chosen = blocked || hits[0];
  return { stack: chosen.stack, usableInBrowser: !blocked, why: chosen.why };
}

// ─── 4. СВЕРКА С НАМИ ─────────────────────────────────────────────────────────────────────
//
// Главный вопрос владельца: «у кого лучше — у нас или у них?». Без сверки любой донор выглядит
// заманчиво, и мы третий раз реализуем то, что уже сделано.

export function compareWithOurs(repoText, ourFunctions) {
  const source = String(repoText || "").toLowerCase();
  const already = [];
  const missing = [];
  for (const row of ourFunctions || []) {
    const key = String(row.keyword || row.title || "").toLowerCase();
    if (!key) continue;
    if (!source.includes(key)) continue;
    (row.done ? already : missing).push(row.title || row.keyword);
  }
  return { already, missing };
}

// ─── 5. ВЕРДИКТ ───────────────────────────────────────────────────────────────────────────
//
// Три исхода и ни одного «посмотрим потом». Вердикт всегда с причиной: донор, отклонённый без
// причины, вернётся через месяц и снова съест вечер.

export function donorVerdict({ license, stack, comparison, stars }) {
  const overlap = comparison || { already: [], missing: [] };
  const reasons = [];
  if (license && license.why) reasons.push(license.why);
  if (stack && stack.why) reasons.push(stack.why);

  // Отклоняем ЕДИНСТВЕННО когда брать нечего — всё, что проект умеет, у нас уже сделано.
  // Ни лицензия, ни стек отказом не являются: разобрать можно любой проект, а своя реализация
  // по итогам разбора — это работа, а не запрет.
  if (overlap.missing.length === 0 && overlap.already.length > 0) {
    return {
      decision: "отклонить",
      title: "У нас это уже есть",
      why: "Совпадает с готовым: " + overlap.already.slice(0, 3).join(" · "),
      reasons,
      queue: false
    };
  }

  const codeAllowed = Boolean(license && license.codeAllowed);
  const browserReady = Boolean(stack && stack.usableInBrowser);
  const gain = overlap.missing.length ? "У нас нет: " + overlap.missing.slice(0, 3).join(" · ") : "Есть чему поучиться: сверки с нашим списком не нашлось";

  if (codeAllowed && browserReady) {
    return {
      decision: "код",
      title: "Берём кодом",
      why: gain,
      reasons,
      queue: true
    };
  }

  // «Разбор» — это ПОЛНОЦЕННЫЙ исход, а не отказ и не утешение. Проект изучается целиком:
  // возможности, приёмы, как именно решена задача, — и по итогам мы пишем своё. Именно так в
  // продукт попали дедуп имён из Graphiti и Adamic-Adar в предсказание связей.
  return {
    decision: "разбор",
    title: "Изучаем и делаем своё",
    why: gain,
    reasons: reasons.concat([
      codeAllowed ? "" : "дословный код не берём — пишем свою реализацию",
      browserReady ? "" : "стек другой: переносим приём, а не файлы"
    ].filter(Boolean)),
    queue: true
  };
}

// ─── 5A. СВОДКА ПО НЕСКОЛЬКИМ ПРОЕКТАМ ────────────────────────────────────────────────────
//
// Правило владельца: одну задачу разбираем не по одному проекту, а по двум-трём сразу — что
// умеют, чем сильны, КАК именно решили. Один донор задаёт вопрос «а бывает лучше?», три донора
// на него отвечают. Сводка — вход в проектирование своего, а не пересказ чужих README.
export function auditBrief(topic, donors) {
  const rows = (donors || []).filter(Boolean).map((donor) => ({
    slug: donor.slug || donor.title || "",
    license: (donor.license && donor.license.spdx) || donor.license || "не прочитана",
    stack: (donor.stack && donor.stack.stack) || donor.stack || "не определён",
    // «Как решено» — единственная строка, ради которой сводка и делается.
    approach: cleanLine(donor.approach || ""),
    strengths: (donor.strengths || []).slice(0, 4),
    takeaway: cleanLine(donor.takeaway || "")
  }));
  const gaps = [];
  for (const row of rows) {
    for (const item of row.strengths) if (!gaps.includes(item)) gaps.push(item);
  }
  return {
    topic: cleanLine(topic || ""),
    rows,
    // Разобрано меньше двух — это ещё не сравнение, и выдавать его за сравнение нельзя.
    comparable: rows.length >= 2,
    note: rows.length >= 2
      ? "Разобрано проектов: " + rows.length + ". Своё строим по сводке, а не по одному образцу."
      : "Для сравнения нужно хотя бы два проекта — пока разобран один.",
    candidates: gaps.slice(0, 8)
  };
}

// ─── 6. КАРТОЧКА ДЛЯ ЭКРАНА ───────────────────────────────────────────────────────────────
//
// Владелец должен увидеть не отчёт анализатора, а решение: что это, что с этим делать и почему.

export function donorCard(ref, facts, verdict) {
  const description = cleanLine((facts && facts.description) || "");
  return {
    id: "donor-" + String((ref && ref.id) || "").replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    slug: (ref && ref.slug) || "",
    url: (ref && ref.url) || "",
    title: (ref && ref.slug) || "донор",
    summary: description ? shorten(description, 120) : "Описание не прочитано",
    license: (facts && facts.license && facts.license.spdx) || "не прочитана",
    stack: (facts && facts.stack && facts.stack.stack) || "не определён",
    decision: (verdict && verdict.decision) || "принцип",
    verdictTitle: (verdict && verdict.title) || "",
    why: (verdict && verdict.why) || "",
    reasons: (verdict && verdict.reasons) || [],
    queue: Boolean(verdict && verdict.queue)
  };
}
