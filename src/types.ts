/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DNSRecord {
  type: 'MX' | 'TXT';
  host: string;
  expectedValue: string;
  priority?: number;
  currentValue?: string;
  status: 'pending' | 'verified' | 'failed';
}

export interface CustomDNSRecord {
  id: string;
  type: 'A' | 'CNAME' | 'TXT';
  host: string;
  value: string;
  ttl: number;
  status: 'pending' | 'verified' | 'failed';
  currentValue?: string;
  lastCheckedAt?: string;
}

export interface Domain {
  id: string;
  ownerId: string;
  domainName: string;
  verified: boolean;
  createdAt: string;
  mxRecord: DNSRecord;
  spfRecord: DNSRecord;
  dkimRecord: DNSRecord;
  dmarcRecord: DNSRecord;
  customRecords?: CustomDNSRecord[];
  smtpBypassEnabled?: boolean;
}

export interface EmailAlias {
  id: string;
  domainId: string;
  domainName: string;
  localPart: string;
  address: string;
  forwardTo: string; // Optional external email to forward to
  createdAt: string;
  password?: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
}

export interface EmailAttachment {
  name: string;
  size: number;
  type: string;
  content: string; // Base64 data URI or inline text
}

export interface EmailMessage {
  id: string;
  ownerId: string;
  aliasId: string;
  aliasAddress: string;
  fromName: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  body: string;
  createdAt: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash';
  read: boolean;
  attachments?: EmailAttachment[];
  isGmail?: boolean;
}

export interface Contact {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  notes?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  dailySentCount: number;
  lastSentDate?: string; // YYYY-MM-DD
  storageUsedBytes: number; // For the 1GB limit limit
  gmailConnected?: boolean;
  gmailEmail?: string;
  createdAt: string;
}
