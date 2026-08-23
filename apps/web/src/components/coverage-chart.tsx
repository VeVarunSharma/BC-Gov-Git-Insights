"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

interface CoverageDatum {
  dimension: string;
  observed: number;
  target: number;
}

export function CoverageChart({ data }: { data: CoverageDatum[] }) {
  const option: EChartsOption = {
    animationDuration: 500,
    grid: { left: 96, right: 24, top: 16, bottom: 28 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { formatter: "{value}%" },
    },
    yAxis: {
      type: "category",
      data: data.map((item) => item.dimension),
      axisLabel: { color: "#334155" },
    },
    series: [
      {
        name: "Evidence observed",
        type: "bar",
        data: data.map((item) => item.observed),
        itemStyle: {
          color: "#2563eb",
          borderRadius: [0, 6, 6, 0],
        },
        barWidth: 18,
      },
    ],
  };

  return (
    <div>
      <ReactECharts
        option={option}
        style={{ height: 290 }}
        opts={{ renderer: "svg" }}
        aria-label="Evidence coverage by metric dimension"
      />
      <table className="sr-only">
        <caption>Evidence coverage by metric dimension</caption>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Observed percentage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.dimension}>
              <td>{item.dimension}</td>
              <td>{item.observed}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
