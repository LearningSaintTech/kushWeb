import { useState } from "react";

function SizeChart({ data }) {
  const [activeTab, setActiveTab] = useState("chart");

  if (!data) return null;

  const { headers = [], rows = [], measureImage = [], unit } = data;

  return (
    <div className="bg-white h-full flex flex-col">

      {/* 🔥 TITLE */}
      {/* <h2 className="text-center text-lg font-semibold tracking-wide py-4 border-b">
        SIZE CHART
      </h2> */}

      {/* 🔥 TABS */}
      <div className="flex justify-between px-6 text-sm border-b">
        <button
          onClick={() => setActiveTab("chart")}
          className={`py-3 ${
            activeTab === "chart"
              ? "border-b-2 border-black font-medium"
              : "text-gray-500"
          }`}
        >
          Size Chart
        </button>

        <button
          onClick={() => setActiveTab("measure")}
          className={`py-3 ${
            activeTab === "measure"
              ? "border-b-2 border-black font-medium"
              : "text-gray-500"
          }`}
        >
          How To Measure
        </button>
      </div>

      {/* 🔥 CONTENT */}
      <div className="p-4 overflow-y-auto flex-1">

        {/* ================= TAB 1: SIZE CHART ================= */}
        {activeTab === "chart" && (
          <>
            {/* TABLE */}
            {headers.length > 0 && rows.length > 0 && (
              <div className="overflow-x-auto border border-gray-300 mb-6">

                <table className="w-full text-xs sm:text-sm text-center border-collapse">

                  {/* HEADER */}
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 border text-left">SIZE</th>

                      {headers.map((h) => (
                        <th key={h.key} className="p-3 border">
                          {h.label.toUpperCase()} {unit && `(${unit})`}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* BODY */}
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">

                        {/* SIZE COLUMN */}
                        <td className="p-3 border font-medium bg-black text-white">
                          {row.size}
                        </td>

                        {/* VALUES */}
                        {headers.map((h) => (
                          <td key={h.key} className="p-3 border">
                            {row.measurements?.[h.key] ?? "-"}
                          </td>
                        ))}

                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            )}

            {/* 🔥 IMAGE BELOW TABLE */}
            {measureImage.length > 0 && (
              <div className="flex flex-col gap-4 items-center">
                {measureImage.map((img, i) => (
                  <img
                    key={i}
                    src={img.url || img}
                    alt="Size Guide"
                    className="max-w-full rounded"
                  />
                ))}
              </div>
            )}

            {/* EMPTY STATE */}
            {rows.length === 0 && measureImage.length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                Size chart not available
              </p>
            )}
          </>
        )}

        {/* ================= TAB 2: HOW TO MEASURE ================= */}
        {activeTab === "measure" && (
          <div className="flex flex-col gap-4 items-center">

            {measureImage.length > 0 ? (
              measureImage.map((img, i) => (
                <img
                  key={i}
                  src={img.url || img}
                  alt="How to measure"
                  className="max-w-full rounded"
                />
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No measurement guide available
              </p>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default SizeChart;