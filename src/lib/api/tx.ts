import { backendClient, type ApiResponse } from "./client";
import { type ChainId } from "./user";

// For Aptos Withdrawal
export interface AptosWithdrawalItem {
  fromStealthAddress: string;
  amount: string;
}

export interface PrepareAptosWithdrawalRequest {
  chain: ChainId;
  recipient: string;
  token: string;
  withdrawals: AptosWithdrawalItem[];
}

export interface AptosWithdrawalOutcome {
  index: number;
  ok: boolean;
  result: {
    transactionBytes: string;
    feePayerSignature: string;
    feePayerAddress: string;
    feePayerAuthenticator: string;
  } | null;
  error?: {
    code: string;
    message: string;
  };
}

export interface PrepareAptosWithdrawalResponse {
  outcomes: AptosWithdrawalOutcome[];
}

export interface PaymentDataItem {
  type: "note";
  value: string;
}

export interface PrepareAptosStealthPaymentRequest {
  chain: ChainId;
  fromAddress: string;
  recipientUsername: string;
  token: string;
  amount: string;
  paymentData?: PaymentDataItem[];
}

export interface PrepareAptosStealthPaymentResponse {
  outcome: {
    ok: boolean;
    result: {
      transactionBytes: string;
      feePayerSignature: string;
      feePayerAddress: string;
      feePayerAuthenticator: string;
    } | null;
  };
}

export const txService = {
  prepareAptosWithdrawal: (
    token: string,
    payload: PrepareAptosWithdrawalRequest
  ): Promise<ApiResponse<PrepareAptosWithdrawalResponse>> => {
    backendClient.setAuthToken(token);
    return backendClient.post("/tx/prepare-aptos-withdrawal", payload, {
      timeout: 20_000,
    });
  },

  prepareAptosStealthPayment: async (
    accessToken: string,
    payload: PrepareAptosStealthPaymentRequest
  ): Promise<ApiResponse<PrepareAptosStealthPaymentResponse>> => {
    backendClient.setAuthToken(accessToken);
    return backendClient.post("/tx/prepare-aptos-stealth-payment", payload);
  },

  saveAptosWithdrawalGroup: (
    token: string,
    withdrawalId: string,
    chain: ChainId
  ): Promise<ApiResponse<{ success: boolean }>> => {
    backendClient.setAuthToken(token);
    return backendClient.post<{ success: boolean }>(
      "/user/aptos/withdrawal-group",
      { withdrawalId },
      { params: { chain } }
    );
  },
};

