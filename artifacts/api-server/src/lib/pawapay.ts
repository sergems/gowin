import { getMetaSetting } from "./metaDb";
import { logger } from "./logger";

export const PAWAPAY_SANDBOX_URL = "https://api.sandbox.pawapay.cloud";
export const PAWAPAY_PROD_URL = "https://api.pawapay.cloud";

// DRC mobile money operators
export const DRC_OPERATORS = [
  { code: "ORANGE_CD",   name: "Orange Money",     currencies: ["CDF", "USD"] },
  { code: "AIRTEL_CD",   name: "Airtel Money",      currencies: ["CDF", "USD"] },
  { code: "VODACOM_CD",  name: "M-Pesa (Vodacom)", currencies: ["CDF", "USD"] },
  { code: "AFRICELL_CD", name: "Africell Money",   currencies: ["CDF", "USD"] },
];

export interface PawapayConfig {
  apiToken: string;
  isSandbox: boolean;
  baseUrl: string;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
}

export async function getPawapayConfig(): Promise<PawapayConfig | null> {
  const [token, sandbox, depositsEnabled, withdrawalsEnabled, minDep, maxDep, minWith, maxWith] = await Promise.all([
    getMetaSetting("pawapay_api_token"),
    getMetaSetting("pawapay_sandbox"),
    getMetaSetting("pawapay_deposits_enabled"),
    getMetaSetting("pawapay_withdrawals_enabled"),
    getMetaSetting("pawapay_min_deposit"),
    getMetaSetting("pawapay_max_deposit"),
    getMetaSetting("pawapay_min_withdrawal"),
    getMetaSetting("pawapay_max_withdrawal"),
  ]);

  if (!token) return null;

  const isSandbox = sandbox !== "false";
  return {
    apiToken: token,
    isSandbox,
    baseUrl: isSandbox ? PAWAPAY_SANDBOX_URL : PAWAPAY_PROD_URL,
    depositsEnabled: depositsEnabled !== "false",
    withdrawalsEnabled: withdrawalsEnabled !== "false",
    minDeposit: parseFloat(minDep ?? "1"),
    maxDeposit: parseFloat(maxDep ?? "10000"),
    minWithdrawal: parseFloat(minWith ?? "1"),
    maxWithdrawal: parseFloat(maxWith ?? "10000"),
  };
}

async function pawapayRequest(
  config: PawapayConfig,
  method: "GET" | "POST",
  path: string,
  body?: object
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${config.baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    logger.error({ err, url, method }, "PawaPay API request failed");
    throw new Error(`PawaPay API unreachable: ${err.message}`);
  }
}

export async function initiateDeposit(
  config: PawapayConfig,
  depositId: string,
  amount: number,
  currency: string,
  phoneNumber: string,
  operator: string,
  description: string = "GoWin Deposit"
): Promise<{ ok: boolean; status: number; data: any }> {
  return pawapayRequest(config, "POST", "/deposits", {
    depositId,
    statementDescription: description.slice(0, 22),
    amount: amount.toFixed(2),
    currency,
    correspondent: operator,
    payer: {
      type: "MSISDN",
      address: { value: phoneNumber },
    },
    customerTimestamp: new Date().toISOString(),
  });
}

export async function getDepositStatus(
  config: PawapayConfig,
  depositId: string
): Promise<{ ok: boolean; status: number; data: any }> {
  return pawapayRequest(config, "GET", `/deposits/${depositId}`);
}

export async function initiatePayout(
  config: PawapayConfig,
  payoutId: string,
  amount: number,
  currency: string,
  phoneNumber: string,
  operator: string,
  description: string = "GoWin Payout"
): Promise<{ ok: boolean; status: number; data: any }> {
  return pawapayRequest(config, "POST", "/payouts", {
    payoutId,
    statementDescription: description.slice(0, 22),
    amount: amount.toFixed(2),
    currency,
    correspondent: operator,
    recipient: {
      type: "MSISDN",
      address: { value: phoneNumber },
    },
    customerTimestamp: new Date().toISOString(),
  });
}

export async function getPayoutStatus(
  config: PawapayConfig,
  payoutId: string
): Promise<{ ok: boolean; status: number; data: any }> {
  return pawapayRequest(config, "GET", `/payouts/${payoutId}`);
}
