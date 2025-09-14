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
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const NetWorthChart = ({
  data = null,
  totalAssets = 0,
  totalLiabilities = 0,
  totalInvestments = 0,
  netWorth = 0,
}) => {
  // Process data based on what's provided
  const processChartData = () => {
    // If backend provides chart-ready data
    if (data && data.labels && data.values) {
      return {
        labels: data.labels,
        netWorthData: data.values,
        assetsData: data.labels.map(() => totalAssets),
        liabilitiesData: data.labels.map(() => totalLiabilities),
      };
    }

    // If backend provides monthly data
    if (data && data.monthlyData) {
      return {
        labels: data.monthlyData.map((item) => item.month),
        netWorthData: data.monthlyData.map((item) => item.netWorth),
        assetsData: data.monthlyData.map(() => totalAssets),
        liabilitiesData: data.monthlyData.map(() => totalLiabilities),
      };
    }

    // Fallback: Generate sample historical data
    const months = [];
    const assetsData = [];
    const liabilitiesData = [];
    const netWorthData = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push(
        date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      );

      // Simulate gradual growth to current values
      const growthFactor = (12 - i) / 12;
      const assetValue = totalAssets * (0.7 + 0.3 * growthFactor);
      const liabilityValue = totalLiabilities * (0.8 + 0.2 * growthFactor);

      assetsData.push(assetValue);
      liabilitiesData.push(liabilityValue);
      netWorthData.push(assetValue - liabilityValue);
    }

    return { labels: months, assetsData, liabilitiesData, netWorthData };
  };

  const { labels, assetsData, liabilitiesData, netWorthData } =
    processChartData();

  const chartData = {
    labels,
    datasets: [
      {
        label: "Assets",
        data: assetsData,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: false,
        borderWidth: 3,
        pointBackgroundColor: "rgb(16, 185, 129)",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: "Liabilities",
        data: liabilitiesData,
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: false,
        borderWidth: 3,
        pointBackgroundColor: "rgb(239, 68, 68)",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: "Net Worth",
        data: netWorthData,
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        tension: 0.4,
        fill: true,
        borderWidth: 4,
        pointBackgroundColor: "rgb(79, 70, 229)",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#d1d5db",
          font: {
            size: 14,
            weight: "500",
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context) {
            return `${
              context.dataset.label
            }: ₹${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#9ca3af",
          font: {
            size: 12,
          },
          callback: function (value) {
            return (value / 100000).toFixed(1) + "L";
          },
        },
        grid: {
          color: "rgba(55, 65, 81, 0.5)",
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: "#9ca3af",
          font: {
            size: 12,
          },
        },
        grid: {
          color: "rgba(55, 65, 81, 0.3)",
          drawBorder: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    elements: {
      line: {
        tension: 0.4,
      },
    },
  };

  if (labels.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400">
        No net worth data available
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default NetWorthChart;
