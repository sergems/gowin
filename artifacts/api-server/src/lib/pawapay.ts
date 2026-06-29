import { getMetaSetting } from "./metaDb";
import { logger } from "./logger";

export const PAWAPAY_SANDBOX_URL = "https://api.sandbox.pawapay.io";
export const PAWAPAY_PROD_URL = "https://api.pawapay.io";

// DRC mobile money operators — correct PawaPay correspondent codes for COD
export const DRC_OPERATORS = [
  { code: "VODACOM_MPESA_COD", name: "M-Pesa (Vodacom)", currencies: ["CDF", "USD"] },
  { code: "AIRTEL_COD",        name: "Airtel Money",     currencies: ["CDF", "USD"] },
  { code: "ORANGE_COD",        name: "Orange Money",     currencies: ["CDF", "USD"] },
];

// DRC sandbox test phone numbers (magic numbers from PawaPay docs)
export const DRC_TEST_NUMBERS: Record<string, { phone: string; expectedStatus: string; failureCode?: string }[]> = {
  VODACOM_MPESA_COD: [
    { phone: "243813456789", expectedStatus: "COMPLETED" },
    { phone: "243813456129", expectedStatus: "SUBMITTED" },
    { phone: "243813456019", expectedStatus: "FAILED", failureCode: "PAYER_LIMIT_REACHED" },
    { phone: "243813456029", expectedStatus: "FAILED", failureCode: "PAYER_NOT_FOUND" },
    { phone: "243813456039", expectedStatus: "FAILED", failureCode: "PAYMENT_NOT_APPROVED" },
    { phone: "243813456049", expectedStatus: "FAILED", failureCode: "INSUFFICIENT_BALANCE" },
    { phone: "243813456069", expectedStatus: "FAILED", failureCode: "UNSPECIFIED_FAILURE" },
  ],
  AIRTEL_COD: [
    { phone: "243973456789", expectedStatus: "COMPLETED" },
    { phone: "243973456129", expectedStatus: "SUBMITTED" },
    { phone: "243973456069", expectedStatus: "FAILED", failureCode: "UNSPECIFIED_FAILURE" },
  ],
  ORANGE_COD: [
    { phone: "243893456789", expectedStatus: "COMPLETED" },
    { phone: "243893456129", expectedStatus: "SUBMITTED" },
    { phone: "243893456029", expectedStatus: "FAILED", failureCode: "PAYER_NOT_FOUND" },
    { phone: "243893456039", expectedStatus: "FAILED", failureCode: "PAYMENT_NOT_APPROVED" },
    { phone: "243893456049", expectedStatus: "FAILED", failureCode: "INSUFFICIENT_BALANCE" },
    { phone: "243893456069", expectedStatus: "FAILED", failureCode: "UNSPECIFIED_FAILURE" },
  ],
};

export interface PawapayConfig {
  apiToken: string;
  isSandbox: boolean;
  baseUrl: string;
  enabled: boolean;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
}

export async function getPawapayConfig(): Promise<PawapayConfig | null> {
  const [token, enabled, sandbox, depositsEnabled, withdrawalsEnabled, minDep, maxDep, minWith, maxWith] = await Promise.all([
    getMetaSetting("pawapay_api_token"),
    getMetaSetting("pawapay_enabled"),
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
    enabled: enabled !== "false",
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

export async function checkAvailability(
  config: PawapayConfig
): Promise<{ ok: boolean; status: number; data: any }> {
  return pawapayRequest(config, "GET", "/availability");
}
