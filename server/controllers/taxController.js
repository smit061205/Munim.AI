import { TaxProfile } from "../models/Planning.js";
import { ApiError } from "../middleware/errorHandler.js";
import { financialYear, getTaxSummary } from "../services/taxService.js";

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

const readFy = (value) => {
  const fy = value || financialYear();
  if (!/^\d{4}-\d{2}$/.test(fy)) throw new ApiError(400, "Choose a financial year like 2026-27");
  return fy;
};

export const taxSummary = handle(async (req, res) => {
  res.json({ success: true, data: await getTaxSummary(req.auth.userId, readFy(req.query.fy)) });
});

const AMOUNTS = ["salary", "other_income", "hra_exemption", "extra_80c", "nps_80ccd1b"];

export const saveTaxProfile = handle(async (req, res) => {
  const fy = readFy(req.body.fy);
  const update = { updated_at: new Date() };
  const unset = {};

  for (const key of AMOUNTS) {
    if (!(key in req.body)) continue;
    const value = req.body[key];
    // A cleared salary goes back to the estimate from income
    if (key === "salary" && (value === null || value === "")) {
      unset.salary = "";
      continue;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new ApiError(400, "Enter amounts of zero or more");
    update[key] = number;
  }
  for (const key of ["self_senior", "parents_senior"]) {
    if (key in req.body) update[key] = !!req.body[key];
  }

  await TaxProfile.findOneAndUpdate(
    { user_id: req.auth.userId, fy },
    { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { upsert: true },
  );
  res.json({ success: true, data: await getTaxSummary(req.auth.userId, fy) });
});
