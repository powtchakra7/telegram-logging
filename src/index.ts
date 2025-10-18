import { Config } from './types';
import { log } from './utils/logger';
import { readJson, writeJson } from './utils/fsHelpers';
import * as path from 'path';
import inquirer from 'inquirer';

const CONFIG_PATH = path.resolve(process.cwd(), 'src', 'config.example.json');
const HISTORY_PATH = path.resolve(process.cwd(), 'data', 'history.json');

async function loadConfig(): Promise<Config> {
  const cfg = await readJson(CONFIG_PATH);
  if (!cfg) {
    throw new Error(`Config not found at ${CONFIG_PATH}. Copy config.example.json and add credentials.`);
  }
  return cfg as Config;
}

// Simulated marketplace item
type MarketGift = {
  id: number;
  name: string;
  price: number; // in stars (or app currency)
  limited: boolean;
};

function fakeMarketPoll(): MarketGift[] {
  // returns a random list of gifts (simulated)
  const sample = [
    { id: 101, name: 'Starry Cat', price: rand(80, 180), limited: true },
    { id: 102, name: 'Golden Rocket', price: rand(120, 220), limited: true },
    { id: 103, name: 'Blue Heart', price: rand(10, 60), limited: false },
  ];
  // randomize a bit
  return sample.map(s => ({ ...s, price: Math.round(s.price * (0.9 + Math.random() * 0.4)) }));
}

function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function simulatePurchase(gift: MarketGift, cfg: Config) {
  log(`Attempting to purchase: ${gift.name} (id:${gift.id}) for ${gift.price}`);
  // basic checks
  if (gift.price < cfg.MIN_GIFT_PRICE) {
    log('Price below minimum, skipping.');
    return null;
  }
  if (gift.price > cfg.MAX_GIFT_PRICE) {
    log('Price above maximum, skipping.');
    return null;
  }
  if (!cfg.PURCHASE_NON_LIMITED_GIFTS && !gift.limited) {
    log('Non-limited gift and PURCHASE_NON_LIMITED_GIFTS=false, skipping.');
    return null;
  }
  // Simulate network delay
  await new Promise(r => setTimeout(r, 500 + Math.random() * 800));
  const success = Math.random() > 0.3; // 70% success rate in simulation
  if (!success) {
    log('Purchase failed (simulated network / race).');
    return null;
  }
  // record history
  const history = (await readJson(HISTORY_PATH)) || [];
  const entry = { id: gift.id, name: gift.name, price: gift.price, ts: new Date().toISOString() };
  history.push(entry);
  await writeJson(HISTORY_PATH, history);
  log('Purchase successful:', entry);
  return entry;
}

async function main() {
  log('Telegram Gift Sniper (mini) — starting');
  try {
    const cfg = await loadConfig();
    log('Loaded config. INTERVAL:', cfg.INTERVAL, 's');

    // simple interactive menu to start/stop
    const ans = await inquirer.prompt([
      { type: 'list', name: 'mode', message: 'Run mode', choices: ['simulate-once', 'run-loop', 'exit'] }
    ]);

    if (ans.mode === 'exit') {
      log('Exiting.');
      process.exit(0);
    }

    if (ans.mode === 'simulate-once') {
      const items = fakeMarketPoll();
      log('Market:', items);
      for (const it of items) {
        await simulatePurchase(it, cfg);
      }
      log('Done.');
      process.exit(0);
    }

    if (ans.mode === 'run-loop') {
      log('Entering continuous scan loop... (press CTRL+C to stop)');
      setInterval(async () => {
        const items = fakeMarketPoll();
        log('Polled market, items:', items.map(i => `${i.name}:${i.price}`).join(' | '));
        for (const it of items) {
          await simulatePurchase(it, cfg);
          await new Promise(r => setTimeout(r, cfg.GIFT_DELAY * 1000));
        }
      }, cfg.INTERVAL * 1000);

      // keep process alive
      process.stdin.resume();
    }

  } catch (e: any) {
    log('Fatal error:', e.message || e);
    process.exit(1);
  }
}

main();
