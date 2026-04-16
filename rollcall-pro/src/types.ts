/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Participant {
  id: string;
  name: string;
  mobileLast4: string;
  department?: string;
}

export interface ActivitySession {
  id: string;
  name: string;
  date: string;
  isActive: boolean;
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  confirmedAt: number;
  date: string;
}
