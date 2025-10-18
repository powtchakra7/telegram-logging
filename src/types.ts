export interface Config {
SESSION: string;
API_ID: string;
API_HASH: string;
INTERVAL: number; // seconds
TIMEZONE: string;
CHANNEL_ID: number | null;
MIN_GIFT_PRICE: number;
MAX_GIFT_PRICE: number;
PURCHASE_NON_LIMITED_GIFTS: boolean;
HIDE_SENDER_NAME: boolean;
GIFT_IDS: number[];
NUM_GIFTS: number;
GIFT_DELAY: number;
