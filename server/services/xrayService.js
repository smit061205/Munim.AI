// A look inside the portfolio: costs that can be cut, funds that hold the same
// things, and where too much sits in one place. Worked out from fund names and
// trades, so it is an estimate rather than a holdings-level analysis.

const round = (value) => Math.round(value || 0);

// Fund houses, longest names first so "ICICI Prudential" wins over "ICICI"
const FUND_HOUSES = [
  "Aditya Birla Sun Life", "ICICI Prudential", "Nippon India", "Parag Parikh", "Motilal Oswal",
  "Mirae Asset", "Franklin Templeton", "Kotak Mahindra", "Bandhan", "Canara Robeco", "Edelweiss",
  "Invesco India", "Quant", "Tata", "UTI", "SBI", "HDFC", "Axis", "DSP", "Kotak", "Nippon", "PGIM India",
  "Sundaram", "Navi", "Groww", "Zerodha", "Franklin", "Mahindra Manulife", "HSBC", "Baroda BNP Paribas",
].sort((a, b) => b.length - a.length);

const fundHouse = (name = "") => {
  const lower = name.toLowerCase();
  return FUND_HOUSES.find((house) => lower.startsWith(house.toLowerCase())) || null;
};

// Funds that follow the same style tend to hold the same large companies
const STYLES = [
  { key: "nifty50", label: "Nifty 50 index", test: /nifty\s*50\b(?!.*next)|sensex/ },
  { key: "large", label: "large cap", test: /large\s*cap|bluechip|blue chip|top\s*100/ },
  { key: "flexi", label: "flexi or multi cap", test: /flexi\s*cap|multi\s*cap|focused/ },
  { key: "mid", label: "mid cap", test: /mid\s*cap|midcap/ },
  { key: "small", label: "small cap", test: /small\s*cap|smallcap/ },
  { key: "elss", label: "tax saver (ELSS)", test: /elss|tax\s*saver|taxsaver|long term equity/ },
  { key: "value", label: "value or contra", test: /value|contra|dividend yield/ },
];

const isEquityFund = (holding) => holding.kind === "mutual_fund" && holding.assetClass === "equity";

// A regular plan pays the distributor from the fund every year. The gap to the
// direct plan is usually 0.5% to 1.5% a year.
const REGULAR_GAP = { equity: 0.009, debt: 0.004, gold: 0.004 };

const daysBetween = (from, to) => (new Date(to) - new Date(from)) / 86400000;

export const buildXray = (holdings, today) => {
  const value = holdings.reduce((sum, item) => sum + item.value, 0);
  if (!value) return null;
  const funds = holdings.filter((item) => item.kind === "mutual_fund" && item.value > 0);

  const regular = funds
    .filter((fund) => !/direct/i.test(fund.name || ""))
    .map((fund) => ({
      id: fund.id,
      name: fund.name,
      value: round(fund.value),
      // Index funds charge less, so the gap between plans is smaller too
    yearlyCost: round(fund.value * (/index|nifty|sensex|etf/i.test(fund.name || "") ? 0.004 : REGULAR_GAP[fund.assetClass] || REGULAR_GAP.equity)),
    }));

  const overlaps = STYLES.map((style) => {
    const matching = funds.filter((fund) => isEquityFund(fund) || style.key === "nifty50")
      .filter((fund) => style.test.test((fund.name || "").toLowerCase()));
    return matching.length >= 2
      ? { style: style.label, funds: matching.map((fund) => fund.name), value: round(matching.reduce((sum, fund) => sum + fund.value, 0)) }
      : null;
  }).filter(Boolean);

  const houses = {};
  // Only funds whose house is recognised from the name; the rest are left out
  for (const fund of funds) {
    const house = fundHouse(fund.name);
    if (house) houses[house] = (houses[house] || 0) + fund.value;
  }
  const byHouse = Object.entries(houses)
    .map(([name, amount]) => ({ name, value: round(amount), percent: Math.round((amount / value) * 100) }))
    .sort((a, b) => b.value - a.value);

  const largest = holdings[0];
  const concentration = [];
  if (largest && largest.value / value > 0.25 && holdings.length > 1) {
    concentration.push(`${largest.name} is ${Math.round((largest.value / value) * 100)}% of your investments.`);
  }
  const stocksValue = holdings.filter((item) => item.kind === "stock").reduce((sum, item) => sum + item.value, 0);
  const sectors = {};
  for (const stock of holdings.filter((item) => item.kind === "stock" && item.detail)) {
    sectors[stock.detail] = (sectors[stock.detail] || 0) + stock.value;
  }
  const [topSector] = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
  if (topSector && stocksValue > 0 && topSector[1] / stocksValue > 0.4 && Object.keys(sectors).length > 1) {
    concentration.push(`${Math.round((topSector[1] / stocksValue) * 100)}% of your shares are in ${topSector[0]}.`);
  }
  if (byHouse[0] && byHouse[0].percent > 50 && byHouse.length > 1) {
    concentration.push(`${byHouse[0].percent}% of your investments are with one fund house, ${byHouse[0].name}.`);
  }

  // Most equity funds charge 1% if units are sold within a year of buying
  const exitLoad = funds
    .filter(isEquityFund)
    .map((fund) => {
      const recent = (fund.trades || []).filter(
        (trade) => trade.type === "buy" && daysBetween(trade.date, today) < 365,
      );
      if (!recent.length) return null;
      const units = recent.reduce((sum, trade) => sum + trade.units, 0);
      // The oldest of these units are the next to come free
      const oldest = recent.map((trade) => trade.date).sort()[0];
      const free = new Date(oldest);
      free.setUTCFullYear(free.getUTCFullYear() + 1);
      return {
        name: fund.name,
        value: round(Math.min(fund.value, units * (fund.price || 0)) || recent.reduce((sum, trade) => sum + trade.amount, 0)),
        freeFrom: free.toISOString().slice(0, 10),
      };
    })
    .filter(Boolean);

  return {
    regular,
    regularYearlyCost: round(regular.reduce((sum, fund) => sum + fund.yearlyCost, 0)),
    overlaps,
    byHouse: byHouse.slice(0, 6),
    concentration,
    exitLoad,
  };
};
