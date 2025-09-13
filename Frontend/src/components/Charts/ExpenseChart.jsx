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

const ExpenseChart = ({ data = null, transactions = [] }) => {
  // Process data based on what's provided
  const processChartData = () => {
    // If backend provides pre-processed data, use it
    if (data && data.monthlyData) {
      return {
        labels: data.monthlyData.map((item) => item.month),
        data: data.monthlyData.map((item) => item.expenses),
      };
    }

    // If backend provides chart-ready data
    if (data && data.labels && data.values) {
      return {
        labels: data.labels,
        data: data.values,
      };
    }

    // Fallback: process transactions manually
    const monthlyExpenses = {};

    transactions.forEach((transaction) => {
      if (transaction.amount < 0 || transaction.type === "expense") {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!monthlyExpenses[monthKey]) {
          monthlyExpenses[monthKey] = 0;
        }
        monthlyExpenses[monthKey] += Math.abs(transaction.amount);
      }
    });

    const sortedMonths = Object.keys(monthlyExpenses).sort();
    const labels = sortedMonths.map((month) => {
      const [year, monthNum] = month.split("-");
      return new Date(year, monthNum - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    });
    const chartData = sortedMonths.map((month) => monthlyExpenses[month]);

    return { labels, data: chartData };
  };

  const { labels, data: chartValues } = processChartData();

  const chartData = {
    labels,
    datasets: [
      {
        label: "Monthly Expenses",
        data: chartValues,
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: true,
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
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#9ca3af",
          font: {
            size: 11,
          },
          callback: function (value) {
            return "₹" + value.toLocaleString();
          },
        },
        grid: {
          color: "#374151",
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: "#9ca3af",
          font: {
            size: 11,
          },
        },
        grid: {
          color: "#374151",
          drawBorder: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  };

  if (labels.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400">
        No expense data available
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ExpenseChart;
