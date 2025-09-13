import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const InvestmentChart = ({ data = null, investments = [] }) => {
  // Process data based on what's provided
  const processChartData = () => {
    // If backend provides spending categories data
    if (data && data.categories) {
      return {
        labels: data.categories.map((cat) => cat.name),
        values: data.categories.map((cat) => cat.amount || cat.value),
        colors: data.categories.map((cat) => cat.color),
      };
    }

    // If backend provides investment composition data
    if (data && data.composition) {
      return {
        labels: data.composition.map((item) => item.type || item.name),
        values: data.composition.map((item) => item.value || item.amount),
        colors: data.composition.map((item) => item.color),
      };
    }

    // If backend provides simple array format
    if (data && Array.isArray(data)) {
      return {
        labels: data.map((item) => item.name || item.type || item.label),
        values: data.map((item) => item.value || item.amount),
        colors: data.map((item) => item.color),
      };
    }

    // Fallback: process investments array
    if (investments.length > 0) {
      return {
        labels: investments.map((inv) => inv.type || inv.name),
        values: investments.map((inv) => inv.value || inv.currentValue),
        colors: null, // Use default colors
      };
    }

    return { labels: [], values: [], colors: null };
  };

  const { labels, values, colors } = processChartData();

  // Default colors if not provided by backend
  const defaultColors = [
    "rgba(16, 185, 129, 0.8)",
    "rgba(79, 70, 229, 0.8)",
    "rgba(245, 158, 11, 0.8)",
    "rgba(239, 68, 68, 0.8)",
    "rgba(168, 85, 247, 0.8)",
    "rgba(236, 72, 153, 0.8)",
    "rgba(14, 165, 233, 0.8)",
    "rgba(34, 197, 94, 0.8)",
  ];

  const defaultBorderColors = [
    "rgb(16, 185, 129)",
    "rgb(79, 70, 229)",
    "rgb(245, 158, 11)",
    "rgb(239, 68, 68)",
    "rgb(168, 85, 247)",
    "rgb(236, 72, 153)",
    "rgb(14, 165, 233)",
    "rgb(34, 197, 94)",
  ];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Value",
        data: values,
        backgroundColor: colors || defaultColors.slice(0, labels.length),
        borderColor: colors
          ? colors.map((c) => c.replace("0.8", "1"))
          : defaultBorderColors.slice(0, labels.length),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#d1d5db",
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#374151",
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${
              context.label
            }: ₹${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (labels.length === 0 || values.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default InvestmentChart;
