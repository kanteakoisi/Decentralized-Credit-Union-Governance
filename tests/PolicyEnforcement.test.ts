import { describe, it, expect, beforeEach } from "vitest";
import { uintCV, stringUtf8CV, principalCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 401;
const ERR_INVALID_POLICY_ID = 402;
const ERR_INVALID_INTEREST_RATE = 403;
const ERR_INVALID_MAX_LOAN = 404;
const ERR_INVALID_MIN_COLLATERAL = 405;
const ERR_INVALID_PROPOSER = 406;
const ERR_INVALID_APPROVAL_HEIGHT = 407;
const ERR_POLICY_ALREADY_EXISTS = 408;
const ERR_NO_ACTIVE_POLICY = 409;
const ERR_INVALID_LOAN_AMOUNT = 410;
const ERR_INSUFFICIENT_COLLATERAL = 411;
const ERR_LOAN_NOT_ALLOWED = 412;
const ERR_INVALID_REPAYMENT_TERM = 413;
const ERR_INVALID_CREDIT_SCORE = 414;
const ERR_INVALID_MEMBER_STATUS = 415;
const ERR_POLICY_NOT_FOUND = 416;
const ERR_INVALID_UPDATE_PARAM = 417;
const ERR_MAX_POLICIES_EXCEEDED = 418;
const ERR_INVALID_POLICY_TYPE = 419;
const ERR_INVALID_GRACE_PERIOD = 420;
const ERR_INVALID_PENALTY_RATE = 421;
const ERR_INVALID_CURRENCY = 422;
const ERR_INVALID_LOCATION_RESTRICTION = 423;
const ERR_INVALID_MIN_LOAN = 424;
const ERR_INVALID_MAX_REPAYMENT = 425;
const ERR_VOTING_CONTRACT_NOT_SET = 426;

interface Policy {
  interestRate: number;
  maxLoanAmount: number;
  minLoanAmount: number;
  minCollateral: number;
  maxRepaymentTerm: number;
  minCreditScore: number;
  gracePeriod: number;
  penaltyRate: number;
  policyType: string;
  currency: string;
  locationRestriction: string;
  proposer: string;
  approvedAt: number;
  isActive: boolean;
}

interface PolicyHistory {
  updates: Array<{ updater: string; timestamp: number; changes: string }>;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class PolicyEnforcementMock {
  state: {
    nextPolicyId: number;
    maxPolicies: number;
    votingContract: string | null;
    activePolicyId: number | null;
    policies: Map<number, Policy>;
    policyHistory: Map<number, PolicyHistory>;
  } = {
    nextPolicyId: 0,
    maxPolicies: 100,
    votingContract: null,
    activePolicyId: null,
    policies: new Map(),
    policyHistory: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1VOTER";

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextPolicyId: 0,
      maxPolicies: 100,
      votingContract: null,
      activePolicyId: null,
      policies: new Map(),
      policyHistory: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1VOTER";
  }

  setVotingContract(contractPrincipal: string): Result<boolean> {
    if (this.caller !== "ST1VOTER") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.votingContract = contractPrincipal;
    return { ok: true, value: true };
  }

  addPolicy(
    interestRate: number,
    maxLoanAmount: number,
    minLoanAmount: number,
    minCollateral: number,
    maxRepaymentTerm: number,
    minCreditScore: number,
    gracePeriod: number,
    penaltyRate: number,
    policyType: string,
    currency: string,
    locationRestriction: string,
    proposer: string
  ): Result<number> {
    if (this.state.nextPolicyId >= this.state.maxPolicies) return { ok: false, value: ERR_MAX_POLICIES_EXCEEDED };
    if (this.state.votingContract === null) return { ok: false, value: ERR_VOTING_CONTRACT_NOT_SET };
    if (this.caller !== this.state.votingContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (interestRate <= 0 || interestRate > 2000) return { ok: false, value: ERR_INVALID_INTEREST_RATE };
    if (maxLoanAmount <= 0) return { ok: false, value: ERR_INVALID_MAX_LOAN };
    if (minLoanAmount <= 0) return { ok: false, value: ERR_INVALID_MIN_LOAN };
    if (minCollateral < 0) return { ok: false, value: ERR_INVALID_MIN_COLLATERAL };
    if (maxRepaymentTerm <= 0) return { ok: false, value: ERR_INVALID_MAX_REPAYMENT };
    if (minCreditScore < 0 || minCreditScore > 1000) return { ok: false, value: ERR_INVALID_CREDIT_SCORE };
    if (gracePeriod > 90) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
    if (penaltyRate > 5000) return { ok: false, value: ERR_INVALID_PENALTY_RATE };
    if (!["personal", "business", "eco-friendly"].includes(policyType)) return { ok: false, value: ERR_INVALID_POLICY_TYPE };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (locationRestriction.length > 100) return { ok: false, value: ERR_INVALID_LOCATION_RESTRICTION };
    if (proposer === this.caller) return { ok: false, value: ERR_INVALID_PROPOSER };

    const id = this.state.nextPolicyId;
    const policy: Policy = {
      interestRate,
      maxLoanAmount,
      minLoanAmount,
      minCollateral,
      maxRepaymentTerm,
      minCreditScore,
      gracePeriod,
      penaltyRate,
      policyType,
      currency,
      locationRestriction,
      proposer,
      approvedAt: this.blockHeight,
      isActive: true,
    };
    this.state.policies.set(id, policy);
    this.state.policyHistory.set(id, { updates: [] });
    this.state.activePolicyId = id;
    this.state.nextPolicyId++;
    return { ok: true, value: id };
  }

  updatePolicy(
    policyId: number,
    newInterestRate: number,
    newMaxLoanAmount: number,
    newMinLoanAmount: number,
    newMinCollateral: number
  ): Result<boolean> {
    if (this.state.votingContract === null) return { ok: false, value: ERR_VOTING_CONTRACT_NOT_SET };
    if (this.caller !== this.state.votingContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const policy = this.state.policies.get(policyId);
    if (!policy) return { ok: false, value: ERR_POLICY_NOT_FOUND };
    if (newInterestRate <= 0 || newInterestRate > 2000) return { ok: false, value: ERR_INVALID_INTEREST_RATE };
    if (newMaxLoanAmount <= 0) return { ok: false, value: ERR_INVALID_MAX_LOAN };
    if (newMinLoanAmount <= 0) return { ok: false, value: ERR_INVALID_MIN_LOAN };
    if (newMinCollateral < 0) return { ok: false, value: ERR_INVALID_MIN_COLLATERAL };

    const updated: Policy = {
      ...policy,
      interestRate: newInterestRate,
      maxLoanAmount: newMaxLoanAmount,
      minLoanAmount: newMinLoanAmount,
      minCollateral: newMinCollateral,
    };
    this.state.policies.set(policyId, updated);
    const hist = this.state.policyHistory.get(policyId);
    if (hist) {
      hist.updates.push({ updater: this.caller, timestamp: this.blockHeight, changes: "updated rates and amounts" });
      this.state.policyHistory.set(policyId, hist);
    }
    return { ok: true, value: true };
  }

  deactivatePolicy(policyId: number): Result<boolean> {
    if (this.state.votingContract === null) return { ok: false, value: ERR_VOTING_CONTRACT_NOT_SET };
    if (this.caller !== this.state.votingContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const policy = this.state.policies.get(policyId);
    if (!policy) return { ok: false, value: ERR_POLICY_NOT_FOUND };
    policy.isActive = false;
    this.state.policies.set(policyId, policy);
    if (this.state.activePolicyId === policyId) {
      this.state.activePolicyId = null;
    }
    return { ok: true, value: true };
  }

  validateLoan(
    loanAmount: number,
    collateral: number,
    repaymentTerm: number,
    creditScore: number,
    memberLocation: string,
    currency: string
  ): Result<boolean> {
    if (this.state.activePolicyId === null) return { ok: false, value: ERR_NO_ACTIVE_POLICY };
    const policy = this.state.policies.get(this.state.activePolicyId);
    if (!policy) return { ok: false, value: ERR_POLICY_NOT_FOUND };
    if (loanAmount < policy.minLoanAmount || loanAmount > policy.maxLoanAmount) return { ok: false, value: ERR_INVALID_LOAN_AMOUNT };
    if (collateral < policy.minCollateral) return { ok: false, value: ERR_INSUFFICIENT_COLLATERAL };
    if (repaymentTerm > policy.maxRepaymentTerm) return { ok: false, value: ERR_INVALID_REPAYMENT_TERM };
    if (creditScore < policy.minCreditScore) return { ok: false, value: ERR_INVALID_CREDIT_SCORE };
    if (currency !== policy.currency) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (policy.locationRestriction !== "none" && memberLocation !== policy.locationRestriction) return { ok: false, value: ERR_LOAN_NOT_ALLOWED };
    return { ok: true, value: true };
  }

  getPolicy(id: number): Policy | null {
    return this.state.policies.get(id) || null;
  }

  getActivePolicy(): Policy | null {
    if (this.state.activePolicyId === null) return null;
    return this.state.policies.get(this.state.activePolicyId) || null;
  }

  getPolicyHistory(id: number): PolicyHistory | null {
    return this.state.policyHistory.get(id) || null;
  }

  getPolicyCount(): number {
    return this.state.nextPolicyId;
  }

  isPolicyActive(id: number): boolean {
    const policy = this.state.policies.get(id);
    return policy ? policy.isActive : false;
  }
}

describe("PolicyEnforcementContract", () => {
  let contract: PolicyEnforcementMock;

  beforeEach(() => {
    contract = new PolicyEnforcementMock();
    contract.reset();
  });

  it("sets voting contract successfully", () => {
    const result = contract.setVotingContract("ST2VOTING");
    expect(result.ok).toBe(true);
    expect(contract.state.votingContract).toBe("ST2VOTING");
  });

  it("adds a policy successfully", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    const result = contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const policy = contract.getPolicy(0);
    expect(policy?.interestRate).toBe(500);
    expect(policy?.maxLoanAmount).toBe(100000);
    expect(policy?.minLoanAmount).toBe(1000);
    expect(policy?.minCollateral).toBe(5000);
    expect(policy?.maxRepaymentTerm).toBe(360);
    expect(policy?.minCreditScore).toBe(600);
    expect(policy?.gracePeriod).toBe(30);
    expect(policy?.penaltyRate).toBe(1000);
    expect(policy?.policyType).toBe("personal");
    expect(policy?.currency).toBe("STX");
    expect(policy?.locationRestriction).toBe("none");
    expect(policy?.proposer).toBe("ST3PROPOSER");
    expect(policy?.isActive).toBe(true);
    expect(contract.state.activePolicyId).toBe(0);
  });

  it("rejects add policy without voting contract set", () => {
    const result = contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_VOTING_CONTRACT_NOT_SET);
  });

  it("rejects add policy from unauthorized caller", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST4UNAUTH";
    const result = contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects add policy with invalid interest rate", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    const result = contract.addPolicy(
      0,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_INTEREST_RATE);
  });

  it("updates a policy successfully", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    const result = contract.updatePolicy(0, 600, 150000, 2000, 6000);
    expect(result.ok).toBe(true);
    const policy = contract.getPolicy(0);
    expect(policy?.interestRate).toBe(600);
    expect(policy?.maxLoanAmount).toBe(150000);
    expect(policy?.minLoanAmount).toBe(2000);
    expect(policy?.minCollateral).toBe(6000);
    const history = contract.getPolicyHistory(0);
    expect(history?.updates.length).toBe(1);
    expect(history?.updates[0].changes).toBe("updated rates and amounts");
  });

  it("rejects update for non-existent policy", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    const result = contract.updatePolicy(99, 600, 150000, 2000, 6000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_POLICY_NOT_FOUND);
  });

  it("deactivates a policy successfully", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    const result = contract.deactivatePolicy(0);
    expect(result.ok).toBe(true);
    const policy = contract.getPolicy(0);
    expect(policy?.isActive).toBe(false);
    expect(contract.state.activePolicyId).toBe(null);
  });

  it("validates a loan successfully", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    const result = contract.validateLoan(50000, 10000, 180, 700, "none", "STX");
    expect(result.ok).toBe(true);
  });

  it("rejects loan validation with insufficient collateral", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    const result = contract.validateLoan(50000, 4000, 180, 700, "none", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_COLLATERAL);
  });

  it("rejects loan validation with location restriction mismatch", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "VillageX",
      "ST3PROPOSER"
    );
    const result = contract.validateLoan(50000, 5000, 180, 700, "CityY", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_LOAN_NOT_ALLOWED);
  });

  it("gets policy count correctly", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    contract.addPolicy(
      600,
      150000,
      2000,
      6000,
      720,
      650,
      45,
      1500,
      "business",
      "USD",
      "CityY",
      "ST4PROPOSER"
    );
    expect(contract.getPolicyCount()).toBe(2);
  });

  it("checks if policy is active correctly", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    expect(contract.isPolicyActive(0)).toBe(true);
    contract.deactivatePolicy(0);
    expect(contract.isPolicyActive(0)).toBe(false);
  });

  it("rejects add policy when max policies exceeded", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    contract.state.maxPolicies = 1;
    contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "personal",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    const result = contract.addPolicy(
      600,
      150000,
      2000,
      6000,
      720,
      650,
      45,
      1500,
      "business",
      "USD",
      "CityY",
      "ST4PROPOSER"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_POLICIES_EXCEEDED);
  });

  it("rejects add policy with invalid policy type", () => {
    contract.setVotingContract("ST2VOTING");
    contract.caller = "ST2VOTING";
    const result = contract.addPolicy(
      500,
      100000,
      1000,
      5000,
      360,
      600,
      30,
      1000,
      "invalid",
      "STX",
      "none",
      "ST3PROPOSER"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_POLICY_TYPE);
  });
});