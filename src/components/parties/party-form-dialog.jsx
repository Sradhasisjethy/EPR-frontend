import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateParty, useUpdateParty, useUpsertWageProfile, useParties } from '@/hooks/use-parties';
import { PartyType } from '@/constants/enums';
import { toPaise, fromPaise } from '@/lib/money';
import { toInput } from '@/lib/decimal';
import { today } from '@/lib/date-format';

// Identity and bank fields the server masks ('••••••••1234') for a user
// without PARTY_SENSITIVE_READ. Mirrors SENSITIVE_FIELDS in backend
// src/api/parties/partySensitive.js.
const SENSITIVE_FIELDS = [
  'aadhaarNumber', 'pan', 'bankAccountNumber', 'bankIfsc', 'beneficiaryName',
  'esicNumber', 'esicIpNumber', 'uanNumber', 'dateOfBirth',
  'emergencyContactName', 'emergencyContactPhone',
];
const isMasked = (value) => typeof value === 'string' && value.includes('•');

// A masked value is a placeholder for one this user may not see. Saving the
// form unchanged keeps the real value; typing over it replaces it.
function MaskedHint({ value }) {
  if (!isMasked(value)) return null;
  return <p className="text-[11px] text-muted-foreground">Hidden — enter a new value to replace it</p>;
}

// Mirrors GSTIN_PATTERN in backend src/api/parties/parties.schema.js.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const PINCODE_MAP = {
  '751': { city: 'Bhubaneswar', state: 'Odisha' },
  '752': { city: 'Puri', state: 'Odisha' },
  '753': { city: 'Cuttack', state: 'Odisha' },
  '754': { city: 'Kendrapara', state: 'Odisha' },
  '755': { city: 'Jajpur', state: 'Odisha' },
  '756': { city: 'Balasore', state: 'Odisha' },
  '757': { city: 'Baripada', state: 'Odisha' },
  '758': { city: 'Keonjhar', state: 'Odisha' },
  '759': { city: 'Dhenkanal', state: 'Odisha' },
  '760': { city: 'Berhampur', state: 'Odisha' },
  '761': { city: 'Ganjam', state: 'Odisha' },
  '762': { city: 'Phulbani', state: 'Odisha' },
  '763': { city: 'Bolangir', state: 'Odisha' },
  '764': { city: 'Koraput', state: 'Odisha' },
  '765': { city: 'Rayagada', state: 'Odisha' },
  '766': { city: 'Bhawanipatna', state: 'Odisha' },
  '767': { city: 'Balangir', state: 'Odisha' },
  '768': { city: 'Sambalpur', state: 'Odisha' },
  '769': { city: 'Rourkela', state: 'Odisha' },
  '770': { city: 'Sundargarh', state: 'Odisha' },
  '110': { city: 'New Delhi', state: 'Delhi' },
  '400': { city: 'Mumbai', state: 'Maharashtra' },
  '700': { city: 'Kolkata', state: 'West Bengal' },
  '560': { city: 'Bengaluru', state: 'Karnataka' },
  '600': { city: 'Chennai', state: 'Tamil Nadu' },
  '500': { city: 'Hyderabad', state: 'Telangana' },
  '380': { city: 'Ahmedabad', state: 'Gujarat' },
  '302': { city: 'Jaipur', state: 'Rajasthan' },
};

// A function, not a constant: today() must be evaluated when the dialog
// opens, not once when the module is imported — otherwise a tab left open
// overnight offers yesterday.
const emptyForm = () => ({
  partyType: PartyType.CUSTOMER,
  name: '',
  code: '',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  // Commercial fields
  gstType: 'Registered Regular',
  legalName: '',
  openingBalance: '',
  asOfDate: today(),
  balanceType: 'TO_RECEIVE', // Customers are debtors by default
  paymentTerms: 'Net 30 Days',
  pincode: '',
  billingAddress: '',
  creditPeriodDays: '30',
  creditLimitRupees: '',
  noOfCredits: '0',
  relationshipSince: '',
  distanceKm: '',
  transportation: '',
  // Contractor specific
  retentionPercent: '5',
  entityType: 'INDIVIDUAL',
  // Vendor & Contractor Statutory Compliance
  msmeCategory: 'NONE',
  udyamNumber: '',
  tdsApplicable: false,
  tdsSection: '194Q', // 194Q standard for general goods vendors
  // Contractor specific compliance
  pfCode: '',
  esicNumber: '',
  laborLicenseNumber: '',
  workCategory: 'Civil Works',
  // Labour Specific Fields
  aadhaarNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  badgeNumber: '',
  skillCategory: 'Unskilled',
  wageBasis: 'DAILY_RATE',
  contractorId: '',
  paymentMode: 'BANK_TRANSFER',
  uanNumber: '',
  esicIpNumber: '',
  dateOfBirth: '',
  gender: 'MALE',
  // Sales Reference (Broker / Agent) Specific Fields
  commissionType: 'PERCENTAGE',
  commissionValue: '2.0',
  // Banking
  bankAccountNumber: '',
  bankIfsc: '',
  bankName: '',
  bankBranch: '',
  beneficiaryName: '',
  creditAgeingDays: '0',
  creditAction: 'NONE',
  dailyWageRupees: '',
  overtimeRateMultiplier: '1.5',
  status: 'active',
});

const PARTY_TYPE_LABELS = {
  [PartyType.CUSTOMER]: 'Customer',
  [PartyType.VENDOR]: 'Vendor',
  [PartyType.CONTRACTOR]: 'Contractor',
  [PartyType.LABOUR]: 'Labour',
  [PartyType.SALES_REF]: 'Sales Reference / Broker',
};

/**
 * Fields the API guards behind a named grant on update — credit terms behind
 * the Credit override permission, bank/identity/commission details behind
 * PARTY_SENSITIVE_MODIFY — mapped to the form inputs that produce them.
 *
 * The form rebuilds every field on save: credit ageing is derived from the
 * credit period, a masked credit limit comes back as 0, a blank beneficiary is
 * filled with the party name. Sent as-is, any edit by someone without those
 * grants — a phone number, say — would be refused. So on an edit a guarded
 * field is sent only when one of its inputs actually changed.
 */
const GATED_SOURCES = {
  creditLimitPaise: ['creditLimitRupees'],
  creditAgeingDays: ['creditPeriodDays', 'creditAgeingDays'],
  creditAction: ['creditAction'],
  bankAccountNumber: ['bankAccountNumber', 'paymentMode'],
  bankIfsc: ['bankIfsc', 'paymentMode'],
  bankName: ['bankName', 'paymentMode'],
  bankBranch: ['bankBranch', 'paymentMode'],
  beneficiaryName: ['beneficiaryName', 'paymentMode', 'name'],
  pan: ['pan'],
  aadhaarNumber: ['aadhaarNumber'],
  esicNumber: ['esicNumber'],
  esicIpNumber: ['esicIpNumber'],
  uanNumber: ['uanNumber'],
  commissionType: ['commissionType'],
  commissionValue: ['commissionValue'],
};

export function PartyFormDialog({ open, onOpenChange, party, defaultPartyType }) {
  const initialFormRef = useRef(null);
  const isEditing = !!party;
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const createMutation = useCreateParty();
  const updateMutation = useUpdateParty();
  const wageMutation = useUpsertWageProfile();
  const isSaving = createMutation.isPending || updateMutation.isPending || wageMutation.isPending;

  // Query contractors for the Labour "Associated Contractor" dropdown
  const { data: contractorsData } = useParties(
    { partyType: PartyType.CONTRACTOR, limit: 100 },
    { enabled: open && (form.partyType === PartyType.LABOUR || defaultPartyType === PartyType.LABOUR) }
  );
  const contractors = contractorsData?.rows || contractorsData?.data || (Array.isArray(contractorsData) ? contractorsData : []);

  useEffect(() => {
    if (open) {
      const initialType = party ? party.partyType : (defaultPartyType || PartyType.CUSTOMER);
      const isCustomerInit = initialType === PartyType.CUSTOMER;
      const isPayeeInit = initialType === PartyType.VENDOR || initialType === PartyType.CONTRACTOR;
      const isLabourInit = initialType === PartyType.LABOUR;
      const isSalesRefInit = initialType === PartyType.SALES_REF;
      const isContractorInit = initialType === PartyType.CONTRACTOR;

      const next = (
        party
          ? {
              partyType: party.partyType,
              name: party.name || '',
              code: party.code || '',
              gstin: party.gstin || '',
              pan: party.pan || (party.gstin?.length >= 12 ? party.gstin.slice(2, 12) : ''),
              phone: party.phone || '',
              email: party.email || '',
              address: party.address || party.billingAddress || '',
              city: party.city || '',
              state: party.state || '',
              country: party.country || 'India',
              gstType: party.gstType || (isContractorInit || isSalesRefInit ? 'Unregistered' : 'Registered Regular'),
              legalName: party.legalName || '',
              openingBalance: toInput(party.openingBalance),
              asOfDate: party.asOfDate ? party.asOfDate.slice(0, 10) : today(),
              balanceType: party.balanceType || (isCustomerInit ? 'TO_RECEIVE' : (isPayeeInit || isSalesRefInit) ? 'TO_PAY' : isLabourInit ? 'TO_RECEIVE' : 'TO_RECEIVE'),
              paymentTerms: party.paymentTerms && !['To Receive', 'To Pay'].includes(party.paymentTerms) ? party.paymentTerms : 'Net 30 Days',
              pincode: party.pincode || '',
              billingAddress: party.billingAddress || party.address || '',
              creditPeriodDays: party.creditPeriodDays != null ? toInput(party.creditPeriodDays) : toInput(party.creditAgeingDays, '30'),
              creditLimitRupees: party.creditLimitPaise ? fromPaise(party.creditLimitPaise) : '',
              noOfCredits: toInput(party.noOfCredits, '0'),
              relationshipSince: party.relationshipSince ? party.relationshipSince.slice(0, 10) : '',
              distanceKm: toInput(party.distanceKm),
              transportation: party.transportation || '',
              retentionPercent: toInput(party.retentionPercent, isContractorInit ? '5' : '0'),
              entityType: party.entityType || 'INDIVIDUAL',
              msmeCategory: party.msmeCategory || 'NONE',
              udyamNumber: party.udyamNumber || '',
              tdsApplicable: party.tdsApplicable ?? (isContractorInit || isSalesRefInit),
              tdsSection: party.tdsSection || (isContractorInit ? '194C' : isSalesRefInit ? '194H' : '194Q'),
              pfCode: party.pfCode || '',
              esicNumber: party.esicNumber || '',
              laborLicenseNumber: party.laborLicenseNumber || '',
              workCategory: party.workCategory || 'Civil Works',
              aadhaarNumber: party.aadhaarNumber || '',
              emergencyContactName: party.emergencyContactName || '',
              emergencyContactPhone: party.emergencyContactPhone || '',
              badgeNumber: party.badgeNumber || party.code || '',
              skillCategory: party.skillCategory || 'Unskilled',
              wageBasis: party.wageBasis || 'DAILY_RATE',
              contractorId: party.contractorId || '',
              paymentMode: party.paymentMode || 'BANK_TRANSFER',
              uanNumber: party.uanNumber || '',
              esicIpNumber: party.esicIpNumber || '',
              dateOfBirth: party.dateOfBirth ? party.dateOfBirth.slice(0, 10) : '',
              gender: party.gender || 'MALE',
              commissionType: party.commissionType || 'PERCENTAGE',
              commissionValue: toInput(party.commissionValue, '2'),
              bankAccountNumber: party.bankAccountNumber || '',
              bankIfsc: party.bankIfsc || '',
              bankName: party.bankName || '',
              bankBranch: party.bankBranch || '',
              beneficiaryName: party.beneficiaryName || party.name || '',
              creditAgeingDays: toInput(party.creditAgeingDays, '0'),
              creditAction: party.creditAction || 'NONE',
              dailyWageRupees: fromPaise(party.wageProfile?.dailyWagePaise),
              overtimeRateMultiplier: toInput(party.wageProfile?.overtimeRateMultiplier, '1.5'),
              status: party.status || 'active',
            }
          : {
              ...emptyForm(),
              partyType: initialType,
              balanceType: isCustomerInit ? 'TO_RECEIVE' : (isPayeeInit || isSalesRefInit) ? 'TO_PAY' : 'TO_RECEIVE',
              gstType: isContractorInit || isSalesRefInit ? 'Unregistered' : 'Registered Regular',
              tdsApplicable: isContractorInit || isSalesRefInit,
              tdsSection: isContractorInit ? '194C' : isSalesRefInit ? '194H' : '194Q',
              retentionPercent: isContractorInit ? '5' : '0',
            }
      );
      setForm(next);
      // What was loaded, so a save can tell an edited field from one the form
      // merely re-sends (see GATED_SOURCES below).
      initialFormRef.current = next;
      setError('');
    }
  }, [open, party, defaultPartyType]);

  const handlePartyTypeChange = (newType) => {
    const isCustomer = newType === PartyType.CUSTOMER;
    const isPayee = newType === PartyType.VENDOR || newType === PartyType.CONTRACTOR;
    const isContractor = newType === PartyType.CONTRACTOR;
    const isLabour = newType === PartyType.LABOUR;
    const isSalesRef = newType === PartyType.SALES_REF;
    setForm((prev) => ({
      ...prev,
      partyType: newType,
      balanceType: isCustomer ? 'TO_RECEIVE' : (isPayee || isSalesRef) ? 'TO_PAY' : 'TO_RECEIVE',
      gstType: isContractor || isSalesRef ? 'Unregistered' : prev.gstType,
      tdsApplicable: isContractor || isSalesRef ? true : prev.tdsApplicable,
      tdsSection: isContractor ? '194C' : isSalesRef ? '194H' : '194Q',
      retentionPercent: isContractor ? '5' : prev.retentionPercent,
      paymentMode: isLabour ? 'BANK_TRANSFER' : prev.paymentMode,
      commissionType: isSalesRef ? (prev.commissionType || 'PERCENTAGE') : prev.commissionType,
      commissionValue: isSalesRef ? (prev.commissionValue || '2.0') : prev.commissionValue,
    }));
  };

  const handleGstinChange = (val) => {
    const gstinVal = val.toUpperCase().trim();
    setForm((prev) => {
      let pan = prev.pan;
      let entityType = prev.entityType;
      if (gstinVal.length >= 12) {
        const candidatePan = gstinVal.slice(2, 12);
        if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(candidatePan)) {
          pan = candidatePan;
          const char4 = candidatePan[3];
          if (['C', 'F', 'L', 'T'].includes(char4)) {
            entityType = 'FIRM_COMPANY';
          } else if (['P', 'H'].includes(char4)) {
            entityType = 'INDIVIDUAL';
          }
        }
      }
      return {
        ...prev,
        gstin: gstinVal,
        pan,
        entityType,
      };
    });
  };

  const handlePanChange = (rawPan) => {
    const pan = rawPan.toUpperCase().trim();
    let entityType = form.entityType;
    if (pan.length >= 4) {
      const char4 = pan[3];
      if (['C', 'F', 'L', 'T'].includes(char4)) {
        entityType = 'FIRM_COMPANY';
      } else if (['P', 'H'].includes(char4)) {
        entityType = 'INDIVIDUAL';
      }
    }
    setForm((prev) => ({
      ...prev,
      pan,
      entityType,
    }));
  };

  const handlePaymentTermsChange = (term) => {
    let days = form.creditPeriodDays;
    if (term === 'Immediate' || term === 'Due on Delivery' || term === '100% Advance') {
      days = '0';
    } else if (term === 'Net 15 Days') {
      days = '15';
    } else if (term === 'Net 30 Days') {
      days = '30';
    } else if (term === 'Net 45 Days') {
      days = '45';
    } else if (term === 'Net 60 Days') {
      days = '60';
    }
    setForm((prev) => ({
      ...prev,
      paymentTerms: term,
      creditPeriodDays: days,
    }));
  };

  const handleCreditDaysChange = (daysVal) => {
    let term = form.paymentTerms;
    const num = Number(daysVal);
    if (num === 0) term = 'Immediate';
    else if (num === 15) term = 'Net 15 Days';
    else if (num === 30) term = 'Net 30 Days';
    else if (num === 45) term = 'Net 45 Days';
    else if (num === 60) term = 'Net 60 Days';
    else if (num > 0) term = `Net ${num} Days`;

    setForm((prev) => ({
      ...prev,
      creditPeriodDays: daysVal,
      paymentTerms: term,
    }));
  };

  const handlePincodeChange = async (pincodeVal) => {
    const pin = pincodeVal.replace(/\D/g, '').slice(0, 6);
    let autoCity = '';
    let autoState = '';

    if (pin.length >= 3) {
      const prefix = pin.slice(0, 3);
      if (PINCODE_MAP[prefix]) {
        autoCity = PINCODE_MAP[prefix].city;
        autoState = PINCODE_MAP[prefix].state;
      }
    }

    setForm((prev) => ({
      ...prev,
      pincode: pin,
      city: autoCity || prev.city,
      state: autoState || prev.state,
      country: 'India',
    }));

    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length) {
          const po = data[0].PostOffice[0];
          setForm((prev) => ({
            ...prev,
            city: po.District || po.Division || prev.city,
            state: po.State || prev.state,
            country: 'India',
          }));
        }
      } catch {
        // Fallback to heuristic
      }
    }
  };

  // Helper to calculate age from Date of Birth
  const calculateLabourAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const isCustomer = form.partyType === PartyType.CUSTOMER;
  const isVendor = form.partyType === PartyType.VENDOR;
  const isContractor = form.partyType === PartyType.CONTRACTOR;
  const isLabour = form.partyType === PartyType.LABOUR;
  const isSalesRef = form.partyType === PartyType.SALES_REF;
  const isCommercial = isCustomer || isVendor || isContractor;
  const isGstinRequired = form.gstType !== 'Unregistered' && form.gstType !== 'Consumer' && !form.gstType?.toLowerCase().includes('unregistered');
  const labourAge = isLabour ? calculateLabourAge(form.dateOfBirth) : null;

  // Dynamic Wage Label and Placeholder based on Wage Basis
  const getWageLabel = () => {
    if (form.wageBasis === 'MONTHLY_FIXED') return 'Monthly Fixed Wage (₹)';
    if (form.wageBasis === 'PIECE_RATE') return 'Rate per Unit / MT (₹)';
    return 'Daily Wage Rate (₹)';
  };

  const getWagePlaceholder = () => {
    if (form.wageBasis === 'MONTHLY_FIXED') return 'e.g. 15000 (Monthly)';
    if (form.wageBasis === 'PIECE_RATE') return 'e.g. 120 (per unit/MT)';
    return 'e.g. 500 (Daily rate)';
  };

  // Dynamic Commission Label and Placeholder based on Commission Type
  const getCommissionLabel = () => {
    if (form.commissionType === 'PER_UNIT') return 'Default Rate (₹ per Unit / MT)';
    if (form.commissionType === 'FIXED_LUMP_SUM') return 'Fixed Lump-Sum (₹ per Order)';
    return 'Default Commission Rate (%)';
  };

  const getCommissionPlaceholder = () => {
    if (form.commissionType === 'PER_UNIT') return 'e.g. 50 (₹/MT)';
    if (form.commissionType === 'FIXED_LUMP_SUM') return 'e.g. 5000 (₹/order)';
    return 'e.g. 2.0 (%)';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const gstin = form.gstin.trim().toUpperCase();
    if ((isCommercial || isSalesRef) && isGstinRequired && !gstin) {
      setError('GSTIN is mandatory for Registered GST types.');
      return;
    }
    if (gstin && !GSTIN_PATTERN.test(gstin)) {
      setError('GSTIN must be 15 characters in standard format, e.g. 21ABCDE1234F1Z5.');
      return;
    }

    // PAN format check
    if (form.pan && !isMasked(form.pan) && form.pan.length !== 10) {
      setError('PAN must be exactly 10 alphanumeric characters (e.g. ABCDE1234F).');
      return;
    }

    // Mandatory PAN for Sales Reference
    if (isSalesRef && !form.pan) {
      setError('PAN is mandatory for Sales Reference / Broker to apply statutory TDS 194H (2%) and avoid 20% penalty deduction under Section 206AA.');
      return;
    }

    // Labour specific validations
    if (isLabour) {
      if (form.aadhaarNumber && !isMasked(form.aadhaarNumber)) {
        const cleanAadhaar = form.aadhaarNumber.replace(/\s+/g, '');
        if (!/^\d{12}$/.test(cleanAadhaar)) {
          setError('Aadhaar Number must be a valid 12-digit numeric identifier.');
          return;
        }
      }

      if (form.dateOfBirth && !isMasked(form.dateOfBirth)) {
        const age = calculateLabourAge(form.dateOfBirth);
        if (age !== null && age < 18) {
          setError('Worker must be at least 18 years old under the Factories Act & Child Labour (Prohibition) Act.');
          return;
        }
      }
    }

    const payload = {
      partyType: form.partyType,
      name: form.name,
      code: form.code || form.badgeNumber || undefined,
      gstin: gstin || undefined,
      pan: form.pan ? form.pan.toUpperCase().trim() : undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: isCommercial ? (form.billingAddress || form.address || undefined) : (form.address || undefined),
      city: form.city || undefined,
      state: form.state || undefined,
      country: form.country || undefined,
      pincode: form.pincode || undefined,
      creditLimitPaise: toPaise(form.creditLimitRupees),
      creditAgeingDays: Number(form.creditPeriodDays) || Number(form.creditAgeingDays) || 0,
      creditAction: form.creditAction,
      ...(isCommercial
        ? {
            gstType: form.gstType || undefined,
            legalName: form.legalName || undefined,
            openingBalance: form.openingBalance !== '' ? Number(form.openingBalance) : 0,
            asOfDate: form.asOfDate || undefined,
            balanceType: form.balanceType || undefined,
            paymentTerms: form.paymentTerms || undefined,
            billingAddress: form.billingAddress || form.address || undefined,
            creditPeriodDays: Number(form.creditPeriodDays) || 0,
            noOfCredits: Number(form.noOfCredits) || 0,
            relationshipSince: form.relationshipSince || undefined,
            distanceKm: !isContractor && form.distanceKm !== '' ? Number(form.distanceKm) : undefined,
            transportation: !isContractor ? form.transportation || undefined : undefined,
          }
        : {}),
      ...(isVendor || isContractor
        ? {
            tdsApplicable: !!form.tdsApplicable,
            tdsSection: form.tdsApplicable ? form.tdsSection : undefined,
            bankAccountNumber: form.bankAccountNumber || undefined,
            bankIfsc: form.bankIfsc ? form.bankIfsc.toUpperCase().trim() : undefined,
            bankName: form.bankName || undefined,
            bankBranch: form.bankBranch || undefined,
            beneficiaryName: form.beneficiaryName || undefined,
          }
        : {}),
      ...(isVendor
        ? {
            msmeCategory: form.msmeCategory || 'NONE',
            udyamNumber: form.udyamNumber || undefined,
          }
        : {}),
      ...(isContractor
        ? {
            pfCode: form.pfCode || undefined,
            esicNumber: form.esicNumber || undefined,
            laborLicenseNumber: form.laborLicenseNumber || undefined,
            workCategory: form.workCategory || undefined,
            retentionPercent: form.retentionPercent !== '' ? Number(form.retentionPercent) : 0,
            entityType: form.entityType || 'INDIVIDUAL',
          }
        : {}),
      ...(isLabour
        ? {
            aadhaarNumber: form.aadhaarNumber ? form.aadhaarNumber.replace(/\s+/g, '') : undefined,
            emergencyContactName: form.emergencyContactName || undefined,
            emergencyContactPhone: form.emergencyContactPhone || undefined,
            badgeNumber: form.badgeNumber || form.code || undefined,
            skillCategory: form.skillCategory || 'Unskilled',
            wageBasis: form.wageBasis || 'DAILY_RATE',
            contractorId: form.contractorId || undefined,
            paymentMode: form.paymentMode || 'BANK_TRANSFER',
            uanNumber: form.uanNumber || undefined,
            esicIpNumber: form.esicIpNumber || undefined,
            dateOfBirth: form.dateOfBirth || undefined,
            gender: form.gender || 'MALE',
            openingBalance: form.openingBalance !== '' ? Number(form.openingBalance) : 0,
            balanceType: 'TO_RECEIVE', // Pre-existing advance is an advance receivable from the worker
            bankAccountNumber: form.paymentMode === 'BANK_TRANSFER' ? (form.bankAccountNumber || undefined) : undefined,
            bankIfsc: form.paymentMode === 'BANK_TRANSFER' ? (form.bankIfsc ? form.bankIfsc.toUpperCase().trim() : undefined) : undefined,
            bankName: form.paymentMode === 'BANK_TRANSFER' ? (form.bankName || undefined) : undefined,
            bankBranch: form.paymentMode === 'BANK_TRANSFER' ? (form.bankBranch || undefined) : undefined,
            beneficiaryName: form.paymentMode === 'BANK_TRANSFER' ? (form.beneficiaryName || form.name || undefined) : undefined,
          }
        : {}),
      ...(isSalesRef
        ? {
            commissionType: form.commissionType || 'PERCENTAGE',
            commissionValue: form.commissionValue !== '' ? Number(form.commissionValue) : 0,
            tdsApplicable: !!form.tdsApplicable,
            tdsSection: form.tdsApplicable ? (form.tdsSection || '194H') : undefined,
            gstType: form.gstType || 'Unregistered',
            openingBalance: form.openingBalance !== '' ? Number(form.openingBalance) : 0,
            balanceType: form.balanceType || 'TO_PAY',
            asOfDate: form.asOfDate || undefined,
            bankAccountNumber: form.bankAccountNumber || undefined,
            bankIfsc: form.bankIfsc ? form.bankIfsc.toUpperCase().trim() : undefined,
            bankName: form.bankName || undefined,
            bankBranch: form.bankBranch || undefined,
            beneficiaryName: form.beneficiaryName || form.name || undefined,
          }
        : {}),
    };

    // An untouched masked field is not sent at all: the server would ignore it
    // anyway, and leaving it out keeps bullets from ever reaching a request.
    SENSITIVE_FIELDS.forEach((field) => {
      if (isMasked(payload[field])) delete payload[field];
    });

    const initial = initialFormRef.current;
    const untouched = (inputs) => initial && inputs.every((key) => String(form[key] ?? '') === String(initial[key] ?? ''));
    if (isEditing && initial) {
      Object.entries(GATED_SOURCES).forEach(([field, inputs]) => {
        if (field in payload && untouched(inputs)) delete payload[field];
      });
    }
    // The wage profile is its own guarded write (Labour edit permission); an
    // unchanged one is not re-sent.
    const wageChanged = !isEditing || !untouched(['dailyWageRupees', 'overtimeRateMultiplier']);

    try {
      const saved = isEditing
        ? await updateMutation.mutateAsync({ id: party.id, ...payload, status: form.status })
        : await createMutation.mutateAsync(payload);

      if (form.partyType === PartyType.LABOUR && form.dailyWageRupees && wageChanged) {
        await wageMutation.mutateAsync({
          partyId: saved.id,
          dailyWagePaise: toPaise(form.dailyWageRupees),
          overtimeRateMultiplier: Number(form.overtimeRateMultiplier) || 1.5,
        });
      }

      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save party.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-6xl h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        {/* FIXED HEADER */}
        <DialogHeader className="px-6 py-3 border-b border-border/60 shrink-0 bg-background">
          <DialogTitle className="text-lg font-bold">
            {isEditing ? `Edit ${PARTY_TYPE_LABELS[form.partyType] || 'Party'}` : `New ${PARTY_TYPE_LABELS[form.partyType] || 'Party'}`}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm shrink-0">
            {error}
          </div>
        )}

        {/* SCROLLABLE FORM BODY */}
        <form id="party-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {/* Top Row: Party Type & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="party-type">Party Type</Label>
              <select
                id="party-type"
                value={form.partyType}
                onChange={(e) => handlePartyTypeChange(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                disabled={isEditing}
              >
                {Object.entries(PARTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className={`space-y-1.5 ${isLabour || isSalesRef ? 'sm:col-span-2' : 'sm:col-span-3'}`}>
              <Label htmlFor="party-name">
                {isVendor ? 'Vendor Name' : isCustomer ? 'Customer Name' : isContractor ? 'Contractor / Agency Name' : isLabour ? 'Worker / Labour Name' : isSalesRef ? 'Broker / Sales Reference Name' : 'Party Name'} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="party-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={isVendor ? 'Vendor Name' : isCustomer ? 'Customer Name' : isContractor ? 'Contractor / Agency Name' : isLabour ? 'Full Name of Worker' : isSalesRef ? 'Broker / Agent / Partner Name' : 'Party Name'}
                required
              />
            </div>
            {(isLabour || isSalesRef) && (
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="party-code-input">
                  {isLabour ? 'Labour ID / Badge #' : 'Agent / Broker Code'}
                </Label>
                <Input
                  id="party-code-input"
                  value={form.code || form.badgeNumber}
                  onChange={(e) => setForm({ ...form, code: e.target.value, badgeNumber: e.target.value })}
                  placeholder={isLabour ? 'e.g. LBR-2026-045' : 'e.g. REF-2026-001'}
                />
              </div>
            )}
          </div>

          {/* VENDOR HEADER & IDENTITY */}
          {isVendor && (
            <div className="space-y-4">
              {/* Row 2: Email, Phone, Party Code & Legal Registered Name in 4 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-email">
                    E-Mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="vendor-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="E-Mail"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="vendor-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Phone"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-code">Party Code</Label>
                  <Input
                    id="vendor-code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="Optional (auto if blank)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-legal-name">Legal Registered Name</Label>
                  <Input
                    id="vendor-legal-name"
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    placeholder="Official registered name"
                  />
                </div>
              </div>

              {/* Row 3: GST Type, GSTIN & PAN in 3 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-gst-type">
                    GST Type <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="vendor-gst-type"
                    value={form.gstType}
                    onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    required
                  >
                    <option value="Registered Regular">Registered Regular</option>
                    <option value="Registered Composition">Registered Composition</option>
                    <option value="Unregistered">Unregistered</option>
                    <option value="Consumer">Consumer</option>
                    <option value="Overseas / SEZ">Overseas / SEZ</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendor-gstin">
                    GSTIN {isGstinRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="vendor-gstin"
                    value={form.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder={isGstinRequired ? '15-char GSTIN' : 'Optional for Unregistered'}
                    maxLength={15}
                    required={isGstinRequired}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vendor-pan">PAN (Permanent A/C No.)</Label>
                    <span className="text-[11px] text-muted-foreground">Auto-derived from GSTIN</span>
                  </div>
                  <Input
                    id="vendor-pan"
                    value={form.pan}
                    onChange={(e) => handlePanChange(e.target.value)}
                    placeholder="10-char PAN"
                    maxLength={isMasked(form.pan) ? undefined : 10}
                  />
                  <MaskedHint value={form.pan} />
                </div>
              </div>

              {/* Side-by-Side: STATUTORY COMPLIANCE & BANK ACCOUNT CARDS in 2 equal columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Card: Statutory Compliance */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <span>📋</span> Statutory Compliance (MSME & TDS)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="vendor-msme" className="text-xs font-medium">MSME Category (43B(h))</Label>
                      <select
                        id="vendor-msme"
                        value={form.msmeCategory}
                        onChange={(e) => setForm({ ...form, msmeCategory: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="NONE">None / Not Registered</option>
                        <option value="MICRO">Micro (Due in 15/45 days)</option>
                        <option value="SMALL">Small (Due in 15/45 days)</option>
                        <option value="MEDIUM">Medium Enterprise</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vendor-udyam" className="text-xs font-medium">Udyam Registration No.</Label>
                      <Input
                        id="vendor-udyam"
                        value={form.udyamNumber}
                        onChange={(e) => setForm({ ...form, udyamNumber: e.target.value })}
                        placeholder="UDYAM-OD-00-1234567"
                        disabled={form.msmeCategory === 'NONE'}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="vendor-tds-applicable"
                          checked={form.tdsApplicable}
                          onChange={(e) => setForm({ ...form, tdsApplicable: e.target.checked })}
                          className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <Label htmlFor="vendor-tds-applicable" className="cursor-pointer text-xs font-medium">
                          TDS Applicable on Invoices
                        </Label>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Auto-suggest tax deduction on bills</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vendor-tds-section" className="text-xs font-medium">Default TDS Section</Label>
                      <select
                        id="vendor-tds-section"
                        value={form.tdsSection}
                        onChange={(e) => setForm({ ...form, tdsSection: e.target.value })}
                        disabled={!form.tdsApplicable}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs disabled:opacity-50 font-medium"
                      >
                        <option value="194Q">194Q — Purchase of Goods (Over ₹50L @ 0.1%) [Standard Goods]</option>
                        <option value="194C">194C — Transport / Logistics / Works (1% / 2%)</option>
                        <option value="194J">194J — Professional & Technical Services (2% / 10%)</option>
                        <option value="194I">194I — Rent on Plant, Machinery & Land (2% / 10%)</option>
                        <option value="194H">194H — Commission / Brokerage (5%)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right Card: Bank Account Details */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <span>🏦</span> Bank Account Details (Payouts & Remittances)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="vendor-beneficiary" className="text-xs font-medium">Beneficiary / Payee Name</Label>
                      <Input
                        id="vendor-beneficiary"
                        value={form.beneficiaryName}
                        onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                        placeholder="Name as per Bank Account"
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.beneficiaryName} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vendor-bank-acc" className="text-xs font-medium">Bank Account Number</Label>
                      <Input
                        id="vendor-bank-acc"
                        value={form.bankAccountNumber}
                        onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                        placeholder="Account Number for NEFT / RTGS"
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.bankAccountNumber} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="vendor-ifsc" className="text-xs font-medium">IFSC Code</Label>
                      <Input
                        id="vendor-ifsc"
                        value={form.bankIfsc}
                        onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                        placeholder="e.g. SBIN0001234"
                        maxLength={isMasked(form.bankIfsc) ? undefined : 11}
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.bankIfsc} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vendor-bank-name" className="text-xs font-medium">Bank Name</Label>
                      <Input
                        id="vendor-bank-name"
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        placeholder="e.g. State Bank of India"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="vendor-branch" className="text-xs font-medium">Branch Name</Label>
                      <Input
                        id="vendor-branch"
                        value={form.bankBranch}
                        onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                        placeholder="e.g. Infocity, Bhubaneswar"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTRACTOR HEADER & IDENTITY */}
          {isContractor && (
            <div className="space-y-4">
              {/* Row 2: Phone, Email, Party Code & Work Category in 4 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contractor-phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contractor-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Mobile / Contact #"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractor-email">E-Mail</Label>
                  <Input
                    id="contractor-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contractor@domain.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractor-code">Contractor Code</Label>
                  <Input
                    id="contractor-code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="Auto if blank"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractor-work-category">
                    Work Category / Specialization <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="contractor-work-category"
                    value={form.workCategory}
                    onChange={(e) => setForm({ ...form, workCategory: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                    required
                  >
                    <option value="Civil Works">Civil Works</option>
                    <option value="Electrical & Instrumentation">Electrical & Instrumentation</option>
                    <option value="Haulage / Transport Contractor">Haulage / Transport Contractor</option>
                    <option value="Manpower Supply / Labor Contractor">Manpower Supply / Labor Contractor</option>
                    <option value="Mechanical / Fabrication & Erection">Mechanical / Fabrication & Erection</option>
                    <option value="Blasting, Drilling & Mining">Blasting, Drilling & Mining</option>
                    <option value="Material Handling & Loading">Material Handling & Loading</option>
                    <option value="Security & Facility Services">Security & Facility Services</option>
                    <option value="General Maintenance & Repairs">General Maintenance & Repairs</option>
                    <option value="Other / Specialized Contracting">Other / Specialized Contracting</option>
                  </select>
                </div>
              </div>

              {/* Row 3: GST Type, GSTIN & PAN in 3 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contractor-gst-type">
                    GST Type <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="contractor-gst-type"
                    value={form.gstType}
                    onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    required
                  >
                    <option value="Unregistered">Unregistered (Small / Field Contractor)</option>
                    <option value="Registered Regular">Registered Regular</option>
                    <option value="Registered Composition">Registered Composition</option>
                    <option value="Overseas / SEZ">Overseas / SEZ</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractor-gstin">
                    GSTIN {isGstinRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="contractor-gstin"
                    value={form.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder={isGstinRequired ? '15-char GSTIN' : 'Optional if Unregistered'}
                    maxLength={15}
                    required={isGstinRequired}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contractor-pan">
                      PAN (Permanent A/C No.) <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[11px] text-muted-foreground">TDS 194C / 206AA</span>
                  </div>
                  <Input
                    id="contractor-pan"
                    value={form.pan}
                    onChange={(e) => handlePanChange(e.target.value)}
                    placeholder="10-char PAN"
                    maxLength={isMasked(form.pan) ? undefined : 10}
                    required
                  />
                  <MaskedHint value={form.pan} />
                </div>
              </div>

              {/* Side-by-Side: STATUTORY & LABOR COMPLIANCE + BANK ACCOUNT CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Card: Statutory & Labor Compliance */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <span>👷</span> Statutory & Labor Compliance (CLRA, PF, ESIC & TDS)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="contractor-pf" className="text-xs font-medium">PF Code</Label>
                      <Input
                        id="contractor-pf"
                        value={form.pfCode}
                        onChange={(e) => setForm({ ...form, pfCode: e.target.value })}
                        placeholder="e.g. ORBBS0012345000"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contractor-esic" className="text-xs font-medium">ESIC Number</Label>
                      <Input
                        id="contractor-esic"
                        value={form.esicNumber}
                        onChange={(e) => setForm({ ...form, esicNumber: e.target.value })}
                        placeholder="e.g. 51001234560001001"
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.esicNumber} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contractor-license" className="text-xs font-medium">Labor License #</Label>
                      <Input
                        id="contractor-license"
                        value={form.laborLicenseNumber}
                        onChange={(e) => setForm({ ...form, laborLicenseNumber: e.target.value })}
                        placeholder="e.g. CLRA/OD/2026/04"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="contractor-tds-applicable"
                            checked={form.tdsApplicable}
                            onChange={(e) => setForm({ ...form, tdsApplicable: e.target.checked })}
                            className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <Label htmlFor="contractor-tds-applicable" className="cursor-pointer text-xs font-medium">
                            TDS Applicable on Bills
                          </Label>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Automatic tax deduction on RA vouchers</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="contractor-tds-section" className="text-xs font-medium">Default TDS Section</Label>
                        <select
                          id="contractor-tds-section"
                          value={form.tdsSection}
                          onChange={(e) => setForm({ ...form, tdsSection: e.target.value })}
                          disabled={!form.tdsApplicable}
                          className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs disabled:opacity-50"
                        >
                          <option value="194C">194C — Contractor / Transport</option>
                          <option value="194J">194J — Technical / Professional (2% / 10%)</option>
                          <option value="194I">194I — Plant & Equipment Hire (2%)</option>
                          <option value="194Q">194Q — Purchase of Goods (0.1%)</option>
                        </select>
                      </div>
                    </div>

                    {/* PAN Status / Entity Type Flag for TDS 194C Rate Determination */}
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">PAN Status / Entity Type (TDS 194C Rate)</Label>
                        <span className="text-[10px] text-primary font-semibold">
                          {form.entityType === 'INDIVIDUAL' ? '1% TDS applies' : '2% TDS applies'}
                        </span>
                      </div>
                      <div className="flex items-center gap-5 pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                          <input
                            type="radio"
                            name="contractorEntityType"
                            value="INDIVIDUAL"
                            checked={form.entityType === 'INDIVIDUAL'}
                            onChange={(e) => setForm({ ...form, entityType: e.target.value })}
                            className="text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span>Individual / HUF (1% TDS)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                          <input
                            type="radio"
                            name="contractorEntityType"
                            value="FIRM_COMPANY"
                            checked={form.entityType === 'FIRM_COMPANY'}
                            onChange={(e) => setForm({ ...form, entityType: e.target.value })}
                            className="text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span>Company / Firm / LLP (2% TDS)</span>
                        </label>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Auto-detected from 4th character of PAN (P/H = 1%, C/F = 2%)</p>
                    </div>
                  </div>
                </div>

                {/* Right Card: Bank Account Details for Contractor Disbursements */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <span>🏦</span> Bank Account Details (Disbursements & RA Bills)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="contractor-beneficiary" className="text-xs font-medium">Beneficiary / Account Name</Label>
                      <Input
                        id="contractor-beneficiary"
                        value={form.beneficiaryName}
                        onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                        placeholder="Payee name as per Bank A/C"
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.beneficiaryName} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contractor-bank-acc" className="text-xs font-medium">Bank Account Number</Label>
                      <Input
                        id="contractor-bank-acc"
                        value={form.bankAccountNumber}
                        onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                        placeholder="Bank Account Number"
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.bankAccountNumber} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="contractor-ifsc" className="text-xs font-medium">IFSC Code</Label>
                      <Input
                        id="contractor-ifsc"
                        value={form.bankIfsc}
                        onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                        placeholder="e.g. SBIN0001234"
                        maxLength={isMasked(form.bankIfsc) ? undefined : 11}
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.bankIfsc} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contractor-bank-name" className="text-xs font-medium">Bank Name</Label>
                      <Input
                        id="contractor-bank-name"
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        placeholder="e.g. State Bank of India"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contractor-branch" className="text-xs font-medium">Branch Name</Label>
                      <Input
                        id="contractor-branch"
                        value={form.bankBranch}
                        onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                        placeholder="e.g. Rourkela Main"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CUSTOMER HEADER & IDENTITY */}
          {isCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="party-email">Email</Label>
                  <Input
                    id="party-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-phone">Phone</Label>
                  <Input
                    id="party-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-code">Party Code</Label>
                  <Input
                    id="party-code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="Optional (auto if blank)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-legal-name">Legal / Trade Name</Label>
                  <Input
                    id="party-legal-name"
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    placeholder="Trade / Company legal name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customer-gst-type">
                    GST Type <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="customer-gst-type"
                    value={form.gstType}
                    onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                    required
                  >
                    <option value="Registered Regular">Registered Regular (B2B)</option>
                    <option value="Unregistered">Unregistered / B2C (Retail)</option>
                    <option value="Registered Composition">Registered Composition</option>
                    <option value="Overseas / SEZ">Overseas / SEZ</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-gstin">
                    GSTIN {isGstinRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="party-gstin"
                    value={form.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder={isGstinRequired ? '15-char GSTIN' : 'Optional for Unregistered / Retail'}
                    maxLength={15}
                    required={isGstinRequired}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="party-pan">PAN (Permanent A/C No.)</Label>
                    <span className="text-[11px] text-muted-foreground">Auto-derived from GSTIN</span>
                  </div>
                  <Input
                    id="party-pan"
                    value={form.pan}
                    onChange={(e) => handlePanChange(e.target.value)}
                    placeholder="10-char PAN"
                    maxLength={isMasked(form.pan) ? undefined : 10}
                  />
                  <MaskedHint value={form.pan} />
                </div>
              </div>
            </div>
          )}

          {/* LABOUR MASTER SPECIFIC FORM */}
          {isLabour && (
            <div className="space-y-4">
              {/* Row 2: Personal Identity, Gender & Statutory Safeguards (Age 18+ Under Factories Act) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="labour-phone">
                    Worker Phone / Mobile <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="labour-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="labour-gender">
                    Gender (Muster Form T/D) <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="labour-gender"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                    required
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="labour-dob">
                      Date of Birth <span className="text-destructive">*</span>
                    </Label>
                    {labourAge !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        labourAge < 18 
                          ? 'text-destructive bg-destructive/10 border-destructive/30' 
                          : 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}>
                        {labourAge < 18 ? `Age: ${labourAge} (Under 18 Violation)` : `Age: ${labourAge} yrs`}
                      </span>
                    )}
                  </div>
                  <Input
                    id="labour-dob"
                    type="date"
                    // A date input cannot show the mask, and `required` would
                    // then block saving a form whose date was never touched.
                    value={isMasked(form.dateOfBirth) ? '' : form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    required={!isMasked(form.dateOfBirth)}
                  />
                  <MaskedHint value={form.dateOfBirth} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="labour-aadhaar">
                    Aadhaar Number (12 digits) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="labour-aadhaar"
                    value={form.aadhaarNumber}
                    onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })}
                    placeholder="12-digit Aadhaar for biometric"
                    maxLength={isMasked(form.aadhaarNumber) ? undefined : 12}
                    required
                  />
                  <MaskedHint value={form.aadhaarNumber} />
                </div>
              </div>

              {/* Row 3: Emergency Contacts, PAN, Email & Associated Contractor */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="labour-emergency-name">
                    Emergency Contact Person <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="labour-emergency-name"
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                    placeholder="Kin / Guardian Name"
                    required
                  />
                  <MaskedHint value={form.emergencyContactName} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="labour-emergency-phone">
                    Emergency Contact Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="labour-emergency-phone"
                    value={form.emergencyContactPhone}
                    onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                    placeholder="Emergency Mobile #"
                    required
                  />
                  <MaskedHint value={form.emergencyContactPhone} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="labour-pan">PAN / Form 60 (Optional)</Label>
                  <Input
                    id="labour-pan"
                    value={form.pan}
                    onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                    placeholder="10-char PAN (Optional)"
                    maxLength={isMasked(form.pan) ? undefined : 10}
                  />
                  <MaskedHint value={form.pan} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="labour-contractor">Associated Contractor (Optional)</Label>
                  <select
                    id="labour-contractor"
                    value={form.contractorId}
                    onChange={(e) => setForm({ ...form, contractorId: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Direct Company Roll (No Contractor)</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Side-by-Side: Wage Parameters & Statutory Banking */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Card: Skill & Wage Parameters + Pre-existing Advance Balance */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <span>💰</span> Skill & Wage Parameters
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="labour-skill" className="text-xs font-medium">
                        Skill Category <span className="text-destructive">*</span>
                      </Label>
                      <select
                        id="labour-skill"
                        value={form.skillCategory}
                        onChange={(e) => setForm({ ...form, skillCategory: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                        required
                      >
                        <option value="Unskilled">Unskilled (Helper / General)</option>
                        <option value="Semi-Skilled">Semi-Skilled (Mason / Bar-bender)</option>
                        <option value="Skilled">Skilled (Welder / Electrician / Operator)</option>
                        <option value="Highly Skilled">Highly Skilled (Foreman / Specialist)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="labour-wage-basis" className="text-xs font-medium">Wage Basis</Label>
                      <select
                        id="labour-wage-basis"
                        value={form.wageBasis}
                        onChange={(e) => setForm({ ...form, wageBasis: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                      >
                        <option value="DAILY_RATE">Daily Wage Rate</option>
                        <option value="MONTHLY_FIXED">Monthly Fixed</option>
                        <option value="PIECE_RATE">Piece-Rate / Per MT</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Wage Rate & Overtime Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="labour-daily-wage" className="text-xs font-medium">
                        {getWageLabel()} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="labour-daily-wage"
                        type="number"
                        step="0.01"
                        value={form.dailyWageRupees}
                        onChange={(e) => setForm({ ...form, dailyWageRupees: e.target.value })}
                        placeholder={getWagePlaceholder()}
                        required
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="labour-ot" className="text-xs font-medium">Overtime Multiplier</Label>
                      <Input
                        id="labour-ot"
                        type="number"
                        step="0.1"
                        min="1"
                        value={form.overtimeRateMultiplier}
                        onChange={(e) => setForm({ ...form, overtimeRateMultiplier: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Advance / Opening Balance Field */}
                  <div className="pt-2 border-t border-border/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="labour-advance" className="text-xs font-medium">Advance / Opening Balance (₹)</Label>
                      <span className="text-[10px] text-muted-foreground">To Recover</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-muted-foreground text-xs font-semibold">₹</span>
                      <Input
                        id="labour-advance"
                        type="number"
                        step="0.01"
                        value={form.openingBalance}
                        onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                        placeholder="e.g. 2000 (Pre-joining advance)"
                        className="h-8 text-xs pl-6"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Tracks pre-existing cash advance to be deducted/recovered from upcoming muster roll wage payouts.
                    </p>
                  </div>
                </div>

                {/* Right Card: Payout & Statutory Banking */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span>🏦</span> Payout & Statutory Registrations
                    </h4>
                    {/* Payment Mode Selector */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          name="labourPaymentMode"
                          value="BANK_TRANSFER"
                          checked={form.paymentMode === 'BANK_TRANSFER'}
                          onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                          className="text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>Bank Transfer</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          name="labourPaymentMode"
                          value="CASH"
                          checked={form.paymentMode === 'CASH'}
                          onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                          className="text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>Cash</span>
                      </label>
                    </div>
                  </div>

                  {form.paymentMode === 'BANK_TRANSFER' ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="labour-beneficiary" className="text-xs font-medium">Account Holder Name</Label>
                          <Input
                            id="labour-beneficiary"
                            value={form.beneficiaryName}
                            onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                            placeholder="Name as per Passbook"
                            className="h-8 text-xs"
                          />
                          <MaskedHint value={form.beneficiaryName} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="labour-bank-acc" className="text-xs font-medium">Account Number</Label>
                          <Input
                            id="labour-bank-acc"
                            value={form.bankAccountNumber}
                            onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                            placeholder="Bank Account Number"
                            className="h-8 text-xs"
                          />
                          <MaskedHint value={form.bankAccountNumber} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="labour-ifsc" className="text-xs font-medium">IFSC Code</Label>
                          <Input
                            id="labour-ifsc"
                            value={form.bankIfsc}
                            onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                            placeholder="e.g. SBIN0001234"
                            maxLength={isMasked(form.bankIfsc) ? undefined : 11}
                            className="h-8 text-xs"
                          />
                          <MaskedHint value={form.bankIfsc} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="labour-bank-name" className="text-xs font-medium">Bank Name</Label>
                          <Input
                            id="labour-bank-name"
                            value={form.bankName}
                            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                            placeholder="e.g. State Bank of India"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs text-muted-foreground">
                      Cash Mode Active: Worker wages are disbursed via cash muster roll vouchers.
                    </div>
                  )}

                  {/* Statutory Registrations: UAN & ESIC */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
                    <div className="space-y-1">
                      <Label htmlFor="labour-uan" className="text-xs font-medium">UAN / PF Number</Label>
                      <Input
                        id="labour-uan"
                        value={form.uanNumber}
                        onChange={(e) => setForm({ ...form, uanNumber: e.target.value })}
                        placeholder="12-digit UAN"
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.uanNumber} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="labour-esic" className="text-xs font-medium">ESIC IP Number</Label>
                      <Input
                        id="labour-esic"
                        value={form.esicIpNumber}
                        onChange={(e) => setForm({ ...form, esicIpNumber: e.target.value })}
                        placeholder="17-digit ESIC IP #"
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.esicIpNumber} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address & Location Sub-block for Labour */}
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
                  <span>📍</span> Residential / Site Address
                </h4>

                <div className="space-y-1.5">
                  <Label htmlFor="labour-address">Street / Village / Camp Address</Label>
                  <textarea
                    id="labour-address"
                    rows={1}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Village, Post Office, Police Station, Labor Camp address"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="labour-pincode">Pincode</Label>
                    <Input
                      id="labour-pincode"
                      value={form.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="6-digit PIN"
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="labour-city">City / District</Label>
                    <Input
                      id="labour-city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="City or District"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="labour-state">State</Label>
                    <Input
                      id="labour-state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="labour-country">Country</Label>
                    <Input
                      id="labour-country"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      placeholder="India"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SALES REFERENCE / BROKER SPECIFIC FORM */}
          {isSalesRef && (
            <div className="space-y-4">
              {/* Row 2: Contact & Identity (4 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="salesref-phone">
                    Phone / Mobile <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="salesref-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit mobile #"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salesref-email">E-Mail</Label>
                  <Input
                    id="salesref-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="agent@domain.com (Optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salesref-gst-type">
                    GST Type <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="salesref-gst-type"
                    value={form.gstType}
                    onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                    required
                  >
                    <option value="Unregistered">Unregistered / Individual Broker</option>
                    <option value="Registered Regular">Registered Agency (B2B)</option>
                    <option value="Registered Composition">Registered Composition</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salesref-gstin">
                    GSTIN {isGstinRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="salesref-gstin"
                    value={form.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder={isGstinRequired ? '15-char GSTIN' : 'Optional if Unregistered'}
                    maxLength={15}
                    required={isGstinRequired}
                  />
                </div>
              </div>

              {/* Side-by-Side: Commission Configuration & Payout Banking Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Card: Commission Rules & Statutory Compliance (TDS 194H) */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <span>💼</span> Commission Configuration & Statutory (TDS 194H)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="salesref-comm-type" className="text-xs font-medium">
                        Commission Calculation Type <span className="text-destructive">*</span>
                      </Label>
                      <select
                        id="salesref-comm-type"
                        value={form.commissionType}
                        onChange={(e) => setForm({ ...form, commissionType: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                        required
                      >
                        <option value="PERCENTAGE">% on Invoice Net Value</option>
                        <option value="PER_UNIT">Fixed Rate per Unit (₹/MT, Piece)</option>
                        <option value="FIXED_LUMP_SUM">Fixed Lump-Sum per Order</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="salesref-comm-val" className="text-xs font-medium">
                        {getCommissionLabel()} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="salesref-comm-val"
                        type="number"
                        step="0.01"
                        value={form.commissionValue}
                        onChange={(e) => setForm({ ...form, commissionValue: e.target.value })}
                        placeholder={getCommissionPlaceholder()}
                        required
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Statutory Row: PAN & TDS 194H */}
                  <div className="pt-2 border-t border-border/40 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="salesref-pan" className="text-xs font-medium">
                            PAN (Permanent A/C No.) <span className="text-destructive">*</span>
                          </Label>
                          <span className="text-[10px] text-muted-foreground">TDS 194H / 206AA</span>
                        </div>
                        <Input
                          id="salesref-pan"
                          value={form.pan}
                          onChange={(e) => handlePanChange(e.target.value)}
                          placeholder="10-char PAN (Mandatory)"
                          maxLength={isMasked(form.pan) ? undefined : 10}
                          required
                          className="h-8 text-xs uppercase"
                        />
                        <MaskedHint value={form.pan} />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="salesref-tds-section" className="text-xs font-medium">Default TDS Section</Label>
                        <select
                          id="salesref-tds-section"
                          value={form.tdsSection}
                          onChange={(e) => setForm({ ...form, tdsSection: e.target.value })}
                          disabled={!form.tdsApplicable}
                          className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium disabled:opacity-50"
                        >
                          <option value="194H">194H — Commission / Brokerage (2%)</option>
                          <option value="194D">194D — Insurance Commission (5%)</option>
                          <option value="194J">194J — Professional / Referral (2% / 10%)</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Deduction applies on annual commission exceeding ₹15,000. Valid PAN prevents 20% penalty deduction under Sec 206AA.
                    </p>
                  </div>
                </div>

                {/* Right Card: Payout Banking Details for Commission Remittances */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
                    <span>🏦</span> Payout Banking Details (Commission Disbursements)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="salesref-beneficiary" className="text-xs font-medium">Beneficiary / Account Name</Label>
                      <Input
                        id="salesref-beneficiary"
                        value={form.beneficiaryName}
                        onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                        placeholder="Payee name as per Bank A/C"
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.beneficiaryName} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="salesref-bank-acc" className="text-xs font-medium">Bank Account Number</Label>
                      <Input
                        id="salesref-bank-acc"
                        value={form.bankAccountNumber}
                        onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                        placeholder="Account Number for NEFT / RTGS"
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.bankAccountNumber} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="salesref-ifsc" className="text-xs font-medium">IFSC Code</Label>
                      <Input
                        id="salesref-ifsc"
                        value={form.bankIfsc}
                        onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                        placeholder="e.g. SBIN0001234"
                        maxLength={isMasked(form.bankIfsc) ? undefined : 11}
                        className="h-8 text-xs"
                      />
                      <MaskedHint value={form.bankIfsc} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="salesref-bank-name" className="text-xs font-medium">Bank Name</Label>
                      <Input
                        id="salesref-bank-name"
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        placeholder="e.g. State Bank of India"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="salesref-branch" className="text-xs font-medium">Branch Name</Label>
                      <Input
                        id="salesref-branch"
                        value={form.bankBranch}
                        onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                        placeholder="e.g. Nayapalli, Bhubaneswar"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                    Direct NEFT/RTGS commission payout account details for settlement vouchers.
                  </p>
                </div>
              </div>

              {/* Bottom Card 1: Financial Ledger & Opening Commission Balance */}
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
                  <span>💳</span> Financial Ledger & Opening Commission Balance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="salesref-opening-balance">Opening Balance (₹)</Label>
                    <Input
                      id="salesref-opening-balance"
                      type="number"
                      step="0.01"
                      value={form.openingBalance}
                      onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                      placeholder="e.g. 15000 (Pre-existing commission balance)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Opening Balance Type</Label>
                    <div className="flex items-center gap-4 pt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          name="salesRefBalanceType"
                          value="TO_PAY"
                          checked={form.balanceType === 'TO_PAY'}
                          onChange={(e) => setForm({ ...form, balanceType: e.target.value })}
                          className="text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>To Pay (Credit) [Commission Liability]</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          name="salesRefBalanceType"
                          value="TO_RECEIVE"
                          checked={form.balanceType === 'TO_RECEIVE'}
                          onChange={(e) => setForm({ ...form, balanceType: e.target.value })}
                          className="text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>To Receive (Debit) [Advance Paid]</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="salesref-as-of-date">As Of Date</Label>
                    <Input
                      id="salesref-as-of-date"
                      type="date"
                      value={form.asOfDate}
                      onChange={(e) => setForm({ ...form, asOfDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Card 2: Address & Location Details for Broker */}
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
                  <span>📍</span> Office / Residence Address Details
                </h4>

                <div className="space-y-1.5">
                  <Label htmlFor="salesref-address">Street / Office Address</Label>
                  <textarea
                    id="salesref-address"
                    rows={1}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Office suite, building, commercial complex, street address"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="salesref-pincode">Pincode</Label>
                    <Input
                      id="salesref-pincode"
                      value={form.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="6-digit PIN"
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="salesref-city">City</Label>
                    <Input
                      id="salesref-city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="salesref-state">State</Label>
                    <Input
                      id="salesref-state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="salesref-country">Country</Label>
                    <Input
                      id="salesref-country"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      placeholder="India"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMMERCIAL FIELDS (CUSTOMER, VENDOR & CONTRACTOR) */}
          {isCommercial && (
            <div className="space-y-5 pt-3 border-t border-border/70">
              {/* SUB-BLOCK 1: FINANCIAL & PAYMENT TERMS */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>💳</span> Financial & Payment Terms
                </h4>

                {/* Row 1: Opening Balance, Opening Balance Type, As Of Date, Payment Terms in 4 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="comm-opening-balance">Opening Balance</Label>
                    <Input
                      id="comm-opening-balance"
                      type="number"
                      step="0.01"
                      value={form.openingBalance}
                      onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                      placeholder="Enter Opening Balance"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Opening Balance Type</Label>
                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          name="balanceType"
                          value="TO_PAY"
                          checked={form.balanceType === 'TO_PAY'}
                          onChange={(e) => setForm({ ...form, balanceType: e.target.value })}
                          className="text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>To Pay (Credit)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                        <input
                          type="radio"
                          name="balanceType"
                          value="TO_RECEIVE"
                          checked={form.balanceType === 'TO_RECEIVE'}
                          onChange={(e) => setForm({ ...form, balanceType: e.target.value })}
                          className="text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>To Receive (Debit)</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="comm-as-of-date">As Of Date</Label>
                    <Input
                      id="comm-as-of-date"
                      type="date"
                      value={form.asOfDate}
                      onChange={(e) => setForm({ ...form, asOfDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="comm-payment-terms">Payment Terms (Presets)</Label>
                    <select
                      id="comm-payment-terms"
                      value={form.paymentTerms}
                      onChange={(e) => handlePaymentTermsChange(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                    >
                      <option value="Immediate">Immediate / Net 0</option>
                      <option value="Net 15 Days">Net 15 Days</option>
                      <option value="Net 30 Days">Net 30 Days</option>
                      <option value="Net 45 Days">Net 45 Days</option>
                      <option value="Net 60 Days">Net 60 Days</option>
                      <option value="Due on Delivery">Due on Delivery</option>
                      <option value="100% Advance">100% Advance</option>
                      {form.paymentTerms.startsWith('Net') && !['Net 15 Days', 'Net 30 Days', 'Net 45 Days', 'Net 60 Days'].includes(form.paymentTerms) && (
                        <option value={form.paymentTerms}>{form.paymentTerms}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Row 2: Credit Terms & Contractor-specific Retention Rate in 4 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="comm-credit-period">Credit Period (Days)</Label>
                      <span className="text-[11px] text-muted-foreground">Auto-syncs</span>
                    </div>
                    <Input
                      id="comm-credit-period"
                      type="number"
                      min="0"
                      value={form.creditPeriodDays}
                      onChange={(e) => handleCreditDaysChange(e.target.value)}
                      placeholder="Days"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="comm-credit-limit">
                        {isVendor || isContractor ? 'Credit Limit (Payable)' : 'Credit Limit (Receivable)'}
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        {isVendor || isContractor ? 'Credit from party' : 'Credit to cust.'}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-muted-foreground text-sm font-semibold">₹</span>
                      <Input
                        id="comm-credit-limit"
                        type="number"
                        step="0.01"
                        className="pl-7"
                        value={form.creditLimitRupees}
                        onChange={(e) => setForm({ ...form, creditLimitRupees: e.target.value })}
                        placeholder="Optional limit"
                      />
                    </div>
                  </div>

                  {isContractor ? (
                    <>
                      {/* Retention Money / Security Deposit (%) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="contractor-retention">Retention Rate (%)</Label>
                          <span className="text-[11px] text-muted-foreground">Deducted on bills</span>
                        </div>
                        <div className="relative">
                          <Input
                            id="contractor-retention"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={form.retentionPercent}
                            onChange={(e) => setForm({ ...form, retentionPercent: e.target.value })}
                            placeholder="e.g. 5"
                            className="pr-7"
                          />
                          <span className="absolute right-3 top-2 text-muted-foreground text-sm font-semibold">%</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="comm-no-of-credits">Max Credit Invoices</Label>
                        <Input
                          id="comm-no-of-credits"
                          type="number"
                          value={form.noOfCredits}
                          onChange={(e) => setForm({ ...form, noOfCredits: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="comm-no-of-credits">Max Credit Invoices</Label>
                        <Input
                          id="comm-no-of-credits"
                          type="number"
                          value={form.noOfCredits}
                          onChange={(e) => setForm({ ...form, noOfCredits: e.target.value })}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="comm-relationship-since">Relationship Since</Label>
                        <Input
                          id="comm-relationship-since"
                          type="date"
                          value={form.relationshipSince}
                          onChange={(e) => setForm({ ...form, relationshipSince: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Row 3: Contractor Relationship Since OR Vendor/Customer Logistics */}
                {isContractor ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="comm-relationship-since">Relationship Since</Label>
                      <Input
                        id="comm-relationship-since"
                        type="date"
                        value={form.relationshipSince}
                        onChange={(e) => setForm({ ...form, relationshipSince: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="comm-distance">Distance (In Km)</Label>
                      <Input
                        id="comm-distance"
                        type="number"
                        step="0.1"
                        value={form.distanceKm}
                        onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                        placeholder="Distance in Km"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="comm-transportation">Preferred Transporter / Mode</Label>
                      <Input
                        id="comm-transportation"
                        value={form.transportation}
                        onChange={(e) => setForm({ ...form, transportation: e.target.value })}
                        placeholder="e.g. VRL Logistics / By Road"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SUB-BLOCK 2: DEDICATED ADDRESS DETAILS BLOCK */}
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-2">
                  <span>📍</span> Address & Location Details
                </h4>

                {/* Full-width Street Billing Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="comm-billing-address">
                    Billing Address (Street / Building / Industrial Area) <span className="text-destructive">*</span>
                  </Label>
                  <textarea
                    id="comm-billing-address"
                    rows={2}
                    value={form.billingAddress}
                    onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                    placeholder="Complete street address, plot number, industrial estate, landmark"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none"
                  />
                </div>

                {/* 4-column Location Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="comm-pincode">
                        Pincode <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Auto-resolves</span>
                    </div>
                    <Input
                      id="comm-pincode"
                      value={form.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="comm-city">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="comm-city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="City"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="comm-state">
                      State <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="comm-state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="State"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="comm-country">
                      Country <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="comm-country"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                      required
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="party-status">Status</Label>
              <select
                id="party-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </form>

        {/* LOCKED STICKY FOOTER - ALWAYS IN VIEW */}
        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="party-form" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Party'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
