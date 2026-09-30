import { z } from "zod";
export const configSchema = z.object({
  algorithm: z.enum(["DQN", "PPO"]),
  name: z.string().trim().min(3).max(70),
  asset: z.enum(["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL"]),
  seed: z.number().int().min(0).max(2147483647),
  episodes: z.number().int().min(4).max(40),
  capital: z.number().min(100).max(10000000),
  fee: z.number().min(0).max(0.05),
  datasetId: z.string().max(100).optional(),
});
export const networkSchema = z.object({
  w: z
    .array(z.array(z.number().finite().min(-100).max(100)).length(6))
    .length(12),
  b: z.array(z.number().finite().min(-100).max(100)).length(12),
  v: z
    .array(z.array(z.number().finite().min(-100).max(100)).length(12))
    .length(3),
  c: z.array(z.number().finite().min(-100).max(100)).length(3),
});
export const barSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  open: z.number().positive().finite(),
  high: z.number().positive().finite(),
  low: z.number().positive().finite(),
  close: z.number().positive().finite(),
  volume: z.number().positive().finite(),
});
