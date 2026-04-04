import { useMemo, useState } from "react";

function safeImageUrl(url) {
  if (url == null || typeof url !== "string") return "";
  const s = url.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return s;
  return s.replace(/ /g, "%20");
}

function plainMeasurements(row) {
  const m = row?.measurements;
  if (!m) return {};
  if (m instanceof Map) return Object.fromEntries(m);
  if (typeof m === "object") return m;
  return {};
}

function collectMeasureImages(parts) {
  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const arr = Array.isArray(part)
      ? part
      : typeof part === "string" && part.trim()
        ? [part]
        : [];
    for (const im of arr) {
      const raw = typeof im === "string" ? im : im?.url || "";
      const u = safeImageUrl(raw);
      if (u && !seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
  }
  return out;
}

function mapChartRows(rows) {
  return (rows || []).map((r) => ({
    size: r.size,
    measurements: plainMeasurements(r),
  }));
}

/**
 * When both `sizeCharts.in` and `sizeCharts.cm` exist, expose `dual` so the UI can toggle.
 * Otherwise: prefer inches, then cm, then legacy `sizeChart`.
 */
function normalizeSizeChartData(item) {
  if (!item) return null;

  const sc = item.sizeCharts;
  const inChart = sc?.in;
  const cmChart = sc?.cm;
  const inReady = inChart && (inChart.headers?.length > 0 || inChart.rows?.length > 0);
  const cmReady = cmChart && (cmChart.headers?.length > 0 || cmChart.rows?.length > 0);

  const measureImage = collectMeasureImages([
    inChart?.measureImage,
    cmChart?.measureImage,
    item.sizeChart?.measureImage,
  ]);

  if (inReady && cmReady) {
    const inHeaders = inChart.headers || [];
    const inRows = mapChartRows(inChart.rows || []);
    const cmHeaders = cmChart.headers || [];
    const cmRows = mapChartRows(cmChart.rows || []);
    const hasTable = inHeaders.length > 0 && inRows.length > 0 && cmHeaders.length > 0 && cmRows.length > 0;
    if (!hasTable && measureImage.length === 0) return null;
    return {
      dual: {
        in: { headers: inHeaders, rows: inRows, unit: "in" },
        cm: { headers: cmHeaders, rows: cmRows, unit: "cm" },
      },
      measureImage,
      hasTable: hasTable || measureImage.length > 0,
      headers: inHeaders,
      rows: inRows,
      unit: "in",
    };
  }

  let headers = [];
  let rows = [];
  let unit = "in";

  if (inReady) {
    headers = inChart.headers || [];
    rows = inChart.rows || [];
    unit = "in";
  } else if (cmReady) {
    headers = cmChart.headers || [];
    rows = cmChart.rows || [];
    unit = "cm";
  } else if (item.sizeChart) {
    const leg = item.sizeChart;
    headers = leg.headers || [];
    rows = leg.rows || [];
    unit = leg.unit === "cm" ? "cm" : "in";
  }

  const hasTable = headers.length > 0 && rows.length > 0;
  if (!hasTable && measureImage.length === 0) return null;

  return {
    dual: null,
    headers,
    rows: mapChartRows(rows),
    measureImage,
    unit,
    hasTable,
  };
}

function headerCellText(h, unit) {
  const base = (h.label || h.key || "").toString().trim();
  const upper = base.toUpperCase();
  if (/\([INCMC]{2}\)/i.test(upper)) return upper;
  if (unit) return `${upper} (${unit})`;
  return upper;
}

/**
 * @param {object} [props.item] — full product (uses sizeCharts + sizeChart)
 * @param {object} [props.data] — legacy shape { headers, rows, measureImage, unit }
 */
function SizeChart({ item, data: legacyData }) {
  const [activeTab, setActiveTab] = useState("chart");
  const [dualUnit, setDualUnit] = useState("in");

  const data = useMemo(() => {
    if (legacyData && (legacyData.headers?.length || legacyData.rows?.length || legacyData.measureImage?.length)) {
      const rows = (legacyData.rows || []).map((r) => ({
        size: r.size,
        measurements: plainMeasurements(r),
      }));
      const imgs = collectMeasureImages([legacyData.measureImage]);
      return {
        dual: null,
        headers: legacyData.headers || [],
        rows,
        measureImage: imgs,
        unit: legacyData.unit === "cm" ? "cm" : "in",
        hasTable: legacyData.headers?.length > 0 && rows.length > 0,
      };
    }
    return normalizeSizeChartData(item);
  }, [item, legacyData]);

  if (!data) return null;

  const { dual, measureImage, hasTable } = data;
  const active = dual ? dual[dualUnit] || dual.in : null;
  const headers = active?.headers ?? data.headers;
  const rows = active?.rows ?? data.rows;
  const unit = active?.unit ?? data.unit;
  const showUnitToggle =
    Boolean(dual) &&
    (dual.in.headers?.length ?? 0) > 0 &&
    (dual.in.rows?.length ?? 0) > 0 &&
    (dual.cm.headers?.length ?? 0) > 0 &&
    (dual.cm.rows?.length ?? 0) > 0;

  return (
    <div className="bg-white">
      <div className="px-5 pt-6 pb-2 sm:px-6 sm:pt-8">
        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] text-black sm:text-base">
          Size Chart
        </h2>
      </div>

      <div className="px-4 sm:px-6">
        <div className="border-b border-neutral-300">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab("chart")}
              className={`flex-1 py-3 text-center text-sm transition-colors ${
                activeTab === "chart"
                  ? "-mb-px border-b-2 border-black font-semibold text-black"
                  : "border-b-2 border-transparent font-medium text-neutral-500"
              }`}
            >
              Size Chart
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("measure")}
              className={`flex-1 py-3 text-center text-sm transition-colors ${
                activeTab === "measure"
                  ? "-mb-px border-b-2 border-black font-semibold text-black"
                  : "border-b-2 border-transparent font-medium text-neutral-500"
              }`}
            >
              How To Measure
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {activeTab === "chart" && (
          <>
            {showUnitToggle && (
              <div className="mb-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setDualUnit("in")}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors sm:text-sm ${
                    dualUnit === "in"
                      ? "bg-black text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  Inches
                </button>
                <button
                  type="button"
                  onClick={() => setDualUnit("cm")}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors sm:text-sm ${
                    dualUnit === "cm"
                      ? "bg-black text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  Centimetres
                </button>
              </div>
            )}
            {hasTable && (
              <div className="mb-6 overflow-x-auto">
                <table className="w-full border-collapse text-center text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-white">
                      <th className="border border-neutral-300 px-2 py-3 font-bold uppercase text-black sm:px-3">
                        Size
                      </th>
                      {headers.map((h) => (
                        <th
                          key={h.key || h.label}
                          className="border border-neutral-300 px-2 py-3 font-bold uppercase text-black sm:px-3"
                        >
                          {headerCellText(h, unit)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={`${row.size}-${i}`}>
                        <td className="border border-neutral-300 bg-black px-2 py-3 text-center text-sm font-bold uppercase text-white sm:px-3">
                          {row.size}
                        </td>
                        {headers.map((h) => (
                          <td
                            key={h.key}
                            className="border border-neutral-300 bg-white px-2 py-3 text-black sm:px-3"
                          >
                            {row.measurements?.[h.key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {measureImage.length > 0 && (
              <div className="flex flex-col items-center gap-4">
                {measureImage.map((src, i) => (
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt="Size guide"
                    className="max-h-[min(70vh,520px)] w-full max-w-full object-contain"
                  />
                ))}
              </div>
            )}

            {!hasTable && measureImage.length === 0 && (
              <p className="text-center text-sm text-neutral-500">Size chart not available</p>
            )}
          </>
        )}

        {activeTab === "measure" && (
          <div className="flex flex-col items-center gap-4">
            {measureImage.length > 0 ? (
              measureImage.map((src, i) => (
                <img
                  key={`m-${src}-${i}`}
                  src={src}
                  alt="How to measure"
                  className="max-h-[min(80vh,560px)] w-full max-w-full object-contain"
                />
              ))
            ) : (
              <p className="text-center text-sm text-neutral-500">No measurement guide available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SizeChart;
