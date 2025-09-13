import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const NetWorthChart = ({ assets = [], liabilities = [] }) => {
  // Calculate total assets and liabilities
  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = liabilities.reduce(
    (sum, liability) => sum + liability.balance,
    0
  );
  const netWorth = totalAssets - totalLiabilities;

  // Generate sample historical data (in real app, this would come from backend)
  const generateHistoricalData = () => {
    const months = [];
    const assetsData = [];
    const liabilitiesData = [];
    const netWorthData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push(
        date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      );

      // Simulate gradual growth/changes
      const assetVariation = totalAssets * (0.95 + Math.random() * 0.1);
      const liabilityVariation =
        totalLiabilities * (0.95 + Math.random() * 0.1);

      assetsData.push(assetVariation);
      liabilitiesData.push(liabilityVariation);
      netWorthData.push(assetVariation - liabilityVariation);
    }

    return { months, assetsData, liabilitiesData, netWorthData };
  };

  const { months, assetsData, liabilitiesData, netWorthData } =
    generateHistoricalData();

  const chartData = {
    labels: months,
    datasets: [
      {
        label: "Assets",
        data: assetsData,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.1,
      },
      {
        label: "Liabilities",
        data: liabilitiesData,
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.1,
      },
      {
        label: "Net Worth",
        data: netWorthData,
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        tension: 0.1,
        borderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#374151",
        },
      },
      title: {
        display: true,
        text: "Net Worth Trend",
        color: "#111827",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#6b7280",
          callback: function (value) {
            return "$" + value.toLocaleString();
          },
        },
        grid: {
          color: "#e5e7eb",
        },
      },
      x: {
        ticks: {
          color: "#6b7280",
        },
        grid: {
          color: "#e5e7eb",
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default NetWorthChart;
