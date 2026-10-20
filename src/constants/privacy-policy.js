/**
 * The application owner's privacy policy, shipped with the app so the login
 * page's "Privacy Policy" link always opens a complete document — even before
 * a notice is published from Data Protection, and even while the API is
 * asleep.
 *
 * What the owner publishes from Data Protection > Notice & contact takes
 * precedence where the two overlap: the contact, the purposes, the processors,
 * the response time and the version shown come from the published notice when
 * there is one. Everything else here is the standing policy.
 *
 * Written against the Digital Personal Data Protection Act, 2023 and the DPDP
 * Rules, 2025. Have it reviewed by counsel before relying on it; change the
 * wording here, not in the page component.
 */

export const POLICY_PRODUCT = 'INFIDEEP ERP';
export const POLICY_OPERATOR = 'INFIDEEP';
export const POLICY_EFFECTIVE_DATE = '2026-10-15';
export const POLICY_DEFAULT_RESPONSE_DAYS = 30;

/** Shown when no notice is published yet; the published notice's purposes replace these. */
export const DEFAULT_PURPOSES = [
  {
    code: 'ACCOUNT_AND_ACCESS',
    label: 'Providing your account and the service',
    description: 'Creating and running your sign-in, showing you the screens your organisation allows, and keeping the service working.',
    dataItems: ['Name', 'Work email', 'Role', 'Organisation', 'Sign-in history'],
    lawfulBasis: 'LEGITIMATE_USE',
    retention: 'While your account is active, then as stated under "How long we keep data"',
  },
  {
    code: 'EMPLOYMENT_ADMIN',
    label: 'Employment administration (for your organisation)',
    description: 'Staff records, attendance and leave that your employer keeps in the ERP to employ and pay you.',
    dataItems: ['Name', 'Employee code', 'Phone', 'Address', 'Gender', 'Dates of joining and leaving', 'Attendance', 'Leave', 'HR documents'],
    lawfulBasis: 'LEGITIMATE_USE',
    retention: 'For the employment, then as labour, tax and provident fund law requires',
  },
  {
    code: 'LABOUR_ENGAGEMENT',
    label: 'Engaging and paying labour and contractors',
    description: 'Identifying workers, recording attendance and wages, paying them, and meeting wage, ESI and EPF duties.',
    dataItems: ['Name', 'Phone', 'Address', 'Aadhaar', 'Date of birth', 'Bank account and IFSC', 'ESIC / UAN', 'Emergency contact', 'Attendance', 'Wages and advances'],
    lawfulBasis: 'LEGITIMATE_USE',
    retention: 'While engaged, then as wage, ESI and EPF law requires',
  },
  {
    code: 'ORDERS_AND_BILLING',
    label: 'Orders, delivery, billing and payments',
    description: 'Quoting, delivering, invoicing, collecting and paying, and keeping the accounts and GST records the law requires.',
    dataItems: ['Name', 'Phone', 'Email', 'Billing and delivery address', 'GSTIN', 'PAN', 'Bank details for payment'],
    lawfulBasis: 'LEGITIMATE_USE',
    retention: 'As GST and income-tax law require (at least 72 months for GST records, 8 years for books of account)',
  },
  {
    code: 'SALES_FOLLOW_UP',
    label: 'Following up an enquiry',
    description: 'Contacting you about an enquiry you made and sending a quotation.',
    dataItems: ['Name', 'Contact person', 'Phone', 'Email', 'City', 'Your requirement'],
    lawfulBasis: 'CONSENT',
    retention: 'Until the enquiry closes, then for the period in our retention schedule',
  },
  {
    code: 'SECURITY_AND_LOGS',
    label: 'Security, audit trail and fraud prevention',
    description: 'Recording who changed what, when and from where, to protect the data and investigate misuse.',
    dataItems: ['User id', 'IP address', 'Browser', 'Time of each action', 'Record changed'],
    lawfulBasis: 'LEGITIMATE_USE',
    retention: 'At least one year, as the DPDP Rules require',
  },
];

/** Shown when no notice is published yet; the published notice's processors replace these. */
export const DEFAULT_PROCESSORS = [
  { name: 'Application hosting provider', purpose: 'Runs the ERP server' },
  { name: 'Web hosting provider', purpose: 'Serves the ERP web pages' },
  { name: 'Database hosting provider', purpose: 'Stores ERP records' },
  { name: 'Email delivery provider', purpose: 'Sends sign-in, invitation and password-reset emails' },
];

/**
 * The standing sections. `id` is the anchor in the table of contents. Each
 * block is a paragraph (string) or a list ({ list: [...] }). Sections with a
 * `slot` are filled by the page with live or default data.
 */
export const POLICY_SECTIONS = [
  {
    id: 'introduction',
    title: '1. Introduction',
    blocks: [
      `${POLICY_OPERATOR} ("we", "us", "our") provides ${POLICY_PRODUCT}, a business management application that organisations use to run their operations: sales, purchasing, production, inventory, accounts, staff and labour.`,
      'This policy explains what personal data is processed through the application, why, for how long, who it is shared with, how it is protected, and the rights you have over it. It is written to meet the Digital Personal Data Protection Act, 2023 (the "Act") and the Digital Personal Data Protection Rules, 2025 (the "Rules").',
      'It applies to everyone whose personal data is in the application: people who sign in to it, and people who never do but whose details an organisation records in it, such as workers, customers, suppliers and people who make an enquiry.',
    ],
  },
  {
    id: 'roles',
    title: '2. Who is responsible for your data',
    blocks: [
      'Each organisation that uses the application decides why it holds the personal data of its own staff, workers, customers and suppliers. Under the Act it is the Data Fiduciary for that data. We provide the application and process that data on the organisation\'s behalf.',
      'We are responsible for the data we need to run the service itself, such as accounts, sign-in records and security logs. On behalf of every organisation using the application, we also publish this policy, answer requests about personal data, and report personal data breaches.',
      'Whichever applies to you, you can contact us using the details in "Contact us and grievances", and we will deal with your request or pass it to the right organisation.',
    ],
  },
  {
    id: 'data-we-collect',
    title: '3. Personal data we process',
    blocks: [
      'Depending on how you relate to an organisation using the application, the following may be processed:',
      {
        list: [
          'Account data: name, work email, employee code, role, organisation, department and office, profile picture.',
          'Employment data: phone, address, gender, dates of joining and leaving, attendance, leave requests and HR documents your employer uploads.',
          'Labour and contractor data: name, phone, address, Aadhaar, date of birth, bank account and IFSC, ESIC and UAN numbers, emergency contact, attendance, wages and advances.',
          'Customer and supplier data: name, contact person, phone, email, billing and delivery addresses, GSTIN, PAN and bank details for payments.',
          'Enquiry data: name, contact person, phone, email, city and what you asked for.',
          'Transport data: driver name, phone and licence number recorded against deliveries.',
          'Technical data: IP address, browser, sign-in times, and a record of the changes made in the application.',
        ],
      },
      'We do not use the application to collect biometric data, health records or financial information beyond what is needed to pay or be paid.',
    ],
  },
  {
    id: 'sources',
    title: '4. Where the data comes from',
    blocks: [
      {
        list: [
          'From you, when you sign in, complete your profile, make a request or give consent.',
          'From the organisation you work for or deal with, which records your details in the course of its business.',
          'Automatically, from the device you use to sign in (IP address, browser, time of access).',
        ],
      },
    ],
  },
  {
    id: 'purposes',
    title: '5. Why we process it, and on what basis',
    slot: 'purposes',
    blocks: [
      'Personal data is processed only for the purposes below. Each one either rests on your consent, or on a legitimate use the Act allows without consent (section 7). Examples of legitimate uses are data you provided for a specific purpose, employment purposes, and compliance with law.',
    ],
  },
  {
    id: 'consent',
    title: '6. Consent and withdrawing it',
    blocks: [
      'Where a purpose relies on your consent, we ask for it clearly and for that purpose alone. Consent is never a condition of anything it is not needed for. For example, declining marketing never affects what you can buy.',
      'You can withdraw consent at any time, as easily as you gave it: in the application under My Profile > My privacy, or by making a request below. Once you withdraw, processing for that purpose stops. Data that no other purpose or law requires is then erased. Withdrawal does not affect processing done before it.',
    ],
  },
  {
    id: 'sharing',
    title: '7. Who the data is shared with',
    slot: 'processors',
    blocks: [
      'We do not sell personal data. We share it only:',
      {
        list: [
          'with the organisation the data belongs to, and with its users as that organisation\'s permissions allow;',
          'with service providers who process it for us under contract and only on our instructions (listed below);',
          'with government authorities, courts or regulators where the law requires, for example GST, ESI and EPF filings or a lawful order.',
        ],
      },
    ],
  },
  {
    id: 'transfers',
    title: '8. Where the data is stored',
    slot: 'location',
    blocks: [
      'Personal data may be processed outside India only where the Act allows it and never to a country the Central Government has restricted (section 16).',
    ],
  },
  {
    id: 'retention',
    title: '9. How long we keep data',
    blocks: [
      'We keep personal data only as long as its purpose needs, or as long as a law requires, and then erase it. In particular:',
      {
        list: [
          'Invoices, accounts and GST records are kept as GST and income-tax law require (at least 72 months for GST records and 8 years for books of account).',
          'Wage, attendance and statutory registers are kept as labour, ESI and EPF law require.',
          'Records of who did what in the application (the audit trail) are kept for at least one year, as the Rules require.',
          'Enquiries that do not become business, and the details of people who no longer work with an organisation, are erased on a schedule once their purpose has ended.',
        ],
      },
      'When we erase a record that the law still requires in part, we keep only what is required (for example, the name on an invoice) and remove the rest: contact details, identity numbers, bank details, documents and addresses. Backups expire on their own cycle.',
    ],
  },
  {
    id: 'security',
    title: '10. How we protect it',
    blocks: [
      'We take reasonable security safeguards to prevent personal data breaches, as section 8(5) of the Act and Rule 6 require. These include:',
      {
        list: [
          'access limited by role, so people see only what their work needs;',
          'Aadhaar, PAN, bank and similar identifiers hidden from anyone not specifically authorised to see them;',
          'a log of every change, with who made it, when and from where, kept for at least a year and reviewed;',
          'protection of passwords and sign-in sessions, with limits on repeated failed sign-ins;',
          'contracts with our service providers requiring them to protect the data;',
          'backups so that the service can continue after an incident.',
        ],
      },
      'No system is perfectly secure. If something goes wrong, we act as described under "Personal data breaches".',
    ],
  },
  {
    id: 'rights',
    title: '11. Your rights',
    blocks: [
      'Under the Act you have the right to:',
      {
        list: [
          'Information (section 11): a summary of the personal data held about you, what it is used for, and who it has been shared with.',
          'Correction and erasure (section 12): to correct inaccurate data, complete or update it, and have data erased once it is no longer needed, except what the law requires us to keep.',
          'Grievance redressal (section 13): to have a complaint about how your data was handled answered.',
          'Nomination (section 14): to name someone to exercise these rights for you if you die or become unable to act.',
          'Withdraw consent (section 6): at any time, for any purpose that relies on it.',
        ],
      },
      'Staff can do all of this in the application under My Profile > My privacy, including downloading their own data. Anyone else can use the form at the end of this page. We check who is asking before disclosing or erasing anything, and we reply within the time stated under "Contact us and grievances".',
    ],
  },
  {
    id: 'children',
    title: '12. Children',
    blocks: [
      'A child under the Act is anyone under 18. We do not knowingly process a child\'s personal data without verifiable consent from a parent or lawful guardian. We do not track children, monitor their behaviour, or direct advertising at them.',
      'If you believe a child\'s data is held without such consent, tell us and we will act on it.',
    ],
  },
  {
    id: 'cookies',
    title: '13. Cookies and browser storage',
    blocks: [
      'The application uses only what it needs to work:',
      {
        list: [
          'sign-in cookies and browser storage that keep you signed in and protect your session;',
          'preferences you choose, such as theme or a remembered email address on the sign-in page.',
        ],
      },
      'We do not use advertising or tracking cookies. The application loads fonts and some images from third-party content services, which receive your IP address when they are fetched.',
    ],
  },
  {
    id: 'breaches',
    title: '14. Personal data breaches',
    blocks: [
      'If a personal data breach occurs, we will:',
      {
        list: [
          'inform the Data Protection Board of India without delay, and send it a detailed report within 72 hours of becoming aware;',
          'inform each person affected, without delay, of what happened, its likely consequences, what we are doing about it, what you can do to protect yourself, and whom to contact;',
          'take steps to contain it and prevent it happening again.',
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: '15. Contact us and grievances',
    slot: 'contact',
    blocks: [
      'Questions about this policy or about your personal data, requests to exercise your rights, and complaints go to the person named below. You can also use the request form at the end of this page.',
    ],
  },
  {
    id: 'board',
    title: '16. Complaining to the Data Protection Board',
    blocks: [
      'If you are not satisfied with our answer to a grievance, you may complain to the Data Protection Board of India under the Act. We ask that you raise it with us first, so we have the chance to put it right.',
    ],
  },
  {
    id: 'your-duties',
    title: '17. Your responsibilities',
    blocks: [
      'The Act asks you, in turn, not to impersonate anyone when making a request, not to suppress material information, and not to file false or frivolous complaints (section 15). When you provide someone else\'s details, for example a nominee\'s, make sure you are entitled to.',
    ],
  },
  {
    id: 'changes',
    title: '18. Changes to this policy',
    blocks: [
      'When we change this policy we publish a new version with a new date. Signed-in users are asked to read each new version the next time they use the application. Earlier versions remain on record.',
    ],
  },
];
