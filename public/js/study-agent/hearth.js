import { escapeHtml, formatFilenameAsDate } from "./markdown-utils.js";

export const HEARTH_QUOTES = [
  { text: "Knowing yourself is the beginning of all wisdom.", attr: "Aristotle" },
  { text: "The roots of education are bitter, but the fruit is sweet.", attr: "Aristotle" },
  { text: "It is the mark of an educated mind to be able to entertain a thought without accepting it.", attr: "Aristotle" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", attr: "Aristotle" },
  { text: "An investment in knowledge pays the best interest.", attr: "Benjamin Franklin" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", attr: "W.B. Yeats" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", attr: "Gandhi" },
  { text: "The more that you read, the more things you will know.", attr: "Dr. Seuss" },
  { text: "I have no special talent. I am only passionately curious.", attr: "Albert Einstein" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", attr: "Plutarch" },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", attr: "Benjamin Franklin" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", attr: "B.B. King" },
  { text: "Anyone who stops learning is old, whether at twenty or eighty.", attr: "Henry Ford" },
  { text: "The expert in anything was once a beginner.", attr: "Helen Hayes" },
  { text: "Study without desire spoils the memory, and it retains nothing that it takes in.", attr: "Leonardo da Vinci" },
  { text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", attr: "Brian Herbert" },
  { text: "Curiosity is the wick in the candle of learning.", attr: "William Arthur Ward" },
  { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", attr: "Malcolm X" },
  { text: "In learning you will teach, and in teaching you will learn.", attr: "Phil Collins" },
  { text: "Real learning comes about when the competitive spirit has ceased.", attr: "Jiddu Krishnamurti" },
  { text: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", attr: "Albert Einstein" },
  { text: "The more I learn, the more I realize how much I don't know.", attr: "Albert Einstein" },
  { text: "He who learns but does not think, is lost. He who thinks but does not learn is in great danger.", attr: "Confucius" },
  { text: "Learning never exhausts the mind.", attr: "Leonardo da Vinci" },
  { text: "The whole purpose of education is to turn mirrors into windows.", attr: "Sydney J. Harris" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning, scholar.";
  if (h >= 12 && h < 18) return "Good afternoon, scholar.";
  return "Good evening, scholar.";
}

/** Reserved for future session list UI; not used in the heatmap path. */
export function parseHearthSession(filename, content) {
  const date = formatFilenameAsDate(filename);
  const notes = [];
  let inNotesList = false;
  for (const line of content.split("\n")) {
    if (line.includes("**Notes studied:**")) {
      inNotesList = true;
      continue;
    }
    if (inNotesList) {
      if (line.startsWith("- ")) {
        const p = line.slice(2).trim().split("/");
        notes.push(p[p.length - 1].replace(/\.md$/, ""));
      } else if (line.trim() === "" || line.startsWith("---")) {
        break;
      }
    }
  }
  return { date, notes };
}

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function loadHearthSessions() {
  const container = document.getElementById("hearthSessions");
  container.innerHTML = "";

  let sessionDates = [];
  try {
    const res = await fetch("/api/summaries");
    if (!res.ok) throw new Error();
    const { summaries } = await res.json();
    sessionDates = summaries
      .map((s) => {
        const iso = s.filename.replace(".md", "").replace(/T(\d{2})-(\d{2})-(\d{2})$/, "T$1:$2:$3");
        return new Date(iso);
      })
      .filter((d) => !isNaN(d));
  } catch {
    // server unavailable — show empty heatmap
  }

  const dayCounts = {};
  for (const d of sessionDates) {
    const key = localDateStr(d);
    dayCounts[key] = (dayCounts[key] || 0) + 1;
  }

  const totalSessions = sessionDates.length;

  const WEEKS = 16;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const thisSunday = new Date(todayStart);
  thisSunday.setDate(todayStart.getDate() - todayStart.getDay());

  const startSunday = new Date(thisSunday);
  startSunday.setDate(thisSunday.getDate() - (WEEKS - 1) * 7);

  const weeks = [];
  const cur = new Date(startSunday);
  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const countLabel = document.createElement("div");
  countLabel.className = "hearthSessionsLabel";
  countLabel.textContent = `${totalSessions} session${totalSessions !== 1 ? "s" : ""} in the last 4 months`;
  container.appendChild(countLabel);

  const heatmapWrap = document.createElement("div");
  heatmapWrap.className = "hearthHeatmap";

  const CELL_STEP = 15;
  const monthRow = document.createElement("div");
  monthRow.className = "hearthHeatmapMonths";
  monthRow.style.display = "grid";
  monthRow.style.gridTemplateColumns = `repeat(${WEEKS}, ${CELL_STEP}px)`;

  const monthPositions = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = week[0].getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      monthPositions.push({ monthLabel: MONTH_NAMES[m], col: wi + 1 });
    }
  });
  monthPositions.forEach(({ monthLabel, col }) => {
    const ml = document.createElement("span");
    ml.className = "hearthHeatmapMonth";
    ml.style.gridColumn = String(col);
    ml.textContent = monthLabel;
    monthRow.appendChild(ml);
  });

  const gridArea = document.createElement("div");
  gridArea.className = "hearthHeatmapGridArea";

  const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
  const dayLabelsEl = document.createElement("div");
  dayLabelsEl.className = "hearthHeatmapDayLabels";
  DAY_LABELS.forEach((text) => {
    const dl = document.createElement("div");
    dl.className = "hearthHeatmapDayLabel";
    dl.textContent = text;
    dayLabelsEl.appendChild(dl);
  });

  const grid = document.createElement("div");
  grid.className = "hearthHeatmapGrid";

  weeks.forEach((week) => {
    const weekCol = document.createElement("div");
    weekCol.className = "hearthHeatmapWeek";
    week.forEach((day) => {
      const key = localDateStr(day);
      const count = dayCounts[key] || 0;
      const isFuture = day > todayStart;
      const cell = document.createElement("div");
      cell.className = "hearthHeatmapCell";
      cell.dataset.level = String(Math.min(count, 2));
      if (isFuture) {
        cell.dataset.future = "1";
      } else {
        const dateLabel = day.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        cell.title =
          count === 0
            ? `No sessions on ${dateLabel}`
            : `${count} session${count !== 1 ? "s" : ""} on ${dateLabel}`;
      }
      weekCol.appendChild(cell);
    });
    grid.appendChild(weekCol);
  });

  gridArea.appendChild(dayLabelsEl);
  gridArea.appendChild(grid);
  heatmapWrap.appendChild(monthRow);
  heatmapWrap.appendChild(gridArea);

  const legend = document.createElement("div");
  legend.className = "hearthHeatmapLegend";
  const lessSpan = document.createElement("span");
  lessSpan.className = "hearthHeatmapLegendLabel";
  lessSpan.textContent = "Less";
  legend.appendChild(lessSpan);
  [0, 1, 2].forEach((level) => {
    const lc = document.createElement("div");
    lc.className = "hearthHeatmapCell";
    lc.dataset.level = String(level);
    legend.appendChild(lc);
  });
  const moreSpan = document.createElement("span");
  moreSpan.className = "hearthHeatmapLegendLabel";
  moreSpan.textContent = "More";
  legend.appendChild(moreSpan);
  heatmapWrap.appendChild(legend);

  container.appendChild(heatmapWrap);
}

function dismissHearth() {
  const el = document.getElementById("hearthScreen");
  el.classList.add("dismissing");
  el.addEventListener("transitionend", () => el.classList.add("hidden"), { once: true });
}

export async function initHearth() {
  document.getElementById("hearthGreeting").textContent = getGreeting();

  const q = HEARTH_QUOTES[Math.floor(Math.random() * HEARTH_QUOTES.length)];
  document.getElementById("hearthQuote").innerHTML =
    `“${escapeHtml(q.text)}”<span class="hearthQuoteAttr">— ${escapeHtml(q.attr)}</span>`;

  await loadHearthSessions();

  document.getElementById("hearthBeginBtn").addEventListener("click", dismissHearth);
}
