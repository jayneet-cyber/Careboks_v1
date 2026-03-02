import { supabase } from "@/integrations/supabase/client";

export type TotpFactor = {
  id: string;
  status?: string;
  friendly_name?: string;
  factor_type?: string;
};

const getTotpFactors = (data: unknown): TotpFactor[] => {
  if (!data || typeof data !== "object") {
    return [];
  }

  const maybeTotp = (data as { totp?: unknown }).totp;
  return Array.isArray(maybeTotp) ? (maybeTotp as TotpFactor[]) : [];
};

export const listTotpFactors = async () => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  return {
    factors: getTotpFactors(data),
    error,
  };
};

export const hasVerifiedTotpFactor = (factors: TotpFactor[]) => {
  return factors.some((factor) => factor.status === "verified");
};

export const getPrimaryVerifiedTotpFactor = (factors: TotpFactor[]) => {
  return factors.find((factor) => factor.status === "verified") ?? null;
};

export const enrollTotpFactor = async (friendlyName = "Authenticator app") => {
  return supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
};

export const verifyTotpCode = async (factorId: string, code: string) => {
  const mfaApi = supabase.auth.mfa as {
    challengeAndVerify?: (args: { factorId: string; code: string }) => Promise<{
      data: unknown;
      error: { message: string } | null;
    }>;
  };

  if (typeof mfaApi.challengeAndVerify === "function") {
    return mfaApi.challengeAndVerify({ factorId, code });
  }

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (challengeError) {
    return { data: null, error: challengeError };
  }

  return supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
};

export const getAuthenticatorAssuranceLevel = async () => {
  return supabase.auth.mfa.getAuthenticatorAssuranceLevel();
};
