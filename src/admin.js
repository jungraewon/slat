import { supabase } from "./supabase.js";
import "./admin.css";

// ======================================================
// INSITE 관리자 대시보드 - 최종 분석 그래프 5개
// ======================================================

const products = [
  { id: "A", name: "IN S1", info: ["리뷰"] },
  { id: "B", name: "IN S2", info: ["별점"] },
  { id: "C", name: "IN S3", info: ["품질정보"] },
  { id: "D", name: "IN S4", info: ["리뷰", "별점"] },
  { id: "E", name: "IN S5", info: ["리뷰", "품질정보"] },
  { id: "F", name: "IN S6", info: ["별점", "품질정보"] },
  { id: "G", name: "IN S7", info: ["리뷰", "별점", "품질정보"] }
];

const app = document.querySelector("#admin-app");
let experimentData = [];

const INFO = {
  review: "리뷰",
  rating: "별점",
  quality: "품질정보"
};

// ======================================================
// 기본 함수
// ======================================================

function completedRows() {
  return experimentData.filter(
    row => row.status === "completed" && row.final_choice
  );
}

// 300초(5분) 초과 데이터는 원본 DB에는 남겨두고
// 시간 분석에서만 제외
const MAX_VALID_DECISION_TIME = 300;

function validTimeRows() {
  return completedRows().filter(row => {
    const time = Number(row.decision_time);

    return (
      Number.isFinite(time) &&
      time >= 0 &&
      time <= MAX_VALID_DECISION_TIME
    );
  });
}

function getProduct(id) {
  return products.find(p => p.id === id);
}

function getViews(row, id) {
  return Number(
    row[`${id.toLowerCase()}_detail_views`] ??
      row[`${id}_detail_views`] ??
      0
  );
}

function getVisited(row, id) {
  const key = `${id.toLowerCase()}_detail_visited`;
  const oldKey = `${id}_detail_visited`;

  return Boolean(row[key] ?? row[oldKey] ?? false);
}

function getSequence(row) {
  if (Array.isArray(row.detail_view_sequence)) {
    return row.detail_view_sequence;
  }

  if (typeof row.detail_view_sequence === "string") {
    try {
      const parsed = JSON.parse(row.detail_view_sequence);

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return row.detail_view_sequence
        .split(/[>,→]/)
        .map(v => v.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function infoCount(product) {
  return product?.info?.length ?? 0;
}

function hasInfo(product, type) {
  if (!product) return false;

  return product.info.includes(type);
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function seconds(value) {
  return `${Number(value || 0).toFixed(1)}초`;
}

function number(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function average(values) {
  const nums = values
    .map(Number)
    .filter(Number.isFinite);

  return nums.length
    ? nums.reduce((a, b) => a + b, 0) / nums.length
    : 0;
}

// ======================================================
// 선형회귀
// y = slope*x + intercept
// ======================================================

function regression(points) {
  if (points.length < 2) {
    return {
      slope: 0,
      intercept: 0,
      r2: 0
    };
  }

  const xs = points.map(p => Number(p.x));
  const ys = points.map(p => Number(p.y));

  const xMean = average(xs);
  const yMean = average(ys);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < points.length; i++) {
    numerator +=
      (xs[i] - xMean) *
      (ys[i] - yMean);

    denominator +=
      (xs[i] - xMean) ** 2;
  }

  const slope =
    denominator === 0
      ? 0
      : numerator / denominator;

  const intercept =
    yMean - slope * xMean;

  const ssTot = ys.reduce(
    (sum, y) =>
      sum + (y - yMean) ** 2,
    0
  );

  const ssRes = ys.reduce(
    (sum, y, i) => {
      const predicted =
        slope * xs[i] + intercept;

      return sum +
        (y - predicted) ** 2;
    },
    0
  );

  const r2 =
    ssTot === 0
      ? 0
      : 1 - ssRes / ssTot;

  return {
    slope,
    intercept,
    r2
  };
}

// ======================================================
// 데이터 로드
// ======================================================

async function loadData() {
  renderLoading();

  const { data, error } = await supabase
    .from("experiment_data")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(error);

    renderError(error);

    return;
  }

  experimentData = data || [];

  renderDashboard();
}

// ======================================================
// 그래프 1
// 상품 유형별 선택률
// ======================================================

function graph1Data() {
  const rows = completedRows();

  const groups = [
    {
      label: "리뷰",
      test: p =>
        hasInfo(p, INFO.review) &&
        !hasInfo(p, INFO.rating) &&
        !hasInfo(p, INFO.quality)
    },

    {
      label: "별점",
      test: p =>
        !hasInfo(p, INFO.review) &&
        hasInfo(p, INFO.rating) &&
        !hasInfo(p, INFO.quality)
    },

    {
      label: "품질정보",
      test: p =>
        !hasInfo(p, INFO.review) &&
        !hasInfo(p, INFO.rating) &&
        hasInfo(p, INFO.quality)
    },

    {
      label: "리뷰+별점",
      test: p =>
        hasInfo(p, INFO.review) &&
        hasInfo(p, INFO.rating) &&
        !hasInfo(p, INFO.quality)
    },

    {
      label: "리뷰+품질정보",
      test: p =>
        hasInfo(p, INFO.review) &&
        !hasInfo(p, INFO.rating) &&
        hasInfo(p, INFO.quality)
    },

    {
      label: "별점+품질정보",
      test: p =>
        !hasInfo(p, INFO.review) &&
        hasInfo(p, INFO.rating) &&
        hasInfo(p, INFO.quality)
    },

    {
      label: "전체정보",
      test: p =>
        hasInfo(p, INFO.review) &&
        hasInfo(p, INFO.rating) &&
        hasInfo(p, INFO.quality)
    }
  ];

  return groups.map(group => {
    const selected =
      rows.filter(row =>
        group.test(
          getProduct(row.final_choice)
        )
      ).length;

    return {
      label: group.label,

      value:
        rows.length
          ? (selected / rows.length) * 100
          : 0
    };
  });
}

// ======================================================
// 그래프 2
// 정보 확인 → 상품 선택 전환율
// ======================================================

function graph2Data() {
  const rows = completedRows();

  const groups = [
    {
      label: "리뷰 확인",
      type: INFO.review
    },

    {
      label: "별점 확인",
      type: INFO.rating
    },

    {
      label: "품질정보 확인",
      type: INFO.quality
    }
  ];

  return groups.map(group => {
    const viewed = rows.filter(row => {
      const sequence =
        getSequence(row);

      return sequence.some(id =>
        hasInfo(
          getProduct(id),
          group.type
        )
      );
    });

    const selected =
      viewed.filter(row =>
        hasInfo(
          getProduct(row.final_choice),
          group.type
        )
      );

    return {
      label: group.label,

      value:
        viewed.length
          ? (selected.length / viewed.length) * 100
          : 0,

      denominator: viewed.length,

      numerator: selected.length
    };
  });
}

// ======================================================
// 그래프 3
// 정보량 × 선택시간
// ======================================================

function graph3Data() {
  return validTimeRows()
    .map(row => {
      const product =
        getProduct(row.final_choice);

      return {
        x: infoCount(product),

        y: Number(
          row.decision_time || 0
        ),

        participant:
          row.participant_id || "참가자"
      };
    })
    .filter(point =>
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    );
}

// ======================================================
// 그래프 4
// 정보량 × 선택확률
// ======================================================

function graph4Data() {
  const rows = completedRows();

  return [1, 2, 3].map(count => {
    const selected =
      rows.filter(row =>
        infoCount(
          getProduct(row.final_choice)
        ) === count
      ).length;

    return {
      x: count,

      y:
        rows.length
          ? (selected / rows.length) * 100
          : 0,

      label: `${count}개`
    };
  });
}

// ======================================================
// 그래프 5
// 정보 유형별 이탈률
// ======================================================

function graph5Data() {
  const startedRows =
    experimentData.filter(
      row => row.status === "started"
    );

  const completed =
    completedRows();

  const allRows = [
    ...startedRows,
    ...completed
  ];

  const uniqueRows = [];
  const seen = new Set();

  for (const row of allRows) {
    const key =
      row.id ??
      row.participant_id ??
      `${row.created_at}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  }

  const groups = [
    {
      label: "리뷰",
      type: INFO.review
    },

    {
      label: "별점",
      type: INFO.rating
    },

    {
      label: "품질정보",
      type: INFO.quality
    }
  ];

  return groups.map(group => {
    const viewed =
      uniqueRows.filter(row => {
        const sequence =
          getSequence(row);

        return sequence.some(id =>
          hasInfo(
            getProduct(id),
            group.type
          )
        );
      });

    const completedViewed =
      viewed.filter(
        row =>
          row.status === "completed" &&
          row.final_choice
      );

    const dropout =
      viewed.length -
      completedViewed.length;

    return {
      label: group.label,

      value:
        viewed.length
          ? (dropout / viewed.length) * 100
          : 0,

      denominator: viewed.length,

      dropout
    };
  });
}

// ======================================================
// 막대그래프
// ======================================================

function renderBarChart({
  id,
  data,
  yLabel = "%",
  max = 100
}) {
  const width = 900;
  const height = 360;

  const left = 72;
  const right = 30;
  const top = 24;
  const bottom = 64;

  const chartW =
    width - left - right;

  const chartH =
    height - top - bottom;

  const step =
    chartW / data.length;

  const barW =
    Math.min(
      90,
      step * 0.55
    );

  const grid =
    [0, 25, 50, 75, 100]
      .map(v => {
        const y =
          top +
          chartH -
          (v / max) * chartH;

        return `
          <line
            x1="${left}"
            y1="${y}"
            x2="${width - right}"
            y2="${y}"
            class="chart-grid"
          />

          <text
            x="${left - 12}"
            y="${y + 4}"
            text-anchor="end"
            class="chart-axis"
          >
            ${v}${yLabel}
          </text>
        `;
      })
      .join("");

  const bars =
    data.map((item, i) => {
      const x =
        left +
        step * i +
        (step - barW) / 2;

      const h =
        Math.max(
          0,
          Math.min(
            item.value,
            max
          ) /
            max *
            chartH
        );

      const y =
        top +
        chartH -
        h;

      return `
        <g>
          <rect
            x="${x}"
            y="${y}"
            width="${barW}"
            height="${h}"
            rx="7"
            class="chart-bar"
          />

          <text
            x="${x + barW / 2}"
            y="${Math.max(
              15,
              y - 10
            )}"
            text-anchor="middle"
            class="chart-value"
          >
            ${item.value.toFixed(1)}%
          </text>

          <text
            x="${x + barW / 2}"
            y="${height - 27}"
            text-anchor="middle"
            class="chart-label"
          >
            ${item.label}
          </text>
        </g>
      `;
    })
    .join("");

  return `
    <svg
      id="${id}"
      viewBox="0 0 ${width} ${height}"
      class="insite-chart"
      role="img"
    >
      ${grid}

      <line
        x1="${left}"
        y1="${top + chartH}"
        x2="${width - right}"
        y2="${top + chartH}"
        class="chart-axis-line"
      />

      ${bars}
    </svg>
  `;
}

// ======================================================
// 산점도
// ======================================================

function renderScatterChart({
  id,
  points,
  xMin,
  xMax,
  yLabel,
  xLabel,
  xTicks,
  showTrend = true
}) {
  const width = 900;
  const height = 390;

  const left = 72;
  const right = 30;
  const top = 24;
  const bottom = 70;

  const chartW =
    width - left - right;

  const chartH =
    height - top - bottom;

  const ys =
    points.map(p => p.y);

  const rawMax =
    ys.length
      ? Math.max(...ys)
      : 100;

  const rawMin =
    ys.length
      ? Math.min(...ys)
      : 0;

  const yMax =
    rawMax === rawMin
      ? rawMax + 10
      : Math.ceil(
          rawMax * 1.15 / 10
        ) * 10;

  const yMin =
    Math.max(
      0,
      Math.floor(
        rawMin * 0.9 / 10
      ) * 10
    );

  const x = value =>
    left +
    (
      (value - xMin) /
      (xMax - xMin)
    ) *
    chartW;

  const y = value =>
    top +
    chartH -
    (
      (value - yMin) /
      (yMax - yMin)
    ) *
    chartH;

  let svg = `
    <svg
      id="${id}"
      viewBox="0 0 ${width} ${height}"
      class="insite-chart"
      role="img"
    >
  `;

  for (let i = 0; i <= 5; i++) {
    const value =
      yMin +
      (
        (yMax - yMin) /
        5
      ) *
      i;

    const yy = y(value);

    svg += `
      <line
        x1="${left}"
        y1="${yy}"
        x2="${width - right}"
        y2="${yy}"
        class="chart-grid"
      />

      <text
        x="${left - 12}"
        y="${yy + 4}"
        text-anchor="end"
        class="chart-axis"
      >
        ${value.toFixed(0)}
      </text>
    `;
  }

  xTicks.forEach(tick => {
    const xx = x(tick);

    svg += `
      <line
        x1="${xx}"
        y1="${top}"
        x2="${xx}"
        y2="${top + chartH}"
        class="chart-grid vertical"
      />

      <text
        x="${xx}"
        y="${height - 39}"
        text-anchor="middle"
        class="chart-label"
      >
        ${tick}
      </text>
    `;
  });

  svg += `
    <line
      x1="${left}"
      y1="${top + chartH}"
      x2="${width - right}"
      y2="${top + chartH}"
      class="chart-axis-line"
    />
  `;

  if (
    showTrend &&
    points.length >= 2
  ) {
    const r =
      regression(points);

    const lineX1 =
      x(xMin);

    const lineX2 =
      x(xMax);

    const lineY1 =
      y(
        r.slope * xMin +
        r.intercept
      );

    const lineY2 =
      y(
        r.slope * xMax +
        r.intercept
      );

    svg += `
      <line
        x1="${lineX1}"
        y1="${lineY1}"
        x2="${lineX2}"
        y2="${lineY2}"
        class="trend-line"
      />
    `;
  }

  points.forEach(point => {
    svg += `
      <circle
        cx="${x(point.x)}"
        cy="${y(point.y)}"
        r="6"
        class="scatter-point"
      >
        <title>
          ${point.participant || ""}
          · ${point.x}개
          · ${point.y.toFixed(1)}초
        </title>
      </circle>
    `;
  });

  svg += `
      <text
        x="${width / 2}"
        y="${height - 8}"
        text-anchor="middle"
        class="axis-title"
      >
        ${xLabel}
      </text>

      <text
        transform="translate(16 ${height / 2}) rotate(-90)"
        text-anchor="middle"
        class="axis-title"
      >
        ${yLabel}
      </text>
    </svg>
  `;

  return svg;
}

// ======================================================
// 그래프 4 산점도
// ======================================================

function renderProbabilityScatter(data) {
  const width = 900;
  const height = 380;

  const left = 72;
  const right = 30;
  const top = 24;
  const bottom = 68;

  const chartW =
    width - left - right;

  const chartH =
    height - top - bottom;

  const xMin = 0.5;
  const xMax = 3.5;

  const yMin = 0;
  const yMax = 100;

  const x = v =>
    left +
    (
      (v - xMin) /
      (xMax - xMin)
    ) *
    chartW;

  const y = v =>
    top +
    chartH -
    (
      (v - yMin) /
      (yMax - yMin)
    ) *
    chartH;

  const points =
    data.map(d => ({
      x: d.x,
      y: d.y
    }));

  const r =
    regression(points);

  let svg = `
    <svg
      viewBox="0 0 ${width} ${height}"
      class="insite-chart"
      role="img"
    >
  `;

  [0, 25, 50, 75, 100]
    .forEach(v => {
      const yy = y(v);

      svg += `
        <line
          x1="${left}"
          y1="${yy}"
          x2="${width - right}"
          y2="${yy}"
          class="chart-grid"
        />

        <text
          x="${left - 12}"
          y="${yy + 4}"
          text-anchor="end"
          class="chart-axis"
        >
          ${v}%
        </text>
      `;
    });

  [1, 2, 3]
    .forEach(v => {
      const xx = x(v);

      svg += `
        <line
          x1="${xx}"
          y1="${top}"
          x2="${xx}"
          y2="${top + chartH}"
          class="chart-grid vertical"
        />

        <text
          x="${xx}"
          y="${height - 39}"
          text-anchor="middle"
          class="chart-label"
        >
          ${v}개
        </text>
      `;
    });

  svg += `
    <line
      x1="${left}"
      y1="${top + chartH}"
      x2="${width - right}"
      y2="${top + chartH}"
      class="chart-axis-line"
    />
  `;

  if (points.length >= 2) {
    const lineX1 = x(xMin);
    const lineX2 = x(xMax);

    const lineY1 =
      y(
        Math.max(
          yMin,
          Math.min(
            yMax,
            r.slope * xMin +
            r.intercept
          )
        )
      );

    const lineY2 =
      y(
        Math.max(
          yMin,
          Math.min(
            yMax,
            r.slope * xMax +
            r.intercept
          )
        )
      );

    svg += `
      <line
        x1="${lineX1}"
        y1="${lineY1}"
        x2="${lineX2}"
        y2="${lineY2}"
        class="trend-line"
      />
    `;
  }

  data.forEach(item => {
    svg += `
      <circle
        cx="${x(item.x)}"
        cy="${y(item.y)}"
        r="7"
        class="scatter-point"
      />

      <text
        x="${x(item.x)}"
        y="${y(item.y) - 13}"
        text-anchor="middle"
        class="chart-value"
      >
        ${item.y.toFixed(1)}%
      </text>
    `;
  });

  svg += `
    <text
      x="${width / 2}"
      y="${height - 8}"
      text-anchor="middle"
      class="axis-title"
    >
      정보의 개수
    </text>

    <text
      transform="translate(16 ${height / 2}) rotate(-90)"
      text-anchor="middle"
      class="axis-title"
    >
      상품 선택확률 (%)
    </text>
  </svg>
  `;

  return svg;
}

// ======================================================
// 함수식 + R²
// ======================================================

function regressionText(points) {
  if (points.length < 2) {
    return `
      데이터가 2개 이상 쌓이면
      추세선과 함수 모델을 계산합니다.
    `;
  }

  const r =
    regression(points);

  const sign =
    r.intercept >= 0
      ? "+"
      : "-";

  return `
    <strong>
      함수 모델:
      y =
      ${r.slope.toFixed(3)}x
      ${sign}
      ${Math.abs(
        r.intercept
      ).toFixed(3)}
    </strong>

    &nbsp; · &nbsp;

    R² =
    ${r.r2.toFixed(3)}
  `;
}

// ======================================================
// 대시보드
// ======================================================

function renderDashboard() {
  const completed =
    completedRows();

  const g1 =
    graph1Data();

  const g2 =
    graph2Data();

  const g3 =
    graph3Data();

  const g4 =
    graph4Data();

  const g5 =
    graph5Data();

  const avgTime =
    average(
      validTimeRows().map(
        row => row.decision_time
      )
    );

  const dropoutCount =
    experimentData.filter(
      row =>
        row.status === "started"
    ).length;

  app.innerHTML = `
    <div class="admin-page insite-admin-page">

      <header class="admin-header">

        <div class="logo-area">

          <div class="logo">
            INSITE
          </div>

          <div class="logo-divider"></div>

          <div class="admin-title">
            관리자 대시보드
          </div>

        </div>

        <div class="header-actions">

          <button
            id="refresh-button"
            class="header-button"
          >
            ↻ 새로고침
          </button>

          <button
            id="csv-button"
            class="header-button primary"
          >
            CSV 다운로드
          </button>

        </div>

      </header>

      <main class="admin-container">

        <div class="page-heading">

          <div class="page-kicker">
            INSITE EXPERIMENT
          </div>

          <h1>
            스마트폰 구매 실험 분석
          </h1>

          <p>
            정보 제공 방식과 소비자 선택 행동의 관계를
            정량적으로 분석합니다.
          </p>

        </div>

        <section class="stat-grid">

          <div class="stat-card">

            <div class="stat-label">
              전체 기록
            </div>

            <div class="stat-value">
              ${number(
                experimentData.length
              )}
            </div>

            <div class="stat-description">
              실험 시작 기록 포함
            </div>

          </div>

          <div class="stat-card">

            <div class="stat-label">
              완료 참가자
            </div>

            <div class="stat-value">
              ${number(
                completed.length
              )}
            </div>

            <div class="stat-description">
              최종 상품 선택 완료
            </div>

          </div>

          <div class="stat-card">

            <div class="stat-label">
              중도 이탈 추정
            </div>

            <div class="stat-value">
              ${number(
                dropoutCount
              )}
            </div>

            <div class="stat-description">
              시작 후 완료되지 않은 기록
            </div>

          </div>

          <div class="stat-card">

            <div class="stat-label">
              평균 선택시간
            </div>

            <div class="stat-value">
              ${seconds(
                avgTime
              )}
            </div>

            <div class="stat-description">
              300초 이하 데이터 기준
            </div>

          </div>

        </section>

        <!-- 그래프 1 -->

        <section
          class="dashboard-section graph-section"
        >

          <div class="section-header">

            <h2>
              ① 상품 유형별 선택률
            </h2>

            <p>
              각 정보 제공 유형의 상품을 참가자가 최종 선택한 비율입니다.
            </p>

          </div>

          <div class="card graph-card">

            ${renderBarChart({
              id: "graph1",
              data: g1
            })}

          </div>

        </section>

        <!-- 그래프 2 -->

        <section
          class="dashboard-section graph-section"
        >

          <div class="section-header">

            <h2>
              ② 정보 확인 → 상품 선택 전환율
            </h2>

            <p>
              해당 정보가 포함된 상세페이지를
              확인한 참가자 중 같은 정보가 포함된
              상품을 최종 선택한 비율입니다.
            </p>

          </div>

          <div class="card graph-card">

            ${renderBarChart({
              id: "graph2",
              data: g2
            })}

          </div>

        </section>

        <!-- 그래프 3 -->

        <section
          class="dashboard-section graph-section"
        >

          <div class="section-header">

            <h2>
              ③ 정보량과 선택시간의 관계
            </h2>

            <p>
              점 하나가 참가자 한 명이며,
              최종 선택 상품의 정보 개수와
              선택까지 걸린 시간을 비교합니다.
            </p>

          </div>

          <div class="card graph-card">

            ${
              g3.length
                ? renderScatterChart({
                    id: "graph3",
                    points: g3,
                    xMin: 0.5,
                    xMax: 3.5,
                    yLabel:
                      "선택시간 (초)",
                    xLabel:
                      "최종 선택 상품의 정보 개수",
                    xTicks:
                      [1, 2, 3],
                    showTrend:
                      true
                  })

                : `
                  <div class="empty-chart">
                    완료 참가자 데이터가 없습니다.
                  </div>
                `
            }

          </div>

          <div class="model-box">

            ${regressionText(g3)}

          </div>

        </section>

        <!-- 그래프 4 -->

        <section
          class="dashboard-section graph-section"
        >

          <div class="section-header">

            <h2>
              ④ 정보량과 선택확률의 관계
            </h2>

            <p>
              정보가 1개, 2개, 3개 제공된
              상품군의 실제 선택확률을 나타냅니다.
            </p>

          </div>

          <div class="card graph-card">

            ${renderProbabilityScatter(g4)}

          </div>

          <div class="model-box">

            ${regressionText(g4)}

          </div>

        </section>

        <!-- 그래프 5 -->

        <section
          class="dashboard-section graph-section"
        >

          <div class="section-header">

            <h2>
              ⑤ 정보 유형별 이탈률
            </h2>

            <p>
              해당 정보가 포함된 상세페이지를
              확인한 참가자 중 최종 선택까지
              완료하지 않은 비율입니다.
            </p>

          </div>

          <div class="card graph-card">

            ${renderBarChart({
              id: "graph5",
              data: g5
            })}

          </div>

        </section>

        <div class="analysis-note">

          <strong>
            분석 기준
          </strong>

          <br>

          그래프는 현재 Supabase의
          <code>
            experiment_data
          </code>
          에 저장된 실제 참가자 데이터를
          기준으로 자동 계산됩니다.

          데이터가 추가되면 새로고침 시
          그래프도 다시 계산됩니다.

          선택시간 분석에서는
          300초를 초과한 데이터를 이상치로 보고
          평균 선택시간과 그래프 3에서 제외합니다.
          단, 원본 데이터는 삭제하지 않습니다.

        </div>

        <div class="dashboard-footer">
          INSITE Smartphone Purchase Experiment
        </div>

      </main>

    </div>
  `;

  document
    .querySelector(
      "#refresh-button"
    )
    ?.addEventListener(
      "click",
      loadData
    );

  document
    .querySelector(
      "#csv-button"
    )
    ?.addEventListener(
      "click",
      downloadCSV
    );
}

// ======================================================
// 로딩
// ======================================================

function renderLoading() {
  app.innerHTML = `
    <div class="loading">
      실험 데이터를
      불러오는 중입니다...
    </div>
  `;
}

// ======================================================
// 오류
// ======================================================

function renderError(error) {
  app.innerHTML = `
    <div class="error-card">

      <h2>
        데이터를 불러오지 못했습니다.
      </h2>

      <p>
        Supabase SELECT 정책과
        연결 상태를 확인해주세요.
      </p>

      <code>
        ${error?.message || "Unknown error"}
      </code>

      <button
        id="retry-button"
      >
        다시 불러오기
      </button>

    </div>
  `;

  document
    .querySelector(
      "#retry-button"
    )
    ?.addEventListener(
      "click",
      loadData
    );
}

// ======================================================
// CSV 다운로드
// ======================================================

function downloadCSV() {
  if (!experimentData.length) {
    alert(
      "다운로드할 데이터가 없습니다."
    );

    return;
  }

  const headers = [
    "participant_id",
    "status",
    "final_choice",

    "a_detail_visited",
    "b_detail_visited",
    "c_detail_visited",
    "d_detail_visited",
    "e_detail_visited",
    "f_detail_visited",
    "g_detail_visited",

    "a_detail_views",
    "b_detail_views",
    "c_detail_views",
    "d_detail_views",
    "e_detail_views",
    "f_detail_views",
    "g_detail_views",

    "detail_view_sequence",

    "decision_time",

    "started_at",
    "completed_at",
    "created_at"
  ];

  const rows =
    experimentData.map(row => [
      row.participant_id,

      row.status,

      row.final_choice,

      getVisited(row, "A"),
      getVisited(row, "B"),
      getVisited(row, "C"),
      getVisited(row, "D"),
      getVisited(row, "E"),
      getVisited(row, "F"),
      getVisited(row, "G"),

      getViews(row, "A"),
      getViews(row, "B"),
      getViews(row, "C"),
      getViews(row, "D"),
      getViews(row, "E"),
      getViews(row, "F"),
      getViews(row, "G"),

      getSequence(row).join(">"),

      row.decision_time,

      row.started_at,

      row.completed_at,

      row.created_at
    ]);

  const csv = [
    headers,
    ...rows
  ]
    .map(row =>
      row
        .map(value =>
          `"${String(
            value ?? ""
          ).replaceAll(
            '"',
            '""'
          )}"`
        )
        .join(",")
    )
    .join("\n");

  const blob =
    new Blob(
      [
        "\uFEFF" +
        csv
      ],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    `INSITE_experiment_data_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );
}

// ======================================================
// 그래프 전용 스타일
// ======================================================

const style =
  document.createElement(
    "style"
  );

style.textContent = `

  .insite-admin-page
  .graph-section {
    margin-bottom: 58px;
  }

  .insite-admin-page
  .graph-card {
    padding:
      18px 22px 12px;
    overflow-x:
      auto;
  }

  .insite-chart {
    width: 100%;
    min-width:
      680px;
    height: auto;
    display: block;
  }

  .chart-grid {
    stroke:
      #e5e7eb;
    stroke-width:
      1;
  }

  .chart-grid.vertical {
    opacity:
      .45;
  }

  .chart-axis-line {
    stroke:
      #9ca3af;
    stroke-width:
      1.2;
  }

  .chart-axis {
    fill:
      #9ca3af;
    font-size:
      11px;
  }

  .chart-label {
    fill:
      #4b5563;
    font-size:
      12px;
    font-weight:
      700;
  }

  .chart-value {
    fill:
      #111827;
    font-size:
      11px;
    font-weight:
      800;
  }

  .axis-title {
    fill:
      #6b7280;
    font-size:
      12px;
    font-weight:
      700;
  }

  .chart-bar {
    fill:
      #e53935;
    transition:
      opacity .15s;
  }

  .chart-bar:hover {
    opacity:
      .72;
  }

  .scatter-point {
    fill:
      #e53935;
    stroke:
      #ffffff;
    stroke-width:
      2;
  }

  .trend-line {
    stroke:
      #e53935;
    stroke-width:
      2.5;
    stroke-dasharray:
      7 5;
  }

  .model-box {
    margin-top:
      10px;
    background:
      #ffffff;
    border:
      1px solid #e5e7eb;
    border-radius:
      10px;
    padding:
      14px 17px;
    color:
      #6b7280;
    font-size:
      13px;
  }

  .model-box strong {
    color:
      #111827;
  }

  .analysis-note {
    margin-top:
      10px;
    padding:
      16px 18px;
    background:
      #ffffff;
    border:
      1px solid #e5e7eb;
    border-radius:
      10px;
    color:
      #6b7280;
    font-size:
      12px;
    line-height:
      1.75;
  }

  .analysis-note strong {
    color:
      #111827;
  }

  .analysis-note code {
    background:
      #f3f4f6;
    padding:
      2px 5px;
    border-radius:
      4px;
  }

  .empty-chart {
    height:
      350px;
    display:
      grid;
    place-items:
      center;
    color:
      #9ca3af;
  }

  @media (max-width: 760px) {

    .insite-admin-page
    .graph-card {
      padding:
        10px;
    }

    .insite-chart {
      min-width:
        620px;
    }

  }

`;

document.head.appendChild(
  style
);

// ======================================================
// 실행
// ======================================================

loadData();
