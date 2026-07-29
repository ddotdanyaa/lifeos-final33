// core/graph-math.mjs — алгоритмы графа: кластеры и укладка
//
// П7: вынесено из app.js замыканием от семени — инструмент сам добрал все зависимости и
// проверил, что ни одна из них не трогает состояние, хранилище и DOM. Модуль замкнут:
// ссылок обратно в app.js нет (audit-module-closure это подтверждает).

// G2.5: сила отталкивания/длина связи/гравитация центра выведены слайдерами владельца
// (Obsidian graph settings идея) - значения по умолчанию совпадают с прежними хардкодом,
// так что без слайдеров поведение не меняется (backward-compatible default 5-й параметр).
export function applyForceTick(nodes, links, width, height, forces) {
  // Срез 7 фикс: сильнее расталкивание и длиннее связи - узлы дышат, а не липнут в ком
  // (владелец видел «клубок»). Центрирование слабее, чтобы хабы не стягивали всё в точку.
  const repulsion = Number(forces && forces.repulsion) || 8600;
  const spring = 0.016;
  const desired = Number(forces && forces.linkDistance) || 158;
  const centerStrength = Number(forces && forces.gravity) >= 0 ? Number(forces && forces.gravity) : 0.004;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distSq = dx * dx + dy * dy;
      if (distSq < 0.01) {
        dx = 0.1 + i * 0.01;
        dy = 0.1 + j * 0.01;
        distSq = dx * dx + dy * dy;
      }
      const dist = Math.sqrt(distSq);
      const force = repulsion / distSq;
      const fx = force * dx / dist;
      const fy = force * dy / dist;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
      const minDist = a.radius + b.radius + 14;
      if (dist < minDist) {
        const push = (minDist - dist) * 0.055;
        const px = push * dx / dist;
        const py = push * dy / dist;
        a.vx -= px;
        a.vy -= py;
        b.vx += px;
        b.vy += py;
      }
    }
  }
  for (const link of links) {
    const a = link.sourceNode;
    const b = link.targetNode;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const force = (dist - desired) * spring;
    const fx = force * dx / dist;
    const fy = force * dy / dist;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }
  for (const node of nodes) {
    node.vx += (width / 2 - node.x) * centerStrength;
    node.vy += (height / 2 - node.y) * centerStrength;
    node.vx *= 0.82;
    node.vy *= 0.82;
    if (!node.fixed) {
      node.x += node.vx;
      node.y += node.vy;
    }
    node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
    node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
  }
}

// Louvain, первая фаза + агрегация (донор-алгоритм из cluster.py, там он вызывается через
// networkx/graspologic). Прирост модулярности при переносе узла i в сообщество C:
// ΔQ = k_i,in / m − Σtot · k_i / (2m²). Узлы обходим в отсортированном порядке, ничьи решаем
// по id — иначе разбиение «плавает» от прогона к прогону и выглядит как churn сообществ.
export function louvainPartition(ids, adjacency) {
  let nodes = ids.slice();
  let neighbours = new Map(nodes.map((id) => [id, new Map([...adjacency.get(id)].map((other) => [other, 1]))]));
  let membership = new Map(nodes.map((id) => [id, id]));
  const rootOf = new Map(nodes.map((id) => [id, [id]]));

  for (let level = 0; level < 6; level += 1) {
    const degree = new Map(nodes.map((id) => [id, [...neighbours.get(id).values()].reduce((sum, weight) => sum + weight, 0)]));
    const totalWeight = [...degree.values()].reduce((sum, value) => sum + value, 0) / 2;
    if (!totalWeight) break;
    const community = new Map(nodes.map((id) => [id, id]));
    const communityTotal = new Map(nodes.map((id) => [id, degree.get(id)]));
    let moved = false;
    for (let pass = 0; pass < 8; pass += 1) {
      let passMoved = false;
      for (const id of nodes) {
        const current = community.get(id);
        const own = degree.get(id);
        communityTotal.set(current, communityTotal.get(current) - own);
        const weightTo = new Map();
        for (const [other, weight] of neighbours.get(id)) {
          if (other === id) continue;
          const target = community.get(other);
          weightTo.set(target, (weightTo.get(target) || 0) + weight);
        }
        let best = current;
        let bestGain = (weightTo.get(current) || 0) - (communityTotal.get(current) * own) / (2 * totalWeight);
        for (const [target, weight] of [...weightTo.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
          const gain = weight - (communityTotal.get(target) * own) / (2 * totalWeight);
          if (gain > bestGain + 1e-9) {
            bestGain = gain;
            best = target;
          }
        }
        communityTotal.set(best, communityTotal.get(best) + own);
        if (best !== current) {
          community.set(id, best);
          passMoved = true;
          moved = true;
        }
      }
      if (!passMoved) break;
    }
    for (const id of ids) {
      const leaf = membership.get(id);
      membership.set(id, community.get(leaf) !== undefined ? community.get(leaf) : leaf);
    }
    if (!moved) break;
    // Агрегация: каждое сообщество становится узлом следующего уровня.
    const groups = new Map();
    for (const id of nodes) {
      const cid = community.get(id);
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid).push(id);
    }
    const nextNodes = [...groups.keys()].sort();
    const nextNeighbours = new Map(nextNodes.map((cid) => [cid, new Map()]));
    for (const id of nodes) {
      const from = community.get(id);
      for (const [other, weight] of neighbours.get(id)) {
        const to = community.get(other);
        const bucket = nextNeighbours.get(from);
        bucket.set(to, (bucket.get(to) || 0) + weight);
      }
    }
    for (const [cid, members] of groups) {
      rootOf.set(cid, members.flatMap((member) => rootOf.get(member) || [member]));
    }
    if (nextNodes.length === nodes.length) break;
    nodes = nextNodes;
    neighbours = nextNeighbours;
  }
  return membership;
}
